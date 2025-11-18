# Deployment Guide - NOAH's Ark

## Overview
This app has two parts that need to be deployed separately:
- **Frontend** (React + Vite) → Deploy to **Vercel** (free)
- **Backend** (Express.js API) → Deploy to **Render.com** (free)

---

## Step 1: Prepare Your Code

### 1.1 Initialize Git Repository (if not done)
```bash
git init
git add .
git commit -m "Initial commit - Ready for deployment"
```

### 1.2 Create a GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., "teacher-availability-poll")
3. Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/teacher-availability-poll.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Render.com

### 2.1 Sign Up for Render
1. Go to https://render.com
2. Sign up with GitHub (free)

### 2.2 Create a New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `noah-ark-backend`
   - **Environment**: `Node`
   - **Build Command**: (leave empty)
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`

### 2.3 Add Environment Variables
In Render dashboard, go to "Environment" and add:
```
NOTION_API_KEY=your_notion_api_key_here
NOTION_TEACHERS_DB_ID=your_teachers_db_id_here
NOTION_SUBMISSIONS_DB_ID=your_submissions_db_id_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
PORT=10000
```

### 2.4 Deploy
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
- Copy your backend URL (e.g., `https://noah-ark-backend.onrender.com`)

---

## Step 3: Update Frontend for Production

### 3.1 Update API URLs
You need to update your frontend to use the production backend URL instead of localhost.

Create a new file `.env.production`:
```
VITE_API_URL=https://noah-ark-backend.onrender.com
```

Then update `App.tsx` and `services/notionService.ts` to use this environment variable:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

### 3.2 Build Frontend
```bash
npm run build
```

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Sign Up for Vercel
1. Go to https://vercel.com
2. Sign up with GitHub (free)

### 4.2 Import Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 4.3 Add Environment Variables
In Vercel project settings → Environment Variables, add:
```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_API_URL=https://noah-ark-backend.onrender.com
```

### 4.4 Deploy
- Click "Deploy"
- Wait for deployment (2-3 minutes)
- Your app will be live at `https://your-project.vercel.app`

---

## Step 5: Configure CORS on Backend

Update `server.js` to allow your Vercel domain:

```javascript
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3002',
      'http://localhost:5173',
      'https://your-project.vercel.app'  // Add your Vercel URL
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  }
}));
```

Then commit and push to trigger redeployment.

---

## Important Notes

### Free Tier Limitations:
- **Render.com**: Backend sleeps after 15 min of inactivity (wakes up in ~1 min)
- **Vercel**: 100GB bandwidth/month (plenty for this app)
- **File uploads**: Currently saved locally on Render (will be lost on restart)

### Fixing File Uploads (Optional):
To make file uploads persistent, use Cloudinary:
1. Sign up at https://cloudinary.com (free tier)
2. Install: `npm install cloudinary multer-storage-cloudinary`
3. Update server.js to use Cloudinary storage instead of local

---

## Testing Your Deployment

1. Visit your Vercel URL
2. Try submitting a status
3. Check the admin dashboard
4. Verify data is saving to Notion

---

## Troubleshooting

### Backend not responding:
- Check Render logs: Dashboard → Your Service → Logs
- Ensure environment variables are set correctly
- Free tier sleeps after inactivity - first request takes ~1 min

### Frontend can't connect to backend:
- Check CORS settings in server.js
- Verify VITE_API_URL is set correctly in Vercel
- Check browser console for errors

### Notion API errors:
- Verify API keys are correct
- Check database IDs are correct
- Ensure Notion integration has access to databases

---

## Custom Domain (Optional)

### For Vercel (Frontend):
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

### For Render (Backend):
1. Upgrade to paid plan ($7/month) for custom domains
2. Or use the free .onrender.com subdomain

---

## Need Help?
- Render docs: https://render.com/docs
- Vercel docs: https://vercel.com/docs
- Check deployment logs in each platform's dashboard
