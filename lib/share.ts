// WhatsApp share for a film. A film on YouTube is shared by its YouTube link
// (every play counts toward the channel); one not yet on YouTube by its page
// on the site, which opens straight into the player. The product page rides
// along either way. (madvet.in/products/<id> would land on the product LIST:
// WordPress 301s it to /products/ before the forward, so link here directly.)
// madvet.in once CANONICAL_HOST is live (set NEXT_PUBLIC_SITE_URL with it); old ai.madvet.in links redirect.
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ai.madvet.in'

export function whatsappShareUrl(film: { name: string; youtubeId?: string; filmKey?: string; productId?: number }): string {
  const watch = film.youtubeId
    ? `https://youtu.be/${film.youtubeId}`
    : `${SITE}/videos?film=${encodeURIComponent(film.filmKey || '')}`
  const lines = [`*${film.name}* — MADVET`, `▶ वीडियो देखें: ${watch}`]
  if (film.productId) lines.push(`पूरी जानकारी: ${SITE}/products/${film.productId}`)
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}

// Caption that travels with the video file itself when the phone can share it.
export function shareCaption(film: { name: string; productId?: number; youtubeId?: string }): string {
  const lines = [`*${film.name}* — MADVET`]
  if (film.youtubeId) lines.push(`▶ YouTube: https://youtu.be/${film.youtubeId}`)
  if (film.productId) lines.push(`पूरी जानकारी: ${SITE}/products/${film.productId}`)
  lines.push(`सभी वीडियो: ${SITE}/videos`)
  return lines.join('\n')
}

// The product folder (WhatsApp edition), published by the video repo's
// `factory/small_films.mjs --folder` under a fixed name.
export const FOLDER_PDF = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/film-downloads/folder/MADVET-Product-Folder.pdf`
export const FOLDER_DOWNLOAD = `${FOLDER_PDF}?download=MADVET-Product-Folder-2026.pdf`
