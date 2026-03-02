import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imagePath = searchParams.get('path')
  
  if (!imagePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  try {
    // Construct Supabase storage URL
    const supabaseUrl = `https://pzijwpqaadhdfcjjtobf.supabase.co/storage/v1/object/public/${imagePath}`
    
    // Fetch the image from Supabase
    const response = await fetch(supabaseUrl, {
      headers: {
        'User-Agent': 'Madvet-Image-Proxy/1.0'
      }
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    // Get image data and content type
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Return image with proper CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('[Image Proxy] Error:', error)
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}
