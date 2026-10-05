// Carton labels — the source of truth for every product's composition, dose
// and species (client, 5 Oct: "for which product you need carton label ...
// add an extra button in admin panel so you ask for label and we supply it and
// it shows up on website as well ... also gets added to our database").
//
// Stored in Supabase Storage, beside the product photos: the images under
// product-images/labels/<productId>/<time>.jpg, and one index the site reads,
// product-images/labels/index.json:
//   { requests: { "<id>": { reason, asked } },        — written by the factory
//     labels:   { "<id>": [{ url, at }] } }            — written by /api/labels
// No table was added: creating one needs the SQL editor, and Storage already
// holds every other picture of the product.

export type LabelPhoto = { url: string; at: string }
export type LabelIndex = {
  requests: Record<string, { reason: string; asked: string }>
  labels: Record<string, LabelPhoto[]>
}

export const LABEL_BUCKET = 'product-images'
export const LABEL_INDEX = 'labels/index.json'

const empty = (): LabelIndex => ({ requests: {}, labels: {} })

/** Public read, cached for a minute and tagged so an upload clears it. */
export async function labelIndex(): Promise<LabelIndex> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return empty()
  try {
    const res = await fetch(`${base}/storage/v1/object/public/${LABEL_BUCKET}/${LABEL_INDEX}`,
      { next: { revalidate: 60, tags: ['labels'] } } as RequestInit)
    if (!res.ok) return empty()
    const j = await res.json()
    return { requests: j.requests || {}, labels: j.labels || {} }
  } catch {
    return empty()
  }
}
