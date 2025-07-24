import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    console.log('Frontend API received:', requestData)

    const { videoId, videoUrl, languageCode, translateToEnglish } = requestData

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Call your Python backend to process the video
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000'

    const backendPayload = {
      video_url: videoUrl || `https://www.youtube.com/watch?v=${videoId}`,
      language_code: languageCode || 'en',
      translate_to_english:
        translateToEnglish !== undefined ? translateToEnglish : true,
    }

    console.log('Sending to backend:', backendPayload)

    const backendResponse = await fetch(`${backendUrl}/api/process`, {
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
        { error: 'Failed to process video on backend' },
        { status: 500 }
      )
    }

    const backendData = await backendResponse.json()

    const response = {
      success: true,
      videoId,
      message: 'Video processed successfully',
      timestamp: new Date().toISOString(),
      data: backendData,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Process API error:', error)
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    )
  }
}
