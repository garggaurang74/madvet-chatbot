import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Madvet Animal Healthcare',
  description: 'AI-powered veterinary product assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for critical resources */}
        <link rel="dns-prefetch" href="https://pzijwpqaadhdfcjjtobf.supabase.co" />
        <link rel="preconnect" href="https://pzijwpqaadhdfcjjtobf.supabase.co" />
        
        {/* Fonts — preconnect first, then the stylesheet */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        
        {/* Preload critical fonts */}
        <link rel="preload" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&display=swap" as="style" />
      </head>
      <body>{children}</body>
    </html>
  )
}
