'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  ChevronDown,
  ExternalLink,
  Clock,
  TrendingUp,
  Target,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  api,
  MultiVideoSearchRequest,
  MultiVideoSearchResponse,
} from '../lib/api'

interface MultiVideoSearchProps {
  availableVideos?: string[]
  onVideoSelect?: (videoId: string) => void
}

export default function MultiVideoSearch({
  availableVideos = [],
  onVideoSelect,
}: MultiVideoSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [searchResults, setSearchResults] =
    useState<MultiVideoSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [videosList, setVideosList] = useState<string[]>([])

  useEffect(() => {
    fetchAvailableVideos()
  }, [])

  const fetchAvailableVideos = async () => {
    try {
      const response = await api.listProcessedVideos()
      setVideosList(response.processed_videos)
    } catch (err) {
      console.error('Failed to fetch videos:', err)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      setError('')

      const searchRequest: MultiVideoSearchRequest = {
        query: searchQuery.trim(),
        video_ids: selectedVideos.length > 0 ? selectedVideos : undefined,
      }

      const results = await api.searchAcrossVideos(searchRequest)
      setSearchResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVideoToggle = (videoId: string) => {
    setSelectedVideos((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    )
  }

  const handleSelectAll = () => {
    setSelectedVideos(
      selectedVideos.length === videosList.length ? [] : [...videosList]
    )
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <div className='bg-white rounded-lg border border-gray-200 h-full overflow-y-auto'>
      {/* Header */}
      <div className='px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-purple-100 rounded-lg'>
              <Search className='w-6 h-6 text-purple-600' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>
                Multi-Video Search
              </h3>
              <p className='text-sm text-gray-600'>
                Search across all processed videos simultaneously
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className='flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm'
          >
            <Filter className='w-4 h-4' />
            Filters
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showFilters ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search Interface */}
      <div className='p-6 border-b border-gray-200'>
        {/* Search Input */}
        <div className='flex gap-3 mb-4'>
          <div className='flex-1'>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search across all videos... (e.g., "machine learning concepts", "deployment strategies")'
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || loading}
            className='px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              <Search className='w-5 h-5' />
            )}
          </button>
        </div>

        {/* Video Filters */}
        {showFilters && (
          <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='font-medium text-gray-900'>Filter by Videos</h4>
              <button
                onClick={handleSelectAll}
                className='text-sm text-purple-600 hover:text-purple-700'
              >
                {selectedVideos.length === videosList.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto'>
              {videosList.map((videoId) => (
                <label
                  key={videoId}
                  className='flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer'
                >
                  <input
                    type='checkbox'
                    checked={selectedVideos.includes(videoId)}
                    onChange={() => handleVideoToggle(videoId)}
                    className='rounded border-gray-300 text-purple-600 focus:ring-purple-500'
                  />
                  <span className='text-sm text-gray-700 truncate'>
                    {videoId}
                  </span>
                </label>
              ))}
            </div>

            <div className='mt-3 text-xs text-gray-500'>
              {selectedVideos.length > 0
                ? `Searching in ${selectedVideos.length} selected video${
                    selectedVideos.length > 1 ? 's' : ''
                  }`
                : `Will search in all ${videosList.length} processed videos`}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className='px-6 py-4 bg-red-50 border-b border-red-200'>
          <div className='flex items-center gap-2 text-red-600'>
            <AlertCircle className='w-5 h-5' />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults && (
        <div className='divide-y divide-gray-200'>
          {/* Results Header */}
          <div className='px-6 py-4 bg-gray-50'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <CheckCircle2 className='w-5 h-5 text-green-600' />
                <span className='font-medium text-gray-900'>
                  Found {searchResults.results.length} result
                  {searchResults.results.length !== 1 ? 's' : ''}
                </span>
                <span className='text-sm text-gray-500'>
                  from {searchResults.total_videos_searched} video
                  {searchResults.total_videos_searched !== 1 ? 's' : ''}
                </span>
              </div>

              <div className='text-sm text-gray-500'>
                Query: "{searchQuery}"
              </div>
            </div>
          </div>

          {/* Results List */}
          {searchResults.results.length > 0 ? (
            searchResults.results.map((result, index) => (
              <div
                key={`${result.video_id}-${index}`}
                className='px-6 py-4 hover:bg-gray-50 transition-colors'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1'>
                    {/* Video ID and Confidence */}
                    <div className='flex items-center gap-3 mb-2'>
                      <h4 className='font-medium text-gray-900'>
                        Video: {result.video_id}
                      </h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(
                          result.confidence
                        )}`}
                      >
                        {getConfidenceLabel(result.confidence)} (
                        {Math.round(result.confidence * 100)}%)
                      </span>
                      {result.relevant && (
                        <span className='px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full'>
                          Relevant
                        </span>
                      )}
                    </div>

                    {/* Answer Preview */}
                    <div className='bg-white border border-gray-200 rounded-lg p-4'>
                      <p className='text-gray-700 leading-relaxed'>
                        {result.answer.length > 300
                          ? `${result.answer.substring(0, 300)}...`
                          : result.answer}
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  {onVideoSelect && (
                    <button
                      onClick={() => onVideoSelect(result.video_id)}
                      className='flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm whitespace-nowrap'
                    >
                      <ExternalLink className='w-4 h-4' />
                      Open Video
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className='px-6 py-12 text-center text-gray-500'>
              <Search className='w-12 h-12 mx-auto mb-4 text-gray-400' />
              <p className='text-lg font-medium mb-2'>No results found</p>
              <p className='text-sm'>
                Try adjusting your search query or check if the videos are
                properly processed
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!searchResults && !loading && !error && (
        <div className='px-6 py-12 text-center text-gray-500'>
          <Search className='w-12 h-12 mx-auto mb-4 text-gray-400' />
          <p className='text-lg font-medium mb-2'>
            Start searching across videos
          </p>
          <p className='text-sm mb-4'>
            Enter a search query to find information across all processed videos
          </p>
          <div className='text-xs text-gray-400'>
            Examples: "What is machine learning?", "How to deploy
            applications?", "Python best practices"
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {videosList.length > 0 && (
        <div className='px-6 py-3 bg-gray-50 border-t border-gray-200'>
          <div className='flex items-center justify-between text-sm text-gray-600'>
            <span>{videosList.length} videos available for search</span>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-1'>
                <Target className='w-4 h-4' />
                <span>Multi-video search ready</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
