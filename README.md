<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# NOAH's Ark - Teacher Availability Poll

**N**otification **O**f **A**vailability & **H**azards

A real-time teacher availability tracking system with weather advisories, location tracking, and comprehensive admin dashboard.

## 🌐 Live Deployments

- **Frontend:** https://icannoah.vercel.app (Vercel)
- **Backend API:** https://teacher-availability-poll.onrender.com (Render.com)
- **GitHub Repository:** https://github.com/icanacademy/teacher-availability-poll

## 🏗️ Architecture

### Frontend (React + Vite)
- **Platform:** Vercel
- **Auto-deploys:** On push to `master` branch
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Backend (Express.js)
- **Platform:** Render.com (Web Service)
- **Deployment:** Manual trigger from Render dashboard
- **Start Command:** `npm start`
- **Port:** 3001 (auto-assigned by Render)

### Database
- **Notion Databases:**
  - Teachers Database: Stores teacher names and IDs
  - Submissions Database: Stores all availability submissions with full history

### Media Storage
- **Cloudinary:** For photos and videos uploaded by teachers

## ✨ Key Features

### For Teachers:
- **Quick Status Submission:** Available, Late, Online Only, Unavailable, Emergency
- **Location Tracking:** GPS auto-detect or manual selection from 100+ locations (NCR, GMA, Provinces, International)
- **Photo/Video Upload:** Optional media attachments
- **Reason Selection:** 29 comprehensive reason options
- **Weather Integration:** Auto-fetch current weather, hazards, earthquake data

### For Admins:
- **Live Status Summary:** Real-time counts of teacher availability (deduplicated, today only)
- **Interactive Map:** See teacher locations with color-coded pins
- **Three View Modes:**
  - Latest Only (default): Shows most recent submission per teacher
  - Full History: Shows all submissions with duplicate indicators
  - Not Submitted Yet: Shows teachers who haven't submitted
- **Date Filtering:** Today, Yesterday, Last 7 Days, All Time, Custom Date
- **Analytics:** Response rates, status distribution, distance from academy
- **AI Features:** Gemini-powered image/video analysis and submission summaries
- **Data Management:** Export, clear data, view submission details

## 🛠️ Technology Stack

### Frontend
- React 19.2 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Recharts (analytics charts)
- Leaflet (interactive maps)

### Backend
- Node.js with Express
- Notion API (@notionhq/client)
- Cloudinary SDK
- Google Gemini API
- Various weather/earthquake APIs

### APIs Used
- **Notion API:** Database storage
- **Cloudinary API:** Media uploads
- **Google Gemini API:** AI analysis
- **Open-Meteo:** Weather data
- **USGS Earthquake API:** Earthquake detection
- **OpenStreetMap Nominatim:** Reverse geocoding

## 📁 Project Structure

```
teacher-availability-poll/
├── components/              # React components
│   ├── AdminDashboard.tsx  # Admin interface (view modes, analytics)
│   ├── StatusSummary.tsx   # Live status counts
│   ├── StatusMap.tsx       # Interactive map
│   ├── WeatherBanner.tsx   # Weather display
│   └── ...
├── data/
│   └── unifiedLocations.ts # 100+ locations database
├── services/
│   ├── notionService.ts    # Notion API integration
│   └── geminiService.ts    # Gemini AI integration
├── constants.ts            # Poll options, reasons
├── types.ts               # TypeScript interfaces
├── App.tsx                # Main app component
├── server.js              # Express backend
├── .env.local             # Environment variables (local)
└── README.md              # This file
```

## 🔧 Environment Variables

### Frontend (.env.local)
```bash
VITE_API_URL=https://teacher-availability-poll.onrender.com
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### Backend (Render Environment Variables)
```bash
NOTION_API_KEY=secret_xxxx
NOTION_TEACHERS_DB_ID=xxxx
NOTION_SUBMISSIONS_DB_ID=xxxx
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx
GEMINI_API_KEY=xxxx
PORT=3001
```

## 🚀 Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/icanacademy/teacher-availability-poll.git
   cd teacher-availability-poll
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env.local`
   - Fill in your API keys and credentials

4. **Run the frontend:**
   ```bash
   npm run dev
   ```
   Opens on http://localhost:5173

5. **Run the backend (separate terminal):**
   ```bash
   npm start
   ```
   Runs on http://localhost:3001

## 📦 Deployment

### Frontend (Vercel)
- **Automatic:** Pushes to `master` branch auto-deploy
- **Manual:** Trigger redeploy from Vercel dashboard
- **Build Time:** ~30-60 seconds
- **Environment Variables:** Set in Vercel Project Settings

### Backend (Render)
- **Manual Only:** Go to Render dashboard → Manual Deploy
- **Build Time:** ~2-3 minutes
- **Important:** Backend does NOT auto-deploy on git push
- **Environment Variables:** Set in Render Environment tab

### Deployment Checklist
1. ✅ Make changes locally
2. ✅ Test thoroughly (`npm run dev` and `npm start`)
3. ✅ Commit and push to GitHub
   ```bash
   git add .
   git commit -m "Your descriptive message"
   git push
   ```
4. ✅ Frontend deploys automatically to Vercel
5. ✅ Backend: Manually deploy from Render dashboard
6. ✅ Wait 1-2 minutes for both to be ready
7. ✅ Test live at https://icannoah.vercel.app

## 🗄️ Notion Database Setup

### Teachers Database
**Required Properties:**
- `Name` (Title): Teacher's full name
- `Teacher ID` (Text): Unique identifier

### Submissions Database
**Required Properties:**
- `Teacher ID` (Text): Reference to teacher
- `Teacher Name` (Title): Teacher's name
- `Status` (Select): Available, Late, Online Only, Unavailable, Emergency
- `Reason` (Text): Reason for status
- `Location` (Text): Location name
- `Coordinates` (Text): "lat, lng" format
- `Timestamp` (Date): Submission time
- `Photo` (Files): Optional photo URL
- `Video` (Files): Optional video URL
- `Weather Data` (Text): JSON string of weather info

## 🔑 Key Files to Know

### To Add/Remove Teachers:
- Update **Notion Teachers Database** (add/delete rows)

### To Add/Remove Locations:
- Edit `data/unifiedLocations.ts`
- Add new location to `UNIFIED_LOCATIONS` array

### To Change Reasons:
- Edit `constants.ts`
- Update `REASON_OPTIONS` array

### To Change Status Options:
- Edit `constants.ts` → `POLL_OPTIONS`
- Edit `types.ts` → `PollStatus` enum

## 🐛 Common Issues & Solutions

### Issue: Changes not showing on live site
- **Frontend:** Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
- **Backend:** Manual deploy from Render dashboard required

### Issue: Build fails on Vercel
- Check build logs in Vercel dashboard
- Usually TypeScript errors or missing imports
- Fix locally, test with `npm run build`, then push

### Issue: Backend not responding
- Check Render logs for errors
- Verify environment variables are set
- Check Notion API keys are valid

### Issue: Distance showing wrong
- Old submissions may have Manila coordinates
- Auto-correction happens on load based on location name
- New submissions use correct coordinates from unified locations

## 📊 Admin Dashboard Features

### View Modes
1. **Latest Only** (Default)
   - Shows most recent submission per teacher
   - Clean view of current status
   - Analytics based on latest submissions

2. **Full History**
   - Shows ALL submissions
   - Amber badges for teachers with multiple submissions
   - Useful for tracking status changes

3. **Not Submitted Yet**
   - Shows teachers who haven't submitted
   - Red "No submission yet" badges
   - Perfect for accountability tracking

### Date Filters
- Today (default for Live Status Summary)
- Yesterday
- Last 7 Days
- All Time
- Custom Date Picker

## 🎯 Future Enhancements Ideas

- [ ] Email/SMS notifications for admins
- [ ] Push notifications for teachers
- [ ] CSV export of submissions
- [ ] Teacher groups/departments
- [ ] Recurring availability schedules
- [ ] Mobile app (React Native)

## 📞 Support

For issues or questions:
1. Check logs in Vercel/Render dashboards
2. Review this README
3. Check GitHub Issues: https://github.com/icanacademy/teacher-availability-poll/issues

## 📝 License

Internal use only - ICAN Academy

---

**Last Updated:** November 2024
**Maintained by:** ICAN Academy IT Team
