import '../globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YouTube RAG Chatbot | AI Video Summarizer',
  description:
    'Transform any YouTube video into an intelligent chatbot. Get instant answers and summaries from video content using advanced AI.',
  keywords:
    'YouTube, AI, chatbot, video summarizer, RAG, artificial intelligence',
  authors: [{ name: 'Your Name' }],
  openGraph: {
    title: 'YouTube RAG Chatbot',
    description: 'AI-powered YouTube video summarization and Q&A',
    type: 'website',
  },
}

export const viewport = 'width=device-width, initial-scale=1'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en'>
      <body className={inter.className}>
        <div className='min-h-screen'>{children}</div>
      </body>
    </html>
  )
}
