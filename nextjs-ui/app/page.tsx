'use client'

import { useState } from 'react'
import {
  Play,
  MessageCircle,
  Loader2,
  Youtube,
  Sparkles,
  ArrowRight,
  Globe,
  Languages,
  BarChart3,
  Search,
  Heart,
  FileText,
} from 'lucide-react'
import ChatInterface from './components/ChatInterface'
import VideoDisplay from './components/VideoDisplay'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import MultiVideoSearch from './components/MultiVideoSearch'
import SentimentAnalysis from './components/SentimentAnalysis'
import SmartSummary from './components/SmartSummary'
import { api } from './lib/api'

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('')
  const [videoId, setVideoId] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [availableTranscripts, setAvailableTranscripts] = useState<any[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [showTranscriptSelector, setShowTranscriptSelector] = useState(false)
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')

  // Cache for API responses to avoid redundant calls
  const [analyticsCache, setAnalyticsCache] = useState<any>(null)
  const [sentimentCache, setSentimentCache] = useState<any>(null)
  const [summaryCache, setSummaryCache] = useState<{
    summary: any
    sentiment: any
  } | null>(null)
  const [dashboardCache, setDashboardCache] = useState<any>(null)

  const extractVideoId = (url: string): string => {
    // Simple regex for YouTube URL patterns
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    throw new Error('Invalid YouTube URL')
  }

  const fetchAvailableTranscripts = async (videoUrl: string) => {
    setIsLoadingTranscripts(true)
    try {
      const response = await api.getAvailableTranscripts({
        video_url: videoUrl,
      })
      setAvailableTranscripts(response.available_transcripts || [])
      setShowTranscriptSelector(true)

      // Auto-select English if available, otherwise select the first one
      const englishTranscript = response.available_transcripts.find(
        (t: any) => t.language_code === 'en'
      )
      if (englishTranscript) {
        setSelectedLanguage('en')
      } else if (response.available_transcripts.length > 0) {
        setSelectedLanguage(response.available_transcripts[0].language_code)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get transcripts')
      setShowTranscriptSelector(false)
    } finally {
      setIsLoadingTranscripts(false)
    }
  }

  const clearCache = () => {
    setAnalyticsCache(null)
    setSentimentCache(null)
    setSummaryCache(null)
    setDashboardCache(null)
  }

  const handleVideoUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const id = extractVideoId(videoUrl)
      setVideoId(id)
      await fetchAvailableTranscripts(videoUrl)
    } catch (err) {
      setError('Please enter a valid YouTube URL')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsProcessing(true)

    // Clear cache when processing a new video
    clearCache()

    try {
      const id = extractVideoId(videoUrl)
      setVideoId(id)

      // Call the actual API to process the video with selected language
      const response = await api.processVideo({
        video_url: videoUrl,
        language_code: selectedLanguage,
        translate_to_english: selectedLanguage !== 'en',
      })

      console.log('Video processed:', response)
      setIsReady(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Please enter a valid YouTube URL'
      )
      setVideoId('') // Reset video ID on error
    } finally {
      setIsProcessing(false)
    }
  }

  const resetApp = () => {
    setVideoUrl('')
    setVideoId('')
    setIsReady(false)
    setError('')
    setShowTranscriptSelector(false)
    setAvailableTranscripts([])
    setSelectedLanguage('en')
    // Clear all cached data when resetting
    clearCache()
  }

  if (isReady && videoId) {
    const tabs = [
      { id: 'chat', label: 'Chat', icon: MessageCircle },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'search', label: 'Multi-Search', icon: Search },
      { id: 'sentiment', label: 'Sentiment', icon: Heart },
      { id: 'summary', label: 'Summary', icon: FileText },
    ]

    return (
      <div className='min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50'>
        <div className='container mx-auto px-4 py-6'>
          <div className='flex flex-col lg:flex-row gap-6 h-screen'>
            {/* Video Display */}
            <div className='lg:w-1/3'>
              <VideoDisplay videoId={videoId} onReset={resetApp} />
            </div>

            {/* Main Content Area with Tabs */}
            <div className='lg:w-2/3 flex flex-col'>
              {/* Tab Navigation */}
              <div className='bg-white rounded-t-lg border-b border-gray-200 p-1'>
                <div className='flex space-x-1'>
                  {tabs.map((tab) => {
                    const IconComponent = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <IconComponent className='w-4 h-4' />
                        {tab.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className='flex-1 bg-white rounded-b-lg overflow-hidden'>
                {activeTab === 'chat' && <ChatInterface videoId={videoId} />}
                {activeTab === 'analytics' && (
                  <AnalyticsDashboard
                    videoId={videoId}
                    cachedData={analyticsCache}
                    onDataLoad={setAnalyticsCache}
                  />
                )}
                {activeTab === 'search' && (
                  <MultiVideoSearch onVideoSelect={() => {}} />
                )}
                {activeTab === 'sentiment' && (
                  <SentimentAnalysis
                    videoId={videoId}
                    cachedData={sentimentCache}
                    onDataLoad={setSentimentCache}
                  />
                )}
                {activeTab === 'summary' && (
                  <SmartSummary
                    videoId={videoId}
                    cachedData={summaryCache}
                    onDataLoad={setSummaryCache}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex flex-col'>
      {/* Header */}
      <header className='glass-effect border-b border-white/20'>
        <div className='container mx-auto px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-gradient-to-r from-red-500 to-red-600 rounded-xl'>
              <Youtube className='w-6 h-6 text-white' />
            </div>
            <h1 className='text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent'>
              YouTube RAG Chatbot
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='flex-1 flex items-center justify-center px-6 py-12'>
        <div className='w-full max-w-2xl'>
          {/* Hero Section */}
          <div className='text-center mb-12 animate-fade-in'>
            <div className='inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full mb-6 text-sm font-medium'>
              <Sparkles className='w-4 h-4' />
              AI-Powered Video Analysis with Multi-Language Support
            </div>

            <h2 className='text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight'>
              Transform YouTube Videos into
              <span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                {' '}
                Interactive Chats
              </span>
            </h2>

            <p className='text-xl text-gray-600 mb-8 leading-relaxed'>
              Paste any YouTube URL, choose your preferred language, and start
              having intelligent conversations with the video content. Supports
              multiple languages with automatic English translation.
            </p>
          </div>

          {/* Input Form */}
          <div className='glass-effect rounded-2xl p-8 mb-8 animate-slide-up'>
            <form
              onSubmit={
                showTranscriptSelector ? handleSubmit : handleVideoUrlSubmit
              }
              className='space-y-6'
            >
              <div>
                <label
                  htmlFor='videoUrl'
                  className='block text-sm font-semibold text-gray-700 mb-3'
                >
                  YouTube Video URL
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    id='videoUrl'
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder='https://www.youtube.com/watch?v=...'
                    className='input-field pr-12'
                    disabled={isProcessing || isLoadingTranscripts}
                  />
                  <Youtube className='absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5' />
                </div>
              </div>

              {/* Transcript Language Selector */}
              {showTranscriptSelector && availableTranscripts.length > 0 && (
                <div>
                  <label
                    htmlFor='language'
                    className='block text-sm font-semibold text-gray-700 mb-3'
                  >
                    <Languages className='inline w-4 h-4 mr-2' />
                    Choose Transcript Language ({
                      availableTranscripts.length
                    }{' '}
                    available)
                  </label>
                  <select
                    id='language'
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className='input-field'
                    disabled={isProcessing}
                  >
                    {availableTranscripts.map((transcript) => (
                      <option
                        key={transcript.language_code}
                        value={transcript.language_code}
                      >
                        {transcript.language} ({transcript.language_code})
                        {transcript.is_generated
                          ? ' - Auto-generated'
                          : ' - Manual'}
                        {transcript.language_code !== 'en'
                          ? ' → Will translate to English'
                          : ''}
                      </option>
                    ))}
                  </select>
                  <p className='text-sm text-gray-500 mt-2'>
                    {selectedLanguage !== 'en'
                      ? `Selected transcript will be automatically translated to English for better AI understanding.`
                      : 'Using English transcript - no translation needed.'}
                  </p>
                </div>
              )}

              {error && (
                <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm'>
                  {error}
                </div>
              )}

              <button
                type='submit'
                disabled={
                  !videoUrl.trim() || isProcessing || isLoadingTranscripts
                }
                className='btn-primary w-full flex items-center justify-center gap-3'
              >
                {isLoadingTranscripts ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Loading Transcripts...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className='w-5 h-5 animate-spin' />
                    Processing Video...
                  </>
                ) : showTranscriptSelector ? (
                  <>
                    <Play className='w-5 h-5' />
                    Start Chatting
                    <ArrowRight className='w-5 h-5' />
                  </>
                ) : (
                  <>
                    <Globe className='w-5 h-5' />
                    Check Available Languages
                    <ArrowRight className='w-5 h-5' />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Features */}
          <div className='grid md:grid-cols-3 gap-6 animate-fade-in'>
            <div className='text-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30'>
              <div className='w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4'>
                <MessageCircle className='w-6 h-6 text-blue-600' />
              </div>
              <h3 className='font-semibold text-gray-900 mb-2'>Smart Q&A</h3>
              <p className='text-sm text-gray-600'>
                Ask any question about the video content and get intelligent
                answers
              </p>
            </div>

            <div className='text-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30'>
              <div className='w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4'>
                <Languages className='w-6 h-6 text-green-600' />
              </div>
              <h3 className='font-semibold text-gray-900 mb-2'>
                Multi-Language
              </h3>
              <p className='text-sm text-gray-600'>
                Choose from available transcripts and get automatic English
                translation
              </p>
            </div>

            <div className='text-center p-6 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30'>
              <div className='w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4'>
                <Play className='w-6 h-6 text-purple-600' />
              </div>
              <h3 className='font-semibold text-gray-900 mb-2'>Any Video</h3>
              <p className='text-sm text-gray-600'>
                Works with any YouTube video that has captions available
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className='border-t border-gray-200 py-6'>
        <div className='container mx-auto px-6 text-center text-gray-600'>
          <p>
            Developed by Sijan Paudel • Built with Next.js & Python •
            Multi-Language Support
          </p>
        </div>
      </footer>
    </div>
  )
}
