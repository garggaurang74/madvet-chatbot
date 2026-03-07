import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const authHeader     = req.headers.get('x-admin-secret')
    const expectedSecret = process.env.ADMIN_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Revalidate the products listing page and all individual product pages
    revalidatePath('/products')
    revalidatePath('/products/[id]', 'page')

    console.log('[Revalidate] /products cache cleared')
    return Response.json({ revalidated: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
