// @ts-nocheck
// TEMPORARY TEST — replace your current route.tsx with this
// to find out if the issue is fonts/JSX or infrastructure
import React from 'react'
import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(_req, { params }) {
  const { id: rawId } = await params
  const id = parseInt(rawId, 10)
  if (isNaN(id)) return new Response('Bad ID', { status: 400 })

  try {
    // Step 1: Test bare ImageResponse with no fonts
    return new ImageResponse(
      <div style={{ display: 'flex', background: '#1a3a2a', width: 480, height: 200, alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#FFD700', fontSize: 32 }}>MADVET #{id} ✓</span>
      </div>,
      { width: 480, height: 200 }
    )
  } catch (err) {
    return new Response('RENDER ERROR: ' + String(err?.message || err), { status: 500 })
  }
}
