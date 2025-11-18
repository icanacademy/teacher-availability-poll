# How to Run NOAH's Ark

## Quick Start (Easiest Method)

### macOS:
**Double-click** the file: `Start NOAH's Ark.command`

This will open Terminal and start both servers automatically!

---

## Alternative Methods

### Method 1: Using npm start
Open Terminal in this folder and run:
```bash
npm start
```

This starts both the backend and frontend servers together.

### Method 2: Run servers separately
Open **two separate** Terminal windows:

**Terminal 1 (Backend):**
```bash
npm run server
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

---

## Access the App

Once running, open your browser to:
- **App:** http://localhost:3000
- **Backend API:** http://localhost:3001

---

## Stopping the Servers

Press `Ctrl + C` in the Terminal window to stop.

---

## First Time Setup

If you just cloned this or it's your first time running:

```bash
npm install
```

Make sure your `.env.local` file has:
```
GEMINI_API_KEY=your_key_here
NOTION_API_KEY=your_key_here
NOTION_TEACHERS_DB_ID=your_database_id_here
```

---

## Troubleshooting

**"Could not load teacher list"**
- Make sure the backend server is running (port 3001)
- Check that your Notion API key and database ID are correct in `.env.local`

**Port already in use**
- Close any other apps running on ports 3000 or 3001
- Or kill the process: `lsof -ti:3000 | xargs kill` (same for port 3001)
