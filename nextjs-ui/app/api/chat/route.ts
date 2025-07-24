import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { videoId, question } = await request.json()

    if (!videoId || !question) {
      return NextResponse.json(
        { error: 'Video ID and question are required' },
        { status: 400 }
      )
    }

    // Here you would make a request to your Python backend
    // For now, we'll return a mock response
    const response = {
      answer: `This is a mock response for the question: "${question}" about video ${videoId}. In production, this would call your Python RAG chatbot backend.`,
      timestamp: new Date().toISOString(),
    }

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
