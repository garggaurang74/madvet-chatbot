import { NextRequest } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getAdminSupabase, isAdmin, unauthorized } from '@/lib/adminSession'

// Uploads a product photo to the product-images bucket and, when product_id is
// given, points that product at it. Replaces the browser writing both with the
// public anon key.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  try {
    const { base64, mime, name, product_id } = await req.json()
    if (!base64 || !name) return Response.json({ error: 'base64 and name are required' }, { status: 400 })

    const supabase = getAdminSupabase()
    if (!supabase) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' }, { status: 500 })

    const type = String(mime || 'image/jpeg')
    const ext  = type.includes('png') ? 'png' : 'jpg'
    const slug = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const file = `${slug}.${ext}`

    const { error: upErr } = await supabase.storage.from('product-images')
      .upload(file, Buffer.from(base64, 'base64'), { contentType: type, upsert: true })
    if (upErr) return Response.json({ error: `Storage: ${upErr.message}` }, { status: 500 })

    const publicUrl = supabase.storage.from('product-images').getPublicUrl(file).data?.publicUrl
    // Timestamp so browsers don't serve a stale cached image after an update
    const imageUrl = `${publicUrl}?t=${Date.now()}`

    if (product_id) {
      const { error } = await supabase.from('products_enriched').update({ image_url: imageUrl }).eq('id', product_id)
      if (error) return Response.json({ error: error.message }, { status: 500 })
      revalidateTag('products')
      revalidatePath('/products')
      revalidatePath(`/products/${product_id}`)
    }
    return Response.json({ image_url: imageUrl })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
