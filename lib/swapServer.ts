// Server side of the swap: reads the office app's swap.json (see lib/swap.ts).
// Kept apart so the browser bundle never pulls in 'fs'.
import type { SwapData } from './swap'

const URL_ = () => process.env.SWAP_JSON_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/film-downloads/swap/swap.json`

export async function fetchSwap(): Promise<SwapData | null> {
  try {
    // local testing only: read a file the office app wrote, never on Vercel
    if (process.env.SWAP_JSON_FILE) {
      const { readFile } = await import('fs/promises')
      return JSON.parse(await readFile(process.env.SWAP_JSON_FILE, 'utf8'))
    }
    const res = await fetch(URL_(), { next: { revalidate: 120 } })
    if (!res.ok) return null
    const d = await res.json()
    return Array.isArray(d?.offers) && Array.isArray(d?.products) ? d : null
  } catch { return null }
}
