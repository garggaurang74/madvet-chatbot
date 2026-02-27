import type { Metadata } from 'next'
import { Noto_Sans } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
})

export const metadata: Metadata = {
  title: 'Dr. Madvet Assistant | Madvet Animal Healthcare',
  description: 'AI-powered veterinary assistant by Madvet',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="hi" className={notoSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
