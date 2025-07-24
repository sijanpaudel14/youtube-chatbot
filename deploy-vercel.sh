#!/bin/bash

# YouTube RAG Chatbot - Vercel Deployment Script

echo "🚀 Preparing for Vercel deployment..."

# Navigate to frontend directory
cd nextjs-ui

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📋 Ready for Vercel deployment"
    echo ""
    echo "To deploy to Vercel:"
    echo "1. Run: npx vercel"
    echo "2. Or use: vercel --prod for production deployment"
    echo ""
    echo "Your backend is configured to use: https://youtube-chatbot-gr17.onrender.com"
else
    echo "❌ Build failed! Please check the errors above."
    exit 1
fi
