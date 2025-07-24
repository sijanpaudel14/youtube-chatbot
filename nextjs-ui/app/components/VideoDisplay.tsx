'use client'

import { useState } from 'react'
import { ArrowLeft, ExternalLink, RotateCcw } from 'lucide-react'

interface VideoDisplayProps {
  videoId: string
  onReset: () => void
}

export default function VideoDisplay({ videoId, onReset }: VideoDisplayProps) {
  const [showFullDescription, setShowFullDescription] = useState(false)

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  const embedUrl = `https://www.youtube.com/embed/${videoId}`
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  return (
    <div className='h-full flex flex-col'>
      {/* Header */}
      <div className='bg-white rounded-2xl shadow-xl border border-gray-200 p-4 mb-4'>
        <div className='flex items-center justify-between'>
          <button
            onClick={onReset}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors'
          >
            <ArrowLeft className='w-4 h-4' />
            <span className='text-sm font-medium'>New Video</span>
          </button>

          <a
            href={videoUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors'
          >
            <span className='text-sm font-medium'>Open in YouTube</span>
            <ExternalLink className='w-4 h-4' />
          </a>
        </div>
      </div>

      {/* Video Player */}
      <div className='bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex-1 flex flex-col'>
        <div className='aspect-video bg-black relative'>
          <iframe
            src={embedUrl}
            title='YouTube video player'
            className='w-full h-full'
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
            allowFullScreen
          />
        </div>

        {/* Video Info */}
        <div className='p-4 flex-1 flex flex-col'>
          <div className='mb-4'>
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Video Analysis Ready
            </h3>
            <p className='text-sm text-gray-600 mb-3'>
              This video has been processed and is ready for Q&A. You can ask
              questions about any part of the content.
            </p>

            <div className='flex flex-wrap gap-2 mb-4'>
              <span className='px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full'>
                ✓ Transcript Extracted
              </span>
              <span className='px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full'>
                ✓ AI Analysis Complete
              </span>
              <span className='px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full'>
                ✓ Ready for Q&A
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className='space-y-3 mt-auto'>
            <div className='p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200'>
              <h4 className='font-semibold text-blue-900 mb-2 text-sm'>
                Quick Tips
              </h4>
              <ul className='text-xs text-blue-800 space-y-1'>
                <li>• Ask for a summary to get an overview</li>
                <li>• Request specific details about topics</li>
                <li>• Inquire about examples or case studies</li>
                <li>• Get explanations of complex concepts</li>
              </ul>
            </div>

            <button
              onClick={onReset}
              className='w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors text-sm font-medium'
            >
              <RotateCcw className='w-4 h-4' />
              Analyze Another Video
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
