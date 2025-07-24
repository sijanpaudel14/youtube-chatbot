# 🚀 Deploy YouTube RAG Chatbot Frontend to Vercel

## 📋 Pre-Deployment Checklist

✅ **Backend is live**: https://youtube-rag-backend-5eik.onrender.com  
✅ **Frontend updated**: Now connects to Render backend  
✅ **Environment configured**: API URL set to production  
✅ **Dependencies**: All packages installed  

## 🌐 Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to frontend directory**:
   ```bash
   cd nextjs-ui
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Deploy to Vercel**:
   ```bash
   vercel
   ```

5. **Follow the prompts**:
   - Set up and deploy? **Y**
   - Which scope? **Your personal account**
   - Link to existing project? **N**
   - Project name: **youtube-rag-chatbot-ui**
   - In which directory is your code? **./nextjs-ui** (or just press Enter)
   - Want to modify settings? **N**

### Option 2: Deploy via Vercel Dashboard

1. **Go to**: https://vercel.com/dashboard

2. **Click "New Project"**

3. **Import Git Repository**:
   - Connect your GitHub account if needed
   - Select your `youtube-chatbot` repository
   - **Root Directory**: Set to `nextjs-ui`

4. **Configure Project**:
   - **Project Name**: `youtube-rag-chatbot-ui`
   - **Framework Preset**: Next.js
   - **Root Directory**: `nextjs-ui`

5. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL = https://youtube-rag-backend-5eik.onrender.com
   ```

6. **Click "Deploy"**

## 🔧 Environment Configuration

The frontend is already configured to connect to your live Render backend:

- **Production API**: `https://youtube-rag-backend-5eik.onrender.com`
- **Environment File**: `.env.local` (automatically used)
- **Vercel Config**: `vercel.json` (sets production environment)

## ✅ Post-Deployment

After successful deployment, you'll get a URL like:
- **Production**: `https://youtube-rag-chatbot-ui-[random].vercel.app`

### Test Your Deployed Frontend:

1. **Open your Vercel URL**
2. **Enter a YouTube URL** (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
3. **Click "Get Available Transcripts"**
4. **Select language and click "Process Video"**
5. **Ask questions in the chat interface**

## 🔗 Complete Architecture

```
Frontend (Vercel)     →     Backend (Render)     →     Google AI
   Next.js                    FastAPI                   Gemini API
   React UI                   Python RAG                Vector Search
   TypeScript                 YouTube API               Embeddings
```

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**: Backend already configured for `*.vercel.app` domains
2. **API Connection**: Check network tab for failed requests
3. **Environment Variables**: Ensure `NEXT_PUBLIC_API_URL` is set

### Debug Steps:

1. **Check browser console** for JavaScript errors
2. **Check network tab** for API request failures  
3. **Verify backend health**: Visit `https://youtube-rag-backend-5eik.onrender.com/`
4. **Check Vercel logs** in dashboard for build/runtime errors

## 🎯 Next Steps

1. **Deploy to Vercel** using one of the methods above
2. **Test the full workflow** with your live URLs
3. **Share your deployed app** with others!

## 📱 Mobile Responsive

Your frontend is already mobile-responsive and will work great on:
- 📱 Mobile phones
- 📲 Tablets  
- 💻 Desktop computers

---

## 🎉 Ready to Deploy!

Your YouTube RAG Chatbot is ready for production deployment on Vercel! 🚀
