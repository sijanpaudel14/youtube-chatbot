'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { api, TimestampInfo } from '../lib/api'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  timestamps?: TimestampInfo[]
}

interface ChatInterfaceProps {
  videoId: string
  messages?: Message[]
  onMessagesChange?: (messages: Message[]) => void
}

export default function ChatInterface({
  videoId,
  messages: initialMessages = [],
  onMessagesChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Update messages when initialMessages changes (video changes)
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages, videoId])

  // Call parent callback when messages change
  const updateMessages = useCallback(
    (newMessages: Message[]) => {
      setMessages(newMessages)
      if (onMessagesChange) {
        onMessagesChange(newMessages)
      }
    },
    [onMessagesChange]
  )

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const createYouTubeUrl = (timestamp: TimestampInfo): string => {
    return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(
      timestamp.start_time
    )}s`
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Set welcome message only if no messages exist
    if (initialMessages.length === 0) {
      updateMessages([
        {
          id: '1',
          type: 'bot',
          content:
            "👋 Hi! I've analyzed the video and I'm ready to answer your questions. You can ask me about the main topics, key points, specific details, or request a summary!",
          timestamp: new Date(),
        },
      ])
    }
  }, [videoId, initialMessages.length, updateMessages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    updateMessages([...messages, userMessage])
    const currentInput = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      // Use the new timestamp-enabled API
      const data = await api.chatWithVideoTimestamps({
        video_id: videoId,
        question: currentInput,
      })

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.answer,
        timestamp: new Date(),
        timestamps: data.timestamps,
      }

      updateMessages([...messages, userMessage, botMessage])
    } catch (error) {
      console.error('Error calling backend:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: `Sorry, I encountered an error while processing your question: ${
          error instanceof Error ? error.message : 'Unknown error'
        }. Please try again.`,
        timestamp: new Date(),
      }
      updateMessages([...messages, userMessage, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestionQuestions = [
    'What is the main topic of this video?',
    'Can you provide a summary?',
    'What are the key points discussed?',
    'Are there any examples mentioned?',
  ]

  const handleSuggestionClick = (question: string) => {
    setInput(question)
  }

  return (
    <div className='flex flex-col h-full bg-white'>
      {/* Chat Header */}
      <div className='flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-gray-50'>
        <div className='p-2 bg-blue-100 rounded-full'>
          <MessageCircle className='w-6 h-6 text-blue-600' />
        </div>
        <div>
          <h2 className='text-lg font-semibold text-gray-900'>
            Video Chat Assistant
          </h2>
          <p className='text-sm text-gray-600'>
            Ask me anything about the video content
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4'>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.type === 'bot' && (
              <div className='flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                <Bot className='w-5 h-5 text-blue-600' />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className='whitespace-pre-wrap text-sm leading-relaxed'>
                {message.content}
              </div>

              {/* Timestamp sources for bot messages */}
              {message.type === 'bot' &&
                message.timestamps &&
                message.timestamps.length > 0 && (
                  <div className='mt-3 pt-3 border-t border-gray-200'>
                    <div className='flex items-center gap-1 mb-2'>
                      <Clock className='w-3 h-3 text-gray-500' />
                      <span className='text-xs text-gray-500 font-medium'>
                        Sources from video:
                      </span>
                    </div>
                    <div className='space-y-1'>
                      {message.timestamps.map((ts, index) => (
                        <a
                          key={index}
                          href={createYouTubeUrl(ts)}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center gap-2 text-xs bg-white bg-opacity-80 rounded px-2 py-1 hover:bg-opacity-100 transition-colors group'
                        >
                          <span className='text-blue-600 font-mono'>
                            {formatTimestamp(ts.start_time)}
                          </span>
                          <span className='text-gray-600 flex-1 truncate'>
                            {ts.text_segment.substring(0, 60)}
                            {ts.text_segment.length > 60 ? '...' : ''}
                          </span>
                          <ExternalLink className='w-3 h-3 text-gray-400 group-hover:text-blue-600' />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              <div
                className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            {message.type === 'user' && (
              <div className='flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center'>
                <User className='w-5 h-5 text-white' />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className='flex gap-3 justify-start'>
            <div className='flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
              <Bot className='w-5 h-5 text-blue-600' />
            </div>
            <div className='bg-gray-100 rounded-lg px-4 py-3'>
              <div className='flex items-center gap-2 text-gray-600'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span className='text-sm'>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggestion buttons - show only when no messages (except welcome) */}
        {messages.length === 1 && (
          <div className='flex flex-col gap-2 mt-6'>
            <p className='text-sm text-gray-600 mb-2'>Try asking:</p>
            {suggestionQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className='text-left p-3 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors'
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className='border-t border-gray-200 p-4'>
        <form onSubmit={handleSubmit} className='flex gap-3'>
          <input
            type='text'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask a question about the video...'
            className='flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            disabled={isLoading}
          />
          <button
            type='submit'
            disabled={!input.trim() || isLoading}
            className='px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {isLoading ? (
              <Loader2 className='w-5 h-5 animate-spin' />
            ) : (
              <Send className='w-5 h-5' />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
