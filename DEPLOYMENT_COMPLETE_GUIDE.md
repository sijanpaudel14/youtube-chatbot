# YouTube RAG Chatbot - Deployment & Troubleshooting Guide 🚀

This document provides a comprehensive guide on how we deployed the YouTube RAG Chatbot to production and resolved various issues encountered during the process.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Deployment Process](#deployment-process)
4. [Problems Encountered & Solutions](#problems-encountered--solutions)
5. [Backend Deployment (Render)](#backend-deployment-render)
6. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
7. [Environment Variables](#environment-variables)
8. [Testing & Verification](#testing--verification)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## 🎯 Project Overview

The YouTube RAG Chatbot is a full-stack application that processes YouTube videos and creates an AI-powered chatbot using the video transcripts. The system uses:

- **Backend**: FastAPI (Python) with LangChain and Google Gemini AI
- **Frontend**: Next.js 14 with React and TypeScript
- **AI Components**: Google Gemini for embeddings and chat completion
- **Vector Storage**: FAISS for similarity search

### Live Demo

- **Frontend**: https://youtube-video-summarizer-phi.vercel.app
- **Backend API**: https://youtube-rag-backend-5eik.onrender.com

## 🏗️ Architecture

```
┌─────────────────┐    HTTPS/CORS     ┌──────────────────┐
│   Next.js UI    │ ◄─────────────── │   FastAPI        │
│   (Vercel)      │                   │   Backend        │
│                 │                   │   (Render)       │
└─────────────────┘                   └──────────────────┘
                                              │
                                              ▼
                                      ┌──────────────────┐
                                      │   Google Gemini  │
                                      │   AI Services    │
                                      └──────────────────┘
```

## 🚀 Deployment Process

### Phase 1: Backend Deployment

1. Prepared FastAPI application structure
2. Created `render.yaml` configuration
3. Set up environment variables
4. Deployed to Render.com

### Phase 2: Frontend Deployment

1. Built Next.js application
2. Configured API endpoints
3. Set up Vercel configuration
4. Deployed to Vercel.app

### Phase 3: Integration & CORS Configuration

1. Connected frontend to backend
2. Resolved CORS preflight issues
3. Tested full workflow

## 🐛 Problems Encountered & Solutions

### Problem 1: CORS Preflight Request Failures

**Issue**: Frontend couldn't connect to backend due to CORS policy violations:

```
Access to fetch at 'https://youtube-rag-backend-5eik.onrender.com/api/transcripts'
from origin 'https://youtube-video-summarizer-phi.vercel.app' has been blocked
by CORS policy: Response to preflight request doesn't pass access control check
```

**Root Cause**:

- Missing explicit OPTIONS handlers for CORS preflight requests
- Conflicting CORS configuration (wildcard origins with credentials)
- Missing frontend domain in allowed origins

**Solution Applied**:

1. **Added explicit OPTIONS handlers** in `backend/app.py`:

```python
@app.options("/api/transcripts")
async def transcripts_options(response: Response):
    """Handle CORS preflight for transcripts endpoint"""
    return {"message": "OK"}

@app.options("/api/process")
async def process_options(response: Response):
    """Handle CORS preflight for process endpoint"""
    return {"message": "OK"}

@app.options("/api/chat")
async def chat_options(response: Response):
    """Handle CORS preflight for chat endpoint"""
    return {"message": "OK"}
```

2. **Fixed CORS middleware configuration**:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://youtube-video-summarizer-ey8393493-sijan-paudels-projects.vercel.app",
        "https://youtube-video-summarizer-phi.vercel.app",
        "https://youtube-rag-backend-5eik.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

3. **Removed conflicting wildcard origins** from individual OPTIONS handlers

### Problem 2: Module Resolution Errors in Vercel Build

**Issue**: Next.js build failing with module not found errors:

```
Module not found: Can't resolve '../lib/api'
Module not found: Can't resolve './lib/api'
```

**Root Cause**:

- Vercel building from repository root instead of `nextjs-ui` subdirectory
- Import paths couldn't resolve because build context was wrong

**Solution Applied**:

**Method 1: Vercel Dashboard Configuration (Recommended)**

1. Go to Vercel project settings
2. Set **Root Directory** to `nextjs-ui`
3. This makes Vercel build from the correct subdirectory

**Method 2: Build Command Configuration**

- **Build Command**: `cd nextjs-ui && npm run build`
- **Output Directory**: `nextjs-ui/.next`
- **Install Command**: `cd nextjs-ui && npm install`

### Problem 3: Backend Deployment Not Updating

**Issue**: Code changes not reflecting in deployed backend

**Root Cause**:

- Git push conflicts and merge issues
- Deployment caching on Render

**Solution Applied**:

1. **Force pushed updates** to trigger deployment:

```bash
git push origin main --force
```

2. **Updated version numbers** to force cache invalidation:

```python
app = FastAPI(title="YouTube RAG Chatbot API", version="4.0.0")
```

3. **Used deployment triggers** with timestamp files

### Problem 4: Environment Variable Configuration

**Issue**: API keys and URLs not properly configured across environments

**Solution Applied**:

**Backend (.env)**:

```env
GOOGLE_API_KEY=your_google_api_key_here
```

**Frontend (Vercel Environment Variables)**:

```env
NEXT_PUBLIC_API_URL=https://youtube-rag-backend-5eik.onrender.com
```

## 🔧 Backend Deployment (Render)

### Step 1: Prepare Repository Structure

```
youtube-chatbot/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── render.yaml        # Render configuration
├── main.py                # Core chatbot logic
├── youtube_utils.py       # YouTube utilities
└── .env                   # Environment variables
```

### Step 2: Create render.yaml

```yaml
services:
  - type: web
    name: youtube-rag-backend
    env: python
    buildCommand: 'pip install -r requirements.txt'
    startCommand: 'cd backend && uvicorn app:app --host 0.0.0.0 --port $PORT'
    envVars:
      - key: GOOGLE_API_KEY
        sync: false
```

### Step 3: Deploy to Render

1. **Connect Repository**: Link your GitHub repository to Render
2. **Create Web Service**: Select "Web Service" and choose your repository
3. **Configure Settings**:
   - **Name**: `youtube-rag-backend`
   - **Branch**: `main`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn app:app --host 0.0.0.0 --port $PORT`
4. **Set Environment Variables**:
   - `GOOGLE_API_KEY`: Your Google AI API key
5. **Deploy**: Click "Create Web Service"

### Step 4: Verify Backend Deployment

```bash
# Test health endpoint
curl https://your-backend-url.onrender.com/

# Expected response:
{"message":"YouTube RAG Chatbot API is running!","version":"4.0"}
```

## 🌐 Frontend Deployment (Vercel)

### Step 1: Prepare Next.js Application

```
nextjs-ui/
├── app/
│   ├── components/
│   ├── lib/
│   │   └── api.ts         # API client
│   ├── page.tsx          # Main page
│   └── layout.tsx        # Root layout
├── package.json
├── next.config.js
└── tsconfig.json
```

### Step 2: Configure API Client

```typescript
// nextjs-ui/app/lib/api.ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://youtube-rag-backend-5eik.onrender.com'

export class YouTubeRAGAPI {
  // API methods...
}

export const api = new YouTubeRAGAPI()
```

### Step 3: Deploy to Vercel

**Method 1: Vercel Dashboard (Recommended)**

1. **Import Project**: Go to Vercel dashboard and import your GitHub repository
2. **Configure Settings**:
   - **Root Directory**: Set to `nextjs-ui`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: `https://your-backend-url.onrender.com`
4. **Deploy**: Click "Deploy"

**Method 2: Vercel CLI**

```bash
cd nextjs-ui
npm install -g vercel
vercel --prod
```

### Step 4: Configure Build Settings (If Subdirectory Issues)

If you encounter module resolution errors:

1. **Dashboard Configuration**:

   - Root Directory: `nextjs-ui`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

2. **Alternative Commands**:
   - Build Command: `cd nextjs-ui && npm run build`
   - Output Directory: `nextjs-ui/.next`
   - Install Command: `cd nextjs-ui && npm install`

## 🔐 Environment Variables

### Backend Environment Variables (Render)

```env
GOOGLE_API_KEY=your_google_api_key_here
```

### Frontend Environment Variables (Vercel)

```env
NEXT_PUBLIC_API_URL=https://youtube-rag-backend-5eik.onrender.com
```

### Local Development (.env files)

```env
# Root .env
GOOGLE_API_KEY=your_google_api_key_here

# nextjs-ui/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## ✅ Testing & Verification

### Backend API Testing

```bash
# Health check
curl https://youtube-rag-backend-5eik.onrender.com/

# CORS preflight test
curl -X OPTIONS "https://youtube-rag-backend-5eik.onrender.com/api/transcripts" \
  -H "Origin: https://youtube-video-summarizer-phi.vercel.app" \
  -H "Access-Control-Request-Method: GET" -v

# Test transcripts endpoint
curl -X POST "https://youtube-rag-backend-5eik.onrender.com/api/transcripts" \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=LmjtgvsA1PI"}'
```

### Frontend Testing

1. **Open Application**: Visit your Vercel URL
2. **Test Video Processing**: Enter a YouTube URL and process
3. **Test Chat Interface**: Ask questions about the processed video
4. **Check Network Tab**: Verify API calls are successful

### Integration Testing

1. **End-to-End Workflow**:
   - Enter YouTube URL
   - Process video (should succeed)
   - Chat with the video (should get responses)
   - Check for any CORS errors in browser console

## 🔧 Troubleshooting Common Issues

### CORS Errors

**Symptoms**: `blocked by CORS policy` errors in browser console

**Solutions**:

1. Add your frontend domain to backend CORS origins
2. Ensure explicit OPTIONS handlers are implemented
3. Remove conflicting wildcard origins when using credentials

### Module Resolution Errors

**Symptoms**: `Module not found` errors during Vercel build

**Solutions**:

1. Set correct Root Directory in Vercel settings
2. Verify file paths and import statements
3. Check tsconfig.json configuration

### API Connection Issues

**Symptoms**: `Failed to fetch` or timeout errors

**Solutions**:

1. Verify backend is running and accessible
2. Check environment variables are set correctly
3. Test API endpoints directly with curl
4. Verify HTTPS/SSL certificates

### Backend Not Updating

**Symptoms**: Code changes not reflected in deployed backend

**Solutions**:

1. Force push to trigger deployment: `git push origin main --force`
2. Update version numbers to break caches
3. Check Render deployment logs for errors
4. Verify environment variables are set

## 📚 Additional Resources

### API Documentation

- Backend API: `https://youtube-rag-backend-5eik.onrender.com/docs`
- Interactive API docs available via FastAPI's built-in Swagger UI

### Monitoring & Logs

- **Render Logs**: Available in Render dashboard under "Logs" tab
- **Vercel Logs**: Available in Vercel dashboard under "Functions" tab
- **Browser DevTools**: Network tab for frontend debugging

### Performance Optimization

- **Backend**: Use Redis for caching processed videos
- **Frontend**: Implement proper loading states and error handling
- **API**: Add rate limiting and request validation

---

## 🎉 Summary

We successfully deployed a full-stack YouTube RAG Chatbot with the following achievements:

✅ **Backend deployed to Render** with proper CORS configuration  
✅ **Frontend deployed to Vercel** with correct build settings  
✅ **CORS preflight issues resolved** with explicit OPTIONS handlers  
✅ **Module resolution errors fixed** with proper directory configuration  
✅ **Environment variables configured** across all environments  
✅ **End-to-end testing completed** and verified working

The application is now live and functional at:

- **Frontend**: https://youtube-video-summarizer-phi.vercel.app
- **Backend API**: https://youtube-rag-backend-5eik.onrender.com

For any issues or questions, refer to the troubleshooting section above or check the deployment logs in your respective dashboards.
