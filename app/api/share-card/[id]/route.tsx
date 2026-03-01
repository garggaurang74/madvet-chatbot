// @ts-nocheck
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const maxDuration = 30

export async function GET(_req, { params }) {
  const { id } = await params
  try {
    return new ImageResponse(
      <div style={{ display: 'flex', width: 480, height: 200, background: '#FFD700', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 32, color: '#1a2f8a', fontWeight: 'bold' }}>MADVET Product {id}</span>
      </div>,
      { width: 480, height: 200 }
    )
  } catch (err) {
    return new Response('Error: ' + String(err?.message || err), { status: 500 })
  }
}
