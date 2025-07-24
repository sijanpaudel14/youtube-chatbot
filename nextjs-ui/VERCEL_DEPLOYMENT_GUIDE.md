# Vercel Deployment Guide for YouTube RAG Chatbot

## Prerequisites
- [Vercel CLI](https://vercel.com/cli) installed (`npm i -g vercel`)
- Vercel account
- Backend deployed on Render at: `https://youtube-chatbot-gr17.onrender.com`

## Quick Deployment

### Option 1: Using the Deployment Script
```bash
# Run the automated deployment script
./deploy-vercel.sh

# Then deploy
cd nextjs-ui
npx vercel --prod
```

### Option 2: Manual Deployment
```bash
cd nextjs-ui
npm install
npm run build
npx vercel --prod
```

## Step-by-Step Instructions

### 1. Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Navigate to Frontend Directory
```bash
cd nextjs-ui
```

### 4. Deploy to Vercel
```bash
# For preview deployment
npx vercel

# For production deployment
npx vercel --prod
```

### 5. Configure Environment Variables (if needed)
During deployment, Vercel will detect your Next.js app and use the existing environment configuration:
- `.env.local` for local development
- `.env.production` for production (already configured with your backend URL)

## Environment Configuration

Your environment files are already configured:

**`.env.production`:**
```
NEXT_PUBLIC_BACKEND_URL=https://youtube-chatbot-gr17.onrender.com
```

## Deployment Configuration

The following files are already set up for optimal Vercel deployment:

### `vercel.json`
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_BACKEND_URL": "https://youtube-chatbot-gr17.onrender.com"
  }
}
```

### `next.config.js`
- Configured for production optimization
- Image optimization enabled
- API routes properly set up

## Expected URLs
After deployment, your app will be available at:
- **Preview:** `https://youtube-chatbot-[random].vercel.app`
- **Production:** `https://youtube-chatbot.vercel.app` (if available)

## Troubleshooting

### CORS Issues
If you encounter CORS errors after deployment:
1. Note your Vercel deployment URL
2. Update the backend CORS configuration on Render
3. Redeploy the backend

### Build Errors
If the build fails:
```bash
# Clean and rebuild locally first
cd nextjs-ui
rm -rf .next node_modules/.cache
npm install
npm run build
```

### Environment Variables
If environment variables aren't working:
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Add environment variables manually:
   - `NEXT_PUBLIC_BACKEND_URL`: `https://youtube-chatbot-gr17.onrender.com`

## Post-Deployment Checklist

- [ ] App loads without errors
- [ ] Chat interface works
- [ ] Video processing works
- [ ] Analytics dashboard displays data
- [ ] All API endpoints respond correctly
- [ ] CORS is properly configured

## Monitoring
- Check Vercel dashboard for deployment status
- Monitor function logs for any runtime errors
- Test all features after deployment

## Custom Domain (Optional)
To add a custom domain:
1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS settings as instructed

---

Your YouTube RAG Chatbot is ready for production! 🚀
