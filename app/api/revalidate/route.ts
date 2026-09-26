import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdmin, unauthorized } from '@/lib/adminSession'

export async function POST(req: NextRequest) {
  try {
    if (!isAdmin(req)) return unauthorized()

    const body = await req.json().catch(() => ({}))
    const productId = body?.product_id

    // Always revalidate the products listing page
    revalidatePath('/products')

    // Revalidate the specific product detail page by its actual ID.
    // revalidatePath('/products/[id]', 'page') only clears the route template,
    // NOT individual cached pages — so we must use the real path.
    if (productId) {
      revalidatePath(`/products/${productId}`)
    }

    console.log('[Revalidate] cleared /products' + (productId ? ` and /products/${productId}` : ''))
    return Response.json({ revalidated: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
