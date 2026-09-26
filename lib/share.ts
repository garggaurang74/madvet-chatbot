// WhatsApp share for a product film. The message carries the YouTube link
// (every play counts toward the channel) and the product page, on the
// madvet.in domain, which forwards to this site.
export function whatsappShareUrl(name: string, youtubeId: string, productId: number): string {
  const text = [
    `*${name}* — MADVET`,
    `▶ वीडियो देखें: https://youtu.be/${youtubeId}`,
    `पूरी जानकारी: https://madvet.in/products/${productId}`,
  ].join('\n')
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
