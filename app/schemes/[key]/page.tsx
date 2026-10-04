import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { schemeGroups, titleCase } from '@/lib/schemeGroups'
import SchemesClient from '../SchemesClient'

// One scheme's own address, so a shared link opens on that product's card and
// unfolds on WhatsApp into its own picture (/api/scheme-card/<key>?shape=og).
export const revalidate = 60

export async function generateStaticParams() {
  return (await schemeGroups()).groups.map(g => ({ key: g.key }))
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params
  const { month, groups } = await schemeGroups()
  const g = groups.find(x => x.key === key)
  if (!g) return { title: 'Trade schemes | Madvet Animal Healthcare' }
  const m = month ? titleCase(month) : 'This month'
  const offer = g.offers.map(o => `Buy ${o.qty} → FREE ${titleCase(o.free)}`).join(' · ')
  const title = `${g.name} — ${m} scheme | Madvet`
  const image = { url: `/api/scheme-card/${key}?shape=og`, width: 1200, height: 630, alt: `${g.name} scheme` }
  return {
    title, description: offer,
    openGraph: { title: `${g.name} — ${m} scheme`, description: offer, type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', title: `${g.name} — ${m} scheme`, description: offer, images: [image.url] },
  }
}

export default async function SchemePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const { month, groups } = await schemeGroups()
  // A scheme that has ended: an old shared link lands on this month's schemes.
  if (!groups.some(g => g.key === key)) redirect('/schemes')
  return <SchemesClient month={month} groups={groups} focus={key} />
}
