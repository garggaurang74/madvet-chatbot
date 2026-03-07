import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSupabaseClient } from '@/lib/supabase'

// Extract YouTube video ID from any YT URL format
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  )
  return match?.[1] ?? null
}

export async function POST(req: NextRequest) {
  try {
    const authHeader     = req.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { product_id, video_url } = await req.json()

    if (!product_id) {
      return Response.json({ error: 'product_id is required' }, { status: 400 })
    }

    // Validate YouTube URL if provided
    if (video_url && !extractYouTubeId(video_url)) {
      return Response.json({ error: 'Invalid YouTube URL. Paste a youtube.com or youtu.be link.' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { error } = await supabase
      .from('products_enriched')
      .update({ video_url: video_url || null })
      .eq('id', product_id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Bust Next.js cache so products page reflects the new video immediately
    revalidatePath('/products')
    revalidatePath('/products/[id]', 'page')

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
