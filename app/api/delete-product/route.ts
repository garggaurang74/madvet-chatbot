import { NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { ADMIN_CONFIG_BUCKET, getAdminSupabase, isAdmin, unauthorized } from '@/lib/adminSession'

// Remove a discontinued product. The whole row is copied to the private
// admin-config bucket first (deleted/<id>.json), so a mistake is one tap to
// undo: PUT puts it back with the same id, and its film comes back with it.
//
//   GET                  -> the removed products that can be restored
//   POST   {product_id}  -> back up, then delete
//   PUT    {product_id}  -> restore from the backup

const DIR = 'deleted'

function done(productId?: number) {
  revalidatePath('/products')
  revalidatePath('/videos')
  if (productId) revalidatePath(`/products/${productId}`)
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const sb = getAdminSupabase()
  if (!sb) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' }, { status: 500 })
  const { data, error } = await sb.storage.from(ADMIN_CONFIG_BUCKET).list(DIR, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } })
  if (error) return Response.json({ removed: [] })
  const removed = await Promise.all((data || []).filter(f => f.name.endsWith('.json')).map(async f => {
    const { data: blob } = await sb.storage.from(ADMIN_CONFIG_BUCKET).download(`${DIR}/${f.name}`)
    try {
      const j = JSON.parse(await blob!.text())
      return { id: j.row.id as number, name: j.row.product_name as string, removed: j.removed as string }
    } catch { return null }
  }))
  return Response.json({ removed: removed.filter(Boolean) })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const { product_id } = await req.json().catch(() => ({}))
  const id = Number(product_id)
  if (!id) return Response.json({ error: 'product_id is required' }, { status: 400 })
  const sb = getAdminSupabase()
  if (!sb) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' }, { status: 500 })

  const { data: row, error: readErr } = await sb.from('products_enriched').select('*').eq('id', id).single()
  if (readErr || !row) return Response.json({ error: 'Product not found' }, { status: 404 })

  const backup = JSON.stringify({ removed: new Date().toISOString(), row })
  const { error: upErr } = await sb.storage.from(ADMIN_CONFIG_BUCKET)
    .upload(`${DIR}/${id}.json`, Buffer.from(backup), { contentType: 'application/json', upsert: true })
  // No backup, no delete.
  if (upErr) return Response.json({ error: `Backup failed, nothing deleted: ${upErr.message}` }, { status: 500 })

  const { error } = await sb.from('products_enriched').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  done(id)
  return Response.json({ success: true, name: row.product_name })
}

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return unauthorized()
  const { product_id } = await req.json().catch(() => ({}))
  const id = Number(product_id)
  const sb = getAdminSupabase()
  if (!sb) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' }, { status: 500 })

  const { data: blob, error: dlErr } = await sb.storage.from(ADMIN_CONFIG_BUCKET).download(`${DIR}/${id}.json`)
  if (dlErr || !blob) return Response.json({ error: 'No backup for that product' }, { status: 404 })
  const { row } = JSON.parse(await blob.text())

  const { error } = await sb.from('products_enriched').insert(row)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await sb.storage.from(ADMIN_CONFIG_BUCKET).remove([`${DIR}/${id}.json`])
  done(id)
  return Response.json({ success: true, name: row.product_name })
}
