'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  Brain,
  Download,
  RefreshCw,
  Activity,
  Target,
} from 'lucide-react'
import {
  api,
  DashboardData,
  AnalyticsResponse,
  SentimentResponse,
} from '../lib/api'

interface AnalyticsDashboardProps {
  videoId?: string
  cachedData?: DashboardData | null
  onDataLoad?: (data: DashboardData) => void
}

export default function AnalyticsDashboard({
  videoId,
  cachedData,
  onDataLoad,
}: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    cachedData || null
  )
  const [loading, setLoading] = useState(!cachedData)
  const [error, setError] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<string>('')

  useEffect(() => {
    // If we have cached data, use it and don't make API call
    if (cachedData) {
      setDashboardData(cachedData)
      setLoading(false)
      return
    }

    if (videoId) {
      setSelectedVideo(videoId)
    }

    // Only fetch if we don't have cached data
    if (!cachedData) {
      fetchDashboardData()
    }
  }, [videoId, cachedData])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('🔍 Fetching dashboard data...')

      const data = await api.getDashboardData()
      console.log('✅ Dashboard data received:', data)

      setDashboardData(data)

      // Cache the data for future use
      if (onDataLoad) {
        onDataLoad(data)
      }
    } catch (err) {
      console.error('❌ Dashboard data fetch error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (videoId: string) => {
    try {
      const exportData = await api.exportVideoData(videoId)
      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-analytics-${videoId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100'
      case 'negative':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return '😊'
      case 'negative':
        return '😔'
      default:
        return '😐'
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <RefreshCw className='w-8 h-8 animate-spin text-blue-600' />
        <span className='ml-2 text-gray-600'>Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-6 bg-red-50 border border-red-200 rounded-lg'>
        <p className='text-red-600'>Error: {error}</p>
        <button
          onClick={fetchDashboardData}
          className='mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700'
        >
          Retry
        </button>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className='p-6 text-center text-gray-500'>
        <Activity className='w-12 h-12 mx-auto mb-4 text-gray-400' />
        <p>No analytics data available</p>
        <p className='text-sm'>Process some videos to see analytics</p>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>
            Analytics Dashboard
          </h2>
          <p className='text-gray-600'>
            Comprehensive insights into your video processing
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
        >
          <RefreshCw className='w-4 h-4' />
          Refresh
        </button>
      </div>

      {/* System Overview */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <div className='bg-white p-6 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600'>Total Videos</p>
              <p className='text-2xl font-bold text-gray-900'>
                {dashboardData.total_videos}
              </p>
            </div>
            <BarChart3 className='w-8 h-8 text-blue-600' />
          </div>
        </div>

        <div className='bg-white p-6 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600'>
                Total Questions
              </p>
              <p className='text-2xl font-bold text-gray-900'>
                {dashboardData.system_stats.total_questions_asked}
              </p>
            </div>
            <MessageSquare className='w-8 h-8 text-green-600' />
          </div>
        </div>

        <div className='bg-white p-6 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600'>
                Avg Processing Time
              </p>
              <p className='text-2xl font-bold text-gray-900'>
                {dashboardData.system_stats.avg_processing_time.toFixed(1)}s
              </p>
            </div>
            <Clock className='w-8 h-8 text-orange-600' />
          </div>
        </div>

        <div className='bg-white p-6 rounded-lg border border-gray-200'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-gray-600'>
                Words Processed
              </p>
              <p className='text-2xl font-bold text-gray-900'>
                {dashboardData.system_stats.total_words_processed.toLocaleString()}
              </p>
            </div>
            <Target className='w-8 h-8 text-purple-600' />
          </div>
        </div>
      </div>

      {/* Videos List */}
      <div className='bg-white rounded-lg border border-gray-200'>
        <div className='p-6 border-b border-gray-200'>
          <h3 className='text-lg font-semibold text-gray-900'>
            Processed Videos
          </h3>
          <p className='text-gray-600'>Detailed analytics for each video</p>
        </div>

        <div className='divide-y divide-gray-200'>
          {dashboardData.videos.map((video) => (
            <div key={video.video_id} className='p-6'>
              <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
                <div className='flex-1'>
                  {/* Video ID and Status */}
                  <div className='flex items-center gap-3 mb-3'>
                    <h4 className='font-medium text-gray-900'>
                      Video: {video.video_id}
                    </h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        video.status === 'ready'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {video.status}
                    </span>
                  </div>

                  {/* Analytics Grid */}
                  {video.analytics.video_stats && (
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                      <div className='flex items-center gap-2'>
                        <Clock className='w-4 h-4 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          Processing:{' '}
                          {video.analytics.video_stats.processing_time?.toFixed(
                            1
                          )}
                          s
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <MessageSquare className='w-4 h-4 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          Questions:{' '}
                          {video.analytics.interaction_stats?.total_questions ||
                            0}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <Brain className='w-4 h-4 text-gray-400' />
                        <span className='text-sm text-gray-600'>
                          Words:{' '}
                          {video.analytics.video_stats.word_count?.toLocaleString() ||
                            0}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sentiment Analysis */}
                  {video.sentiment.overall_sentiment && (
                    <div className='flex items-center gap-3 mb-3'>
                      <span className='text-sm font-medium text-gray-600'>
                        Sentiment:
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full ${getSentimentColor(
                          video.sentiment.overall_sentiment
                        )}`}
                      >
                        {getSentimentIcon(video.sentiment.overall_sentiment)}{' '}
                        {video.sentiment.overall_sentiment}
                      </span>
                      <span className='text-xs text-gray-500'>
                        (
                        {Math.round(
                          (video.sentiment.confidence_score || 0) * 100
                        )}
                        % confidence)
                      </span>
                    </div>
                  )}

                  {/* Emotional Tone Tags */}
                  {video.sentiment.emotional_tone &&
                    video.sentiment.emotional_tone.length > 0 && (
                      <div className='flex items-center gap-2 mb-3'>
                        <span className='text-sm font-medium text-gray-600'>
                          Tone:
                        </span>
                        {video.sentiment.emotional_tone.map(
                          (tone: string, index: number) => (
                            <span
                              key={index}
                              className='px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full'
                            >
                              {tone}
                            </span>
                          )
                        )}
                      </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className='flex flex-col sm:flex-row gap-2 md:flex-col md:gap-2 md:w-auto w-full sm:w-auto'>
                  <button
                    onClick={() => setSelectedVideo(video.video_id)}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors w-full sm:w-auto md:w-24 ${
                      selectedVideo === video.video_id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Select
                  </button>
                  <button
                    onClick={() => handleExport(video.video_id)}
                    className='px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 w-full sm:w-auto md:w-24'
                  >
                    <Download className='w-3 h-3' />
                    Export
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {dashboardData.videos.length === 0 && (
          <div className='p-12 text-center text-gray-500'>
            <Activity className='w-12 h-12 mx-auto mb-4 text-gray-400' />
            <p>No videos processed yet</p>
            <p className='text-sm'>
              Process some videos to see detailed analytics
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
