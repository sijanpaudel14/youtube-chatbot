import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    console.log('Frontend API received transcript request:', requestData)

    const { videoUrl } = requestData

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Video URL is required' },
        { status: 400 }
      )
    }

    // Call your Python backend to get available transcripts
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

    const backendPayload = {
      video_url: videoUrl,
    }

    console.log('Sending transcript request to backend:', backendPayload)

    const backendResponse = await fetch(`${backendUrl}/api/transcripts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { error: 'Failed to get transcripts from backend' },
        { status: 500 }
      )
    }

    const backendData = await backendResponse.json()

    return NextResponse.json(backendData)
  } catch (error) {
    console.error('Transcripts API error:', error)
    return NextResponse.json(
      { error: 'Failed to get available transcripts' },
      { status: 500 }
    )
  }
}
