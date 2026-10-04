import { ImageResponse } from 'next/og'
import { cardFonts } from '@/lib/productCard'
import { schemeGroups } from '@/lib/schemeGroups'
import { MonthLink } from '@/lib/schemeCard'

// What the /schemes link unfolds into on WhatsApp: the month, the count and
// four of the packs with their offers — a picture a retailer opens.
export const revalidate = 60
export const alt = 'MADVET trade schemes this month'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const [{ month, groups }, fonts] = await Promise.all([schemeGroups(), cardFonts()])
  return new ImageResponse(<MonthLink groups={groups} month={month} />, { ...size, fonts })
}
