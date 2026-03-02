import type { Metadata } from 'next'
import { DM_Serif_Display, DM_Sans } from 'next/font/google'
import './globals.css'

// next/font self-hosts these at build time — no external network request,
// no render-blocking stylesheet, font-display:swap is automatic.
const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-dm-serif',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Madvet Animal Healthcare',
  description: 'AI-powered veterinary product assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Applying both variables to <html> injects @font-face rules globally,
  // so inline styles like font-family:"'DM Serif Display', serif" resolve correctly.
  return (
    <html lang="en" className={`${dmSerif.variable} ${dmSans.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://pzijwpqaadhdfcjjtobf.supabase.co" />
      </head>
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}
