// WhatsApp share for a film. A film on YouTube is shared by its YouTube link
// (every play counts toward the channel); one not yet on YouTube by its page
// on the site, which opens straight into the player. The product page rides
// along either way, on the madvet.in domain (it forwards to this site).
export const SITE = 'https://ai.madvet.in'

export function whatsappShareUrl(film: { name: string; youtubeId?: string; filmKey?: string; productId?: number }): string {
  const watch = film.youtubeId
    ? `https://youtu.be/${film.youtubeId}`
    : `${SITE}/videos?film=${encodeURIComponent(film.filmKey || '')}`
  const lines = [`*${film.name}* — MADVET`, `▶ वीडियो देखें: ${watch}`]
  if (film.productId) lines.push(`पूरी जानकारी: https://madvet.in/products/${film.productId}`)
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}
