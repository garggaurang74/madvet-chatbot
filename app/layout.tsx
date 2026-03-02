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
        {/* Preconnect for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load fonts once at layout level — not per-component */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
