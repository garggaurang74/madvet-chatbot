import { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getAdminSupabase, isAdmin, unauthorized } from '@/lib/adminSession'
import { LABEL_BUCKET, LABEL_INDEX, type LabelIndex } from '@/lib/labels'

// GET: the label index, uncached — which products a label is asked for, and
// which have one. POST (admin): one carton-label photo for one product.
// See lib/labels.ts.

async function readIndex(supabase: NonNullable<ReturnType<typeof getAdminSupabase>>): Promise<LabelIndex> {
  const { data } = await supabase.storage.from(LABEL_BUCKET).download(LABEL_INDEX)
  if (!data) return { requests: {}, labels: {} }
  try {
    const j = JSON.parse(await data.text())
    return { requests: j.requests || {}, labels: j.labels || {} }
  } catch {
    return { requests: {}, labels: {} }
  }
}

export async function GET() {
  const supabase = getAdminSupabase()
  if (!supabase) return Response.json({ requests: {}, labels: {} })
  return Response.json(await readIndex(supabase), { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  try {
    const { base64, mime, product_id } = await req.json()
    const id = Number(product_id)
    if (!base64 || !id) return Response.json({ error: 'base64 and product_id are required' }, { status: 400 })
    const supabase = getAdminSupabase()
    if (!supabase) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' }, { status: 500 })

    const type = String(mime || 'image/jpeg')
    const ext = type.includes('png') ? 'png' : 'jpg'
    const at = new Date().toISOString()
    const file = `labels/${id}/${at.replace(/[:.]/g, '-')}.${ext}`
    const { error: upErr } = await supabase.storage.from(LABEL_BUCKET)
      .upload(file, Buffer.from(base64, 'base64'), { contentType: type, upsert: false })
    if (upErr) return Response.json({ error: `Storage: ${upErr.message}` }, { status: 500 })
    const url = supabase.storage.from(LABEL_BUCKET).getPublicUrl(file).data?.publicUrl || ''

    // Read-modify-write of the index. Two uploads in the same second could race;
    // the photo itself is never lost (it has its own file), only its index line,
    // and the factory re-lists the folder when it reads labels.
    const index = await readIndex(supabase)
    index.labels[String(id)] = [...(index.labels[String(id)] || []), { url, at }]
    const { error: ixErr } = await supabase.storage.from(LABEL_BUCKET)
      .upload(LABEL_INDEX, Buffer.from(JSON.stringify(index, null, 1)), { contentType: 'application/json', upsert: true, cacheControl: '60' })
    if (ixErr) return Response.json({ error: `Index: ${ixErr.message}` }, { status: 500 })

    revalidateTag('labels')
    revalidatePath(`/products/${id}`)
    return Response.json({ url, count: index.labels[String(id)].length })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
