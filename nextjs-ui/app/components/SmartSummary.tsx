'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Brain,
  Clock,
  TrendingUp,
  Tag,
  Download,
  RefreshCw,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  Menu,
  X,
} from 'lucide-react'
import { api, SummaryResponse, SentimentResponse } from './../lib/api'

interface SmartSummaryProps {
  videoId: string
  onClose?: () => void
  cachedData?: { summary: SummaryResponse; sentiment: SentimentResponse } | null
  onDataLoad?: (data: {
    summary: SummaryResponse
    sentiment: SentimentResponse
  }) => void
}

export default function SmartSummary({
  videoId,
  onClose,
  cachedData,
  onDataLoad,
}: SmartSummaryProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(
    cachedData?.summary || null
  )
  const [sentiment, setSentiment] = useState<SentimentResponse | null>(
    cachedData?.sentiment || null
  )
  const [loading, setLoading] = useState(!cachedData)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<
    'brief' | 'detailed' | 'takeaways' | 'technical'
  >('brief')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuTabSelected, setMenuTabSelected] = useState(false)

  useEffect(() => {
    // If we have cached data, use it and don't make API call
    if (cachedData) {
      setSummary(cachedData.summary)
      setSentiment(cachedData.sentiment)
      setLoading(false)
      return
    }

    // Only fetch if we don't have cached data
    if (videoId && !cachedData) {
      fetchSummaryData()
    }
  }, [videoId, cachedData])

  // Close menu when active tab changes (only when tab is actually selected from menu)
  useEffect(() => {
    if (menuTabSelected) {
      setIsMenuOpen(false)
      setMenuTabSelected(false)
    }
  }, [activeTab, menuTabSelected])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const menuButton = document.querySelector(
        '[data-summary-menu-toggle="true"]'
      )
      const menuDropdown = document.querySelector(
        '[data-summary-menu-dropdown="true"]'
      )

      if (
        isMenuOpen &&
        !menuButton?.contains(target) &&
        !menuDropdown?.contains(target)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      setError('')

      // Fetch both summary and sentiment in parallel
      const [summaryData, sentimentData] = await Promise.all([
        api.getVideoSummary(videoId),
        api.getVideoSentiment(videoId),
      ])

      setSummary(summaryData)
      setSentiment(sentimentData)

      // Cache the data for future use
      if (onDataLoad) {
        onDataLoad({ summary: summaryData, sentiment: sentimentData })
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch summary data'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!summary || !sentiment) return

    const exportData = {
      video_id: videoId,
      summary,
      sentiment,
      exported_at: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video-summary-${videoId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-100 border-green-200'
      case 'negative':
        return 'text-red-600 bg-red-100 border-red-200'
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200'
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

  // Function to parse markdown-style formatting and clean up numbering
  const parseMarkdownText = (text: string) => {
    // Clean up the text first
    let cleanedText = text
      // Remove standalone numbers at the beginning of lines
      .replace(/^\d+\s*$/gm, '')
      // Remove bullet points and replace with proper formatting
      .replace(/^\*\s+/gm, '• ')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    // Replace **text** with <strong>text</strong>
    const boldRegex = /\*\*(.*?)\*\*/g
    
    const parts = []
    let lastIndex = 0
    let match
    
    while ((match = boldRegex.exec(cleanedText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const textBefore = cleanedText.slice(lastIndex, match.index)
        // Split by newlines and create proper line breaks
        const lines = textBefore.split('\n')
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) parts.push(<br key={`br-${match.index}-${lineIndex}`} />)
          if (line.trim()) parts.push(line)
        })
      }
      
      // Add the bold text
      parts.push(<strong key={match.index} className="font-semibold text-gray-900">{match[1]}</strong>)
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text
    if (lastIndex < cleanedText.length) {
      const remainingText = cleanedText.slice(lastIndex)
      const lines = remainingText.split('\n')
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) parts.push(<br key={`br-end-${lineIndex}`} />)
        if (line.trim()) parts.push(line)
      })
    }
    
    return parts.length > 0 ? parts : [cleanedText]
  }

  // Function to process and split key takeaways properly
  const processKeyTakeaways = (takeaways: string[]) => {
    const processed = []
    
    for (const takeaway of takeaways) {
      // Split by lines and process each
      const lines = takeaway.split('\n')
      let currentTakeaway = ''
      
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // Skip empty lines and standalone numbers
        if (!trimmedLine || /^\d+$/.test(trimmedLine)) {
          continue
        }
        
        // If line starts with * or bullet, it's a new takeaway
        if (trimmedLine.startsWith('*') || trimmedLine.startsWith('•')) {
          // Save previous takeaway if it exists
          if (currentTakeaway) {
            processed.push(currentTakeaway.trim())
          }
          // Start new takeaway without the bullet
          currentTakeaway = trimmedLine.replace(/^[\*•]\s*/, '')
        } else {
          // Continue current takeaway
          if (currentTakeaway) {
            currentTakeaway += ' ' + trimmedLine
          } else {
            currentTakeaway = trimmedLine
          }
        }
      }
      
      // Add the last takeaway
      if (currentTakeaway) {
        processed.push(currentTakeaway.trim())
      }
    }
    
    return processed.filter(t => t.length > 0)
  }

  const tabs = [
    { id: 'brief', label: 'Brief Summary', icon: FileText },
    { id: 'detailed', label: 'Detailed', icon: BookOpen },
    { id: 'takeaways', label: 'Key Takeaways', icon: Target },
    { id: 'technical', label: 'Technical', icon: Brain },
  ] as const

  if (loading) {
    return (
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='flex flex-col items-center justify-center py-12'>
          <RefreshCw className='w-8 h-8 animate-spin text-blue-600 mb-4' />
          <span className='text-gray-600 text-lg font-medium mb-2'>
            Generating AI summary...
          </span>
          <div className='text-sm text-gray-500 text-center max-w-md'>
            <p className='mb-2'>⚡ Analyzing video content with AI</p>
            <p className='mb-2'>📊 Processing sentiment analysis</p>
            <p className='text-xs text-yellow-600'>
              ⏳ First load may take 20-30 seconds due to server startup
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='bg-white rounded-lg border border-red-200 p-6'>
        <div className='text-center py-6'>
          <p className='text-red-600 mb-4'>Error: {error}</p>
          <button
            onClick={fetchSummaryData}
            className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700'
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className='bg-white rounded-lg border border-gray-200 p-6'>
        <div className='text-center py-12 text-gray-500'>
          <Brain className='w-12 h-12 mx-auto mb-4 text-gray-400' />
          <p>No summary available</p>
        </div>
      </div>
    )
  }

  return (
    <div className='bg-white rounded-lg border border-gray-200 h-full overflow-y-auto'>
      {/* Header */}
      <div className='px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <Sparkles className='w-6 h-6 text-blue-600' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>
                AI-Generated Summary
              </h3>
              <p className='text-sm text-gray-600'>Video: {videoId}</p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={handleExport}
              className='flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm'
            >
              <Download className='w-4 h-4' />
              Export
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className='px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm'
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Sentiment Badge */}
        {sentiment && (
          <div className='mt-3 flex items-center gap-3'>
            <div
              className={`px-3 py-1 rounded-full border text-sm font-medium ${getSentimentColor(
                sentiment.overall_sentiment
              )}`}
            >
              {getSentimentIcon(sentiment.overall_sentiment)}{' '}
              {sentiment.overall_sentiment} sentiment
              <span className='ml-2 text-xs opacity-75'>
                ({Math.round(sentiment.confidence_score * 100)}% confidence)
              </span>
            </div>

            {sentiment.emotional_tone.map((tone, index) => (
              <span
                key={index}
                className='px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full'
              >
                {tone}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className='border-b border-gray-200 relative'>
        {/* Desktop Navigation */}
        <nav className='hidden md:flex space-x-8 px-6'>
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className='w-4 h-4' />
                {tab.label}
              </button>
            )
          })}
        </nav>

        {/* Mobile Navigation */}
        <div className='md:hidden px-6 py-3'>
          <div className='flex items-center justify-between'>
            {/* Current Active Tab */}
            <div className='flex items-center gap-2'>
              {(() => {
                const currentTab = tabs.find((tab) => tab.id === activeTab)
                if (currentTab) {
                  const IconComponent = currentTab.icon
                  return (
                    <>
                      <IconComponent className='w-4 h-4 text-blue-600' />
                      <span className='font-medium text-blue-600'>
                        {currentTab.label}
                      </span>
                    </>
                  )
                }
                return null
              })()}
            </div>

            {/* Hamburger Menu Button */}
            <div className='relative'>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setIsMenuOpen(!isMenuOpen)
                }}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isMenuOpen
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                data-summary-menu-toggle='true'
                type='button'
              >
                {isMenuOpen ? (
                  <X className='w-5 h-5' />
                ) : (
                  <Menu className='w-5 h-5' />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className='fixed inset-0 z-40 bg-black bg-opacity-25'
                onClick={() => setIsMenuOpen(false)}
              />

              {/* Dropdown Menu */}
              <div
                className='absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-b-lg shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200'
                data-summary-menu-dropdown='true'
              >
                {/* Menu Header */}
                <div className='px-4 py-2 bg-gray-50 border-b border-gray-100'>
                  <p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>
                    Summary Options
                  </p>
                </div>

                <div className='p-2 space-y-1'>
                  {tabs.map((tab, index) => {
                    const IconComponent = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id)
                          setMenuTabSelected(true)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-left animate-in slide-in-from-left-1 ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 shadow-sm border-l-4 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                        }`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <IconComponent className='w-4 h-4 flex-shrink-0' />
                        <span className='truncate'>{tab.label}</span>
                        {activeTab === tab.id && (
                          <div className='ml-auto w-2 h-2 bg-blue-600 rounded-full' />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className='p-6'>
        {activeTab === 'brief' && (
          <div className='space-y-4'>
            <div className='flex items-center gap-2 text-sm text-gray-600 mb-3'>
              <Clock className='w-4 h-4' />
              Generated at:{' '}
              {new Date(summary.generated_at * 1000).toLocaleString()}
            </div>
            <div className='p-4 bg-blue-50 border border-blue-200 rounded-lg'>
              <h4 className='font-semibold text-blue-900 mb-2'>
                30-Second Summary
              </h4>
              <div className='text-gray-700 leading-relaxed'>
                {parseMarkdownText(summary.brief_summary)}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detailed' && (
          <div className='space-y-4'>
            <div className='p-4 bg-gray-50 border border-gray-200 rounded-lg'>
              <h4 className='font-semibold text-gray-900 mb-3 flex items-center gap-2'>
                <BookOpen className='w-5 h-5' />
                Comprehensive Analysis
              </h4>
              <div className='prose prose-gray max-w-none'>
                <div className='text-gray-700 leading-relaxed whitespace-pre-wrap'>
                  {parseMarkdownText(summary.detailed_summary)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'takeaways' && (
          <div className='space-y-4'>
            <div className='p-4 bg-green-50 border border-green-200 rounded-lg'>
              <h4 className='font-semibold text-green-900 mb-3 flex items-center gap-2'>
                <Lightbulb className='w-5 h-5' />
                Key Takeaways
              </h4>
              <div className='space-y-2'>
                {processKeyTakeaways(summary.key_takeaways).map((takeaway, index) => (
                  <div key={index} className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold'>
                      {index + 1}
                    </div>
                    <div className='text-gray-700 leading-relaxed'>
                      {parseMarkdownText(takeaway)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'technical' && (
          <div className='space-y-4'>
            <div className='p-4 bg-purple-50 border border-purple-200 rounded-lg'>
              <h4 className='font-semibold text-purple-900 mb-3 flex items-center gap-2'>
                <Brain className='w-5 h-5' />
                Technical Concepts
              </h4>
              <div className='space-y-2'>
                {summary.technical_concepts.length > 0 ? (
                  summary.technical_concepts.map((concept, index) => (
                    <div key={index} className='flex items-start gap-3'>
                      <Tag className='w-4 h-4 text-purple-600 mt-1 flex-shrink-0' />
                      <div className='text-gray-700 leading-relaxed'>
                        {parseMarkdownText(concept)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className='text-gray-500 italic'>
                    No specific technical concepts identified
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Statistics */}
      {sentiment && (
        <div className='px-6 py-4 bg-gray-50 border-t border-gray-200'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-center'>
            <div>
              <p className='text-sm font-medium text-gray-600'>
                Positive Words
              </p>
              <p className='text-lg font-bold text-green-600'>
                {sentiment.word_analysis.positive_words}
              </p>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-600'>
                Negative Words
              </p>
              <p className='text-lg font-bold text-red-600'>
                {sentiment.word_analysis.negative_words}
              </p>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-600'>
                Educational Words
              </p>
              <p className='text-lg font-bold text-blue-600'>
                {sentiment.word_analysis.educational_words}
              </p>
            </div>
            <div>
              <p className='text-sm font-medium text-gray-600'>Total Words</p>
              <p className='text-lg font-bold text-gray-600'>
                {sentiment.word_analysis.total_words.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
