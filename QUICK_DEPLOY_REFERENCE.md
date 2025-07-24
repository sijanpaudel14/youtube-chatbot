# Quick Deployment Reference 🚀

## Backend Deployment (Render) - 5 Minutes ⏱️

1. **Push to GitHub**:

   ```bash
   git add -A
   git commit -m "Deploy backend"
   git push origin main
   ```

2. **Render Auto-Deploy**:

   - Render detects changes and auto-deploys
   - Check logs at: https://dashboard.render.com

3. **Verify**:
   ```bash
   curl https://youtube-rag-backend-5eik.onrender.com/
   ```

## Frontend Deployment (Vercel) - 3 Minutes ⏱️

1. **Push to GitHub**:

   ```bash
   git add -A
   git commit -m "Deploy frontend"
   git push origin main
   ```

2. **Vercel Auto-Deploy**:

   - Vercel detects changes and auto-deploys
   - Check at: https://vercel.com/dashboard

3. **Settings Check** (if issues):
   - Root Directory: `nextjs-ui`
   - Environment Variables: `NEXT_PUBLIC_API_URL`

## Quick Fixes ⚡

### CORS Issues

```python
# Add to backend/app.py allowed origins:
"https://your-new-vercel-url.vercel.app"
```

### Module Resolution

- Set Vercel Root Directory to `nextjs-ui`

### Environment Variables

```bash
# Backend (Render)
GOOGLE_API_KEY=your_key

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://youtube-rag-backend-5eik.onrender.com
```

## Live URLs 🌐

- **Frontend**: https://youtube-video-summarizer-phi.vercel.app
- **Backend**: https://youtube-rag-backend-5eik.onrender.com
- **API Docs**: https://youtube-rag-backend-5eik.onrender.com/docs
