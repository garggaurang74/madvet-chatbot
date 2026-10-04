import { Metadata } from 'next'
import { schemeGroups } from '@/lib/schemeGroups'
import SchemesClient from './SchemesClient'

export const metadata: Metadata = {
  title: 'Trade Schemes | Madvet Animal Healthcare',
  description: "This month's MADVET trade schemes for retailers and stockists — buy the quantity, get the gift.",
  openGraph: { title: "MADVET trade schemes — this month's offers", description: 'Buy the quantity, get the gift. Every offer for retailers and stockists, updated by our office.', type: 'website' },
}

// Pre-built, refreshed every minute (5 until 4 Oct: the office edits the sheet and checks the page straight away).
export const revalidate = 60

export default async function SchemesPage() {
  const { month, groups } = await schemeGroups()
  return <SchemesClient month={month} groups={groups} />
}
