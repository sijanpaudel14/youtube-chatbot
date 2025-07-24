// Test script to verify API connection
const BACKEND_URL = 'https://youtube-chatbot-gr17.onrender.com'

async function testBackendConnection() {
  try {
    console.log('Testing backend connection...')

    // Test basic endpoint
    const response = await fetch(`${BACKEND_URL}/`)
    const data = await response.json()
    console.log('✅ Backend is accessible:', data)

    // Test CORS by making a request from the browser
    const corsTest = await fetch(`${BACKEND_URL}/api/dashboard`)
    console.log('✅ CORS is configured correctly, status:', corsTest.status)

    if (!corsTest.ok) {
      const errorText = await corsTest.text()
      console.log('Response:', errorText)
    }
  } catch (error) {
    console.error('❌ Backend connection failed:', error)
  }
}

// Run the test
testBackendConnection()
