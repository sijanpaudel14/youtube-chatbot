'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Heart,
  Frown,
  Meh,
  Smile,
  Laugh,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { api, SentimentResponse } from '../lib/api'

interface SentimentAnalysisProps {
  videoId?: string
  showHeader?: boolean
  cachedData?: SentimentResponse | null
  onDataLoad?: (data: SentimentResponse) => void
}

interface SentimentStats {
  positive: number
  negative: number
  neutral: number
  overall: string
  confidence: number
}

const sentimentColors = {
  positive: 'text-green-600 bg-green-100',
  negative: 'text-red-600 bg-red-100',
  neutral: 'text-yellow-600 bg-yellow-100',
}

const sentimentIcons = {
  positive: Smile,
  negative: Frown,
  neutral: Meh,
}

export default function SentimentAnalysis({
  videoId,
  showHeader = true,
  cachedData,
  onDataLoad,
}: SentimentAnalysisProps) {
  const [sentimentData, setSentimentData] = useState<SentimentResponse | null>(
    cachedData || null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // If we have cached data, use it and don't make API call
    if (cachedData) {
      setSentimentData(cachedData)
      return
    }

    // Only fetch if we have videoId and no cached data
    if (videoId && !cachedData) {
      fetchSentimentAnalysis()
    }
  }, [videoId, cachedData])

  const fetchSentimentAnalysis = async () => {
    if (!videoId) return

    try {
      setLoading(true)
      setError('')
      const response = await api.getVideoSentiment(videoId)
      setSentimentData(response)
      // Cache the data for future use
      if (onDataLoad) {
        onDataLoad(response)
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch sentiment analysis'
      )
    } finally {
      setLoading(false)
    }
  }

  const exportSentimentData = () => {
    if (!sentimentData) return

    const csvContent = [
      'Metric,Value',
      `Overall Sentiment,${sentimentData.overall_sentiment}`,
      `Confidence Score,${sentimentData.confidence_score}`,
      `Positive Words,${sentimentData.word_analysis.positive_words}`,
      `Negative Words,${sentimentData.word_analysis.negative_words}`,
      `Educational Words,${sentimentData.word_analysis.educational_words}`,
      `Total Words,${sentimentData.word_analysis.total_words}`,
      '',
      'Emotional Tones',
      ...sentimentData.emotional_tone.map((tone) => `"${tone}",`),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentiment-analysis-${videoId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getSentimentIcon = (sentiment: string) => {
    const IconComponent =
      sentimentIcons[sentiment as keyof typeof sentimentIcons] || Meh
    return <IconComponent className='w-5 h-5' />
  }

  const getSentimentColor = (sentiment: string) => {
    return (
      sentimentColors[sentiment as keyof typeof sentimentColors] ||
      'text-gray-600 bg-gray-100'
    )
  }

  const getConfidenceBar = (confidence: number) => {
    const percentage = Math.round(confidence * 100)
    let color = 'bg-red-500'
    if (confidence >= 0.8) color = 'bg-green-500'
    else if (confidence >= 0.6) color = 'bg-yellow-500'

    return (
      <div className='flex items-center gap-2'>
        <div className='flex-1 bg-gray-200 rounded-full h-2'>
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className='text-sm font-medium text-gray-700'>{percentage}%</span>
      </div>
    )
  }

  const calculateWordPercentages = () => {
    const totalWords = sentimentData?.word_analysis.total_words || 1
    return {
      positive: (sentimentData?.word_analysis.positive_words || 0) / totalWords,
      negative: (sentimentData?.word_analysis.negative_words || 0) / totalWords,
      educational:
        (sentimentData?.word_analysis.educational_words || 0) / totalWords,
    }
  }

  if (!videoId) {
    return (
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-center text-gray-500'>
          <Heart className='w-12 h-12 mx-auto mb-4 text-gray-400' />
          <p className='text-lg font-medium mb-2'>No Video Selected</p>
          <p className='text-sm'>
            Select a video to view its sentiment analysis
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white rounded-lg border border-gray-200 overflow-hidden'>
      {/* Header */}
      {showHeader && (
        <div className='px-6 py-4 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-200'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-pink-100 rounded-lg'>
                <Heart className='w-6 h-6 text-pink-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Sentiment Analysis
                </h3>
                <p className='text-sm text-gray-600'>
                  AI-powered emotional tone analysis
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <button
                onClick={fetchSentimentAnalysis}
                disabled={loading}
                className='flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50'
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>

              {sentimentData && (
                <button
                  onClick={exportSentimentData}
                  className='flex items-center gap-2 px-3 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm'
                >
                  <Download className='w-4 h-4' />
                  Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className='px-6 py-12 text-center'>
          <Loader2 className='w-8 h-8 animate-spin mx-auto mb-4 text-pink-600' />
          <p className='text-gray-600'>Analyzing video sentiment...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className='px-6 py-4 bg-red-50 border-b border-red-200'>
          <div className='flex items-center gap-2 text-red-600'>
            <AlertCircle className='w-5 h-5' />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Sentiment Results */}
      {sentimentData && !loading && (
        <div className='p-6 space-y-6'>
          {/* Overall Sentiment */}
          <div className='text-center'>
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-semibold ${getSentimentColor(
                sentimentData.overall_sentiment
              )}`}
            >
              {getSentimentIcon(sentimentData.overall_sentiment)}
              {sentimentData.overall_sentiment.charAt(0).toUpperCase() +
                sentimentData.overall_sentiment.slice(1)}{' '}
              Sentiment
            </div>

            <div className='mt-4'>
              <p className='text-sm text-gray-600 mb-2'>Confidence Level</p>
              {getConfidenceBar(sentimentData.confidence_score)}
            </div>
          </div>

          {/* Word Analysis Breakdown */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>
                  <Smile className='w-5 h-5 text-green-600' />
                  <span className='font-medium text-green-800'>
                    Positive Words
                  </span>
                </div>
                <TrendingUp className='w-4 h-4 text-green-600' />
              </div>
              <div className='text-2xl font-bold text-green-600 mb-1'>
                {sentimentData.word_analysis.positive_words}
              </div>
              <div className='text-sm text-gray-600'>
                {Math.round(calculateWordPercentages().positive * 100)}% of
                content
              </div>
              <div className='bg-green-200 rounded-full h-2 mt-2'>
                <div
                  className='bg-green-600 h-full rounded-full transition-all duration-300'
                  style={{
                    width: `${calculateWordPercentages().positive * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>
                  <BarChart3 className='w-5 h-5 text-blue-600' />
                  <span className='font-medium text-blue-800'>Educational</span>
                </div>
                <TrendingUp className='w-4 h-4 text-blue-600' />
              </div>
              <div className='text-2xl font-bold text-blue-600 mb-1'>
                {sentimentData.word_analysis.educational_words}
              </div>
              <div className='text-sm text-gray-600'>
                {Math.round(calculateWordPercentages().educational * 100)}% of
                content
              </div>
              <div className='bg-blue-200 rounded-full h-2 mt-2'>
                <div
                  className='bg-blue-600 h-full rounded-full transition-all duration-300'
                  style={{
                    width: `${calculateWordPercentages().educational * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-2'>
                  <Frown className='w-5 h-5 text-red-600' />
                  <span className='font-medium text-red-800'>
                    Negative Words
                  </span>
                </div>
                <TrendingDown className='w-4 h-4 text-red-600' />
              </div>
              <div className='text-2xl font-bold text-red-600 mb-1'>
                {sentimentData.word_analysis.negative_words}
              </div>
              <div className='text-sm text-gray-600'>
                {Math.round(calculateWordPercentages().negative * 100)}% of
                content
              </div>
              <div className='bg-red-200 rounded-full h-2 mt-2'>
                <div
                  className='bg-red-600 h-full rounded-full transition-all duration-300'
                  style={{
                    width: `${calculateWordPercentages().negative * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Emotional Tones */}
          {sentimentData.emotional_tone &&
            sentimentData.emotional_tone.length > 0 && (
              <div>
                <h4 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
                  <Heart className='w-5 h-5' />
                  Emotional Tones Detected
                </h4>

                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
                  {sentimentData.emotional_tone.map((tone, index) => (
                    <div
                      key={index}
                      className='bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 text-center'
                    >
                      <span className='text-gray-700 font-medium capitalize'>
                        {tone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Word Analysis Summary */}
          <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
            <h4 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
              <BarChart3 className='w-5 h-5' />
              Word Analysis Summary
            </h4>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-center'>
              <div>
                <div className='text-2xl font-bold text-gray-900'>
                  {sentimentData.word_analysis.total_words}
                </div>
                <div className='text-sm text-gray-600'>Total Words</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-green-600'>
                  {sentimentData.word_analysis.positive_words}
                </div>
                <div className='text-sm text-gray-600'>Positive</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-red-600'>
                  {sentimentData.word_analysis.negative_words}
                </div>
                <div className='text-sm text-gray-600'>Negative</div>
              </div>
              <div>
                <div className='text-2xl font-bold text-blue-600'>
                  {sentimentData.word_analysis.educational_words}
                </div>
                <div className='text-sm text-gray-600'>Educational</div>
              </div>
            </div>
          </div>

          {/* Analysis Insights */}
          <div className='bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4'>
            <h4 className='font-semibold text-gray-900 mb-2'>
              Analysis Insights
            </h4>
            <div className='space-y-2 text-sm text-gray-700'>
              <p>
                • The video content shows a{' '}
                <strong>{sentimentData.overall_sentiment}</strong> emotional
                tone with {Math.round(sentimentData.confidence_score * 100)}%
                confidence.
              </p>
              <p>
                • Contains{' '}
                <strong>{sentimentData.word_analysis.positive_words}</strong>{' '}
                positive words and
                <strong>
                  {' '}
                  {sentimentData.word_analysis.negative_words}
                </strong>{' '}
                negative words out of
                <strong> {sentimentData.word_analysis.total_words}</strong>{' '}
                total words.
              </p>
              <p>
                • Educational content makes up{' '}
                <strong>
                  {Math.round(calculateWordPercentages().educational * 100)}%
                </strong>
                of the vocabulary (
                {sentimentData.word_analysis.educational_words} words).
              </p>
              <p>
                • Detected {sentimentData.emotional_tone.length} distinct
                emotional tones:
                <strong> {sentimentData.emotional_tone.join(', ')}</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!sentimentData && !loading && !error && (
        <div className='px-6 py-12 text-center text-gray-500'>
          <Heart className='w-12 h-12 mx-auto mb-4 text-gray-400' />
          <p className='text-lg font-medium mb-2'>
            Ready for Sentiment Analysis
          </p>
          <p className='text-sm'>
            Click "Refresh" to analyze the emotional tone of this video
          </p>
        </div>
      )}
    </div>
  )
}
