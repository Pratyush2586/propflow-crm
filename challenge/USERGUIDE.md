# PropFlow CRM — Complete User & Operations Guide

> Full lifecycle management across **Local Dev → GitHub → Vercel Production**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development — Start, Stop, Restart](#3-local-development)
4. [Working with Data Locally](#4-working-with-data-locally)
5. [Adding and Removing Features](#5-adding-and-removing-features)
6. [GitHub — Commit, Push, Branch, Rollback](#6-github-lifecycle)
7. [Vercel Production — Deploy, Monitor, Rollback](#7-vercel-production)
8. [Full Feature Lifecycle end-to-end](#8-full-feature-lifecycle-end-to-end)
9. [Troubleshooting](#9-troubleshooting)
10. [Quick Reference Cheat Sheet](#10-quick-reference-cheat-sheet)

---

## 1. Architecture Overview

```
YOUR MACHINE (Dev)
------------------------------------------------
Terminal A                  Terminal B
Backend  Node/Express        Frontend  React/Vite
localhost:3002    <------->  localhost:5173
SQLite DB                   (proxies /api -> :3002)
------------------------------------------------
         |
         | git push
         v
GITHUB (Source of Truth)
Repo: github.com/Pratyush2586/propflow-crm
Branch: main  (auto-triggers Vercel deploy on push)
         |
         | webhook auto-deploy
         v
VERCEL (Production)
Frontend  -> Static build from frontend/dist
Backend   -> Serverless function via api/index.js
Database  -> SQLite in /tmp (reseeds on cold start)
URL: https://propflow-crm.vercel.app
```

### Key File Paths

| What | Path |
|---|---|
| Backend entry point | `challenge/backend/server.js` |
| API routes | `challenge/backend/routes/` |
| Database setup + seed | `challenge/backend/db/database.js` |
| Frontend pages | `challenge/frontend/src/pages/` |
| Shared components | `challenge/frontend/src/components/` |
| Global styles (CSS) | `challenge/frontend/src/index.css` |
| Vercel config | `challenge/vercel.json` |
| Serverless entry | `challenge/api/index.js` |

---

## 2. Prerequisites

### Check installed versions
```bash
node --version      # need v20+
npm --version       # need v9+
git --version       # need v2+
```

### Install if missing
- Node.js 20 LTS: https://nodejs.org
- Git: https://git-scm.com

### One-time project setup (first time only)
```bash
cd C:\Users\learn\Documents\prat\challenge

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

---

## 3. Local Development

### START the application

Open **two separate terminals**.

**Terminal 1 — Backend:**
```bash
cd C:\Users\learn\Documents\prat\challenge\backend
npm start
```

You should see:
```
PropFlow CRM Backend running at http://localhost:3002
API: http://localhost:3002/api/health
```

**Terminal 2 — Frontend:**
```bash
cd C:\Users\learn\Documents\prat\challenge\frontend
npm run dev
```

You should see:
```
VITE ready in ~500ms
Local: http://localhost:5173/
```

**Open the app:** http://localhost:5173

---

### STOP the application

Press `Ctrl + C` in each terminal. Confirm with `Y` if prompted.

**Force-kill a stuck port:**
```bash
# Find the process using port 3002
netstat -ano | findstr :3002

# Kill it (replace 12345 with the PID shown)
taskkill /F /PID 12345

# Same for frontend port 5173
netstat -ano | findstr :5173
taskkill /F /PID 12345
```

---

### RESTART the application

Stop both terminals with `Ctrl + C`, then run the start commands again.

---

### REFRESH behaviour

| Change type | What to do |
|---|---|
| Frontend JSX or CSS | Nothing — Vite auto-reloads the browser instantly |
| Backend route or DB logic | Restart Terminal 1 (Ctrl+C then `npm start`) |
| Browser cache stuck | Hard refresh: `Ctrl + Shift + R` |

---

### Backend with auto-restart on file save

```bash
cd C:\Users\learn\Documents\prat\challenge\backend
npm run dev        # uses nodemon — restarts automatically on save
```

---

### Verify everything is working

```bash
# Is backend alive?
curl http://localhost:3002/api/health
# Expected: {"status":"ok","app":"PropFlow CRM","version":"1.0.0"}

# Is data loading?
curl http://localhost:3002/api/dashboard/stats

# Check properties
curl http://localhost:3002/api/properties

# Check clients
curl http://localhost:3002/api/clients
```

---

## 4. Working with Data Locally

### Database location
```
challenge/backend/db/propflow.db    <- SQLite file (local only, gitignored)
```

### Reset database (start fresh with demo data)
```bash
# Stop the backend first (Ctrl+C in Terminal 1), then:
cd C:\Users\learn\Documents\prat\challenge\backend\db

del propflow.db
del propflow.db-shm
del propflow.db-wal

# Restart the backend — it auto-creates and seeds demo data
cd ..
npm start
```

### Inspect database directly
```bash
# Using SQLite3 CLI (install from https://sqlite.org if needed)
sqlite3 C:\Users\learn\Documents\prat\challenge\backend\db\propflow.db

# Useful commands inside sqlite3:
.tables                            # list all tables
SELECT * FROM properties;          # all properties
SELECT * FROM clients;             # all clients
SELECT * FROM opportunities;       # all opportunities
SELECT * FROM activities;          # all activities
.quit                              # exit
```

### Add permanent demo data to the seed

Edit `challenge/backend/db/database.js` and find the `seedDemoData()` function.
Add new entries inside it following the existing pattern.
Then reset the database to see your new records.

---

## 5. Adding and Removing Features

### Add a new backend API route

**Step 1 — Create the route file:**
```
challenge/backend/routes/yourroute.js
```

**Step 2 — Write the route:**
```js
const express = require('express');
const db = require('../db/database');
const router = express.Router();

router.get('/summary', (req, res) => {
  const data = db.prepare('SELECT COUNT(*) as total FROM properties').get();
  res.json(data);
});

module.exports = router;
```

**Step 3 — Register it in `challenge/backend/server.js`:**
```js
app.use('/api/yourroute', require('./routes/yourroute'));
```

**Step 4 — Restart backend and test:**
```bash
curl http://localhost:3002/api/yourroute/summary
```

---

### Remove a backend route

1. Delete: `challenge/backend/routes/routename.js`
2. Remove from `server.js`: the `app.use('/api/routename', ...)` line
3. Restart backend

---

### Add a new frontend page

**Step 1 — Create the page:**
```
challenge/frontend/src/pages/MyPage.jsx
```

**Step 2 — Add a route in `challenge/frontend/src/App.jsx`:**
```jsx
import MyPage from './pages/MyPage';

// Inside <Routes>:
<Route path="/mypage" element={<MyPage />} />
```

**Step 3 — Add a nav link in `challenge/frontend/src/components/Layout.jsx`:**
```jsx
{ to: '/mypage', icon: '◉', label: 'My Page' },
```

**Step 4 — Browser auto-reloads. Visit:** http://localhost:5173/mypage

---

### Remove a frontend page

1. Delete: `challenge/frontend/src/pages/PageName.jsx`
2. Remove the `<Route>` from `App.jsx`
3. Remove the nav link from `Layout.jsx`
4. Browser auto-reloads

---

### Change the colour theme

Edit `challenge/frontend/src/index.css` — the `:root` block at the top:

```css
:root {
  --gold:   #C6A96B;   /* accent colour — buttons, active nav, highlights */
  --black:  #0A0A0A;   /* sidebar background, primary text */
  --beige:  #EDEAE6;   /* card backgrounds, warm fills */
  --white:  #FFFFFF;   /* main background */
  --gray-light: #F5F5F5;  /* page background */
}
```

Changes reflect instantly (Vite hot module replacement).

---

### Change the database schema

1. Edit `challenge/backend/db/database.js` — update `CREATE TABLE` SQL in `initDB()`
2. Reset local database (delete `propflow.db`, restart backend)

On Vercel the schema auto-applies because `/tmp/propflow.db` is rebuilt fresh on every cold start.

---

## 6. GitHub Lifecycle

### Your repository
```
https://github.com/Pratyush2586/propflow-crm
Branch: main
```

### Daily workflow — make a change and ship it

```bash
# 1. Check what changed
cd C:\Users\learn\Documents\prat
git status
git diff

# 2. Stage your changes
git add challenge/                          # stage everything in challenge/
# OR stage specific files:
git add challenge/frontend/src/pages/NewPage.jsx
git add challenge/backend/routes/newroute.js

# 3. Commit with a clear message
git commit -m "Add activity feed and timeline view"

# 4. Push to GitHub (this triggers automatic Vercel deployment)
git push origin main
```

---

### Work on a feature branch (for bigger changes)

```bash
# Create a new branch
git checkout -b feature/activity-feed

# Make changes, then commit
git add challenge/
git commit -m "Add activity feed component"

# Push the branch (does NOT deploy to Vercel production)
git push origin feature/activity-feed

# When ready to ship, merge to main
git checkout main
git merge feature/activity-feed
git push origin main                        # triggers Vercel production deploy

# Clean up
git branch -d feature/activity-feed
git push origin --delete feature/activity-feed
```

---

### View commit history

```bash
git log --oneline -10              # last 10 commits, short form
git log --oneline --graph          # visual branch/merge tree
git show <commit-sha>              # full diff of a specific commit
git diff HEAD~1 HEAD               # changes since last commit
```

---

### Undo a commit (before push)

```bash
# Keep changes staged (safe undo)
git reset --soft HEAD~1

# Discard changes completely
git reset --hard HEAD~1
```

### Rollback after push (safe — creates a new undo commit)

```bash
git revert HEAD                    # undoes the last commit
git push origin main               # Vercel redeploys the reverted version
```

### Rollback to a specific older commit

```bash
git log --oneline                  # find the commit SHA you want to go back to
git revert <commit-sha>            # undo that specific commit
git push origin main
```

---

### Pull latest changes (working from another machine)

```bash
git pull origin main
```

---

## 7. Vercel Production

### Your URLs

| Purpose | URL |
|---|---|
| Live production app | https://propflow-crm.vercel.app |
| Vercel dashboard | https://vercel.com/primepratyush-gmailcoms-projects/propflow-crm |
| Deployments history | https://vercel.com/primepratyush-gmailcoms-projects/propflow-crm/deployments |

---

### How auto-deployment works

```
You run: git push origin main
         |
         v
GitHub receives the push
         |
         v
Vercel webhook fires automatically
         |
         v
Vercel build runs:
  npm install                                  (installs backend deps)
  cd frontend && npm install && npm run build  (builds React app)
         |
         v
Vercel deploys:
  /api/*  -->  Node.js serverless function
  /*      -->  Static frontend files
         |
         v
Live in 60-90 seconds
```

---

### Deployment states

| State | Meaning |
|---|---|
| INITIALIZING | Vercel received the build request |
| BUILDING | Running install and build commands |
| READY | Deployed and live |
| ERROR | Build failed — check build logs |
| CANCELED | Manually canceled |

---

### Check deployment status via API

```bash
# List your 5 most recent deployments
curl -s "https://api.vercel.com/v6/deployments?projectId=prj_SP6ozxmU409h038FiPes0JYgFo0c&teamId=team_bjcNswhQEUEA3N8ha6KCdlae&limit=5" \
  -H "Authorization: Bearer <YOUR_VERCEL_TOKEN>"
```

---

### Trigger a manual deployment via API

```bash
# Step 1: Get the latest commit SHA from GitHub
curl -s https://api.github.com/repos/Pratyush2586/propflow-crm/git/refs/heads/main \
  -H "Authorization: token <YOUR_GITHUB_TOKEN>"

# Step 2: Trigger deployment (replace <SHA> with value from step 1)
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_bjcNswhQEUEA3N8ha6KCdlae" \
  -H "Authorization: Bearer <YOUR_VERCEL_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"propflow-crm\",\"project\":\"prj_SP6ozxmU409h038FiPes0JYgFo0c\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repoId\":1207264570,\"ref\":\"main\",\"sha\":\"<SHA>\"}}"
```

---

### View build logs

1. Go to https://vercel.com/primepratyush-gmailcoms-projects/propflow-crm/deployments
2. Click any deployment
3. Click the **Build Logs** tab
4. Click the **Functions** tab to see serverless API logs

---

### Rollback on Vercel

**Option A — via Vercel dashboard (easiest):**
1. Go to Deployments page
2. Find a previous working deployment
3. Click the three-dot menu next to it
4. Click **Promote to Production**

**Option B — via git (recommended):**
```bash
git revert HEAD
git push origin main    # Vercel auto-deploys the reverted code
```

---

### Add environment variables to Vercel

**Via dashboard:**
1. Go to your project settings on Vercel
2. Click **Environment Variables**
3. Add key and value, select target (Production / Preview / Development)
4. Redeploy for changes to take effect

**Via API:**
```bash
curl -s -X POST "https://api.vercel.com/v10/projects/prj_SP6ozxmU409h038FiPes0JYgFo0c/env?teamId=team_bjcNswhQEUEA3N8ha6KCdlae" \
  -H "Authorization: Bearer <YOUR_VERCEL_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"MY_VARIABLE\",\"value\":\"my_value\",\"type\":\"plain\",\"target\":[\"production\"]}"
```

Then trigger a new deployment.

---

### Important note about the database on Vercel

The production deployment uses SQLite stored in `/tmp/propflow.db` on the serverless function.
`/tmp` is ephemeral — it resets when the function goes cold (after ~5 minutes of inactivity).

**This means:** demo data reseeds automatically on cold starts. This is expected behaviour for a serverless SQLite setup. For persistent production data, replace SQLite with a cloud database such as Neon (PostgreSQL) or PlanetScale (MySQL).

---

## 8. Full Feature Lifecycle (end-to-end)

Complete walkthrough for adding a new feature from idea to production.

### Example: Add a Notes field to property detail

**Step 1 — Code it locally**
```
Edit: challenge/backend/routes/properties.js    (add notes to API)
Edit: challenge/frontend/src/pages/Properties.jsx  (show notes in UI)
```

**Step 2 — Test locally**
```
Backend running on Terminal 1
Frontend running on Terminal 2
Open http://localhost:5173 and verify the feature works
```

**Step 3 — Stage and commit**
```bash
cd C:\Users\learn\Documents\prat
git add challenge/backend/routes/properties.js
git add challenge/frontend/src/pages/Properties.jsx
git commit -m "Add editable notes field to property cards"
```

**Step 4 — Push (triggers auto-deploy)**
```bash
git push origin main
```

**Step 5 — Watch the deployment**
```
Go to: https://vercel.com/primepratyush-gmailcoms-projects/propflow-crm/deployments
Wait ~60-90 seconds for status to show READY
```

**Step 6 — Verify on production**
```
Open: https://propflow-crm.vercel.app
Test the new notes field works in production
```

**Step 7 — If something is broken, rollback**
```bash
git revert HEAD
git push origin main
# Vercel redeploys the previous working version in ~90 seconds
```

---

## 9. Troubleshooting

### Backend port 3002 already in use
```bash
netstat -ano | findstr :3002
taskkill /F /PID <PID shown>
cd challenge\backend && npm start
```

### Frontend port 5173 already in use
```bash
netstat -ano | findstr :5173
taskkill /F /PID <PID shown>
cd challenge\frontend && npm run dev
```

### API calls failing in browser (network error)
- Confirm backend is running: `curl http://localhost:3002/api/health`
- Confirm `vite.config.js` proxy target is `http://localhost:3002`
- Try hard-refresh: `Ctrl + Shift + R`

### Database errors or missing tables
```bash
# Delete and let backend rebuild it
del challenge\backend\db\propflow.db
cd challenge\backend && npm start
```

### Git push rejected (non-fast-forward)
```bash
git pull --rebase origin main
git push origin main
```

### Git push blocked by secret scanning
GitHub blocks pushes that contain tokens or passwords.
Check your files for any API keys, tokens, or credentials and replace with placeholders before committing.

### Vercel build failing
1. Open the failing deployment in the Vercel dashboard
2. Read the Build Logs carefully — the error is shown with file and line number
3. Common causes and fixes:

| Error | Fix |
|---|---|
| Syntax error in JSX/JS | Fix the code error shown in logs |
| Module not found | Add the package to `package.json`, commit, push |
| Node version mismatch | Confirm `.node-version` file contains `20` |
| Out of memory | Reduce bundle size or upgrade Vercel plan |

### Vercel API (serverless) errors
- Check the **Functions** tab in the deployment logs
- Remember that `/tmp/propflow.db` resets on cold start — this is expected

### Changes pushed but Vercel did not deploy
- Check https://vercel.com/primepratyush-gmailcoms-projects/propflow-crm/deployments
- If no new deployment appeared, trigger one manually using the API (see Section 7)

---

## 10. Quick Reference Cheat Sheet

### Local Development

| Action | Command |
|---|---|
| Start backend | `cd challenge/backend && npm start` |
| Start backend (auto-restart) | `cd challenge/backend && npm run dev` |
| Start frontend | `cd challenge/frontend && npm run dev` |
| Stop either | `Ctrl + C` in the terminal |
| Kill port 3002 | `netstat -ano | findstr :3002` then `taskkill /F /PID <PID>` |
| Kill port 5173 | `netstat -ano | findstr :5173` then `taskkill /F /PID <PID>` |
| Reset database | Delete `challenge/backend/db/propflow.db`, restart backend |
| Health check | `curl http://localhost:3002/api/health` |
| Open app | http://localhost:5173 |

---

### GitHub

| Action | Command |
|---|---|
| See what changed | `git status` |
| See exact diff | `git diff` |
| Stage all challenge files | `git add challenge/` |
| Stage one file | `git add challenge/path/to/file.js` |
| Commit | `git commit -m "your message"` |
| Push to GitHub | `git push origin main` |
| Pull latest | `git pull origin main` |
| Create branch | `git checkout -b feature/name` |
| Switch branch | `git checkout main` |
| Merge branch | `git merge feature/name` |
| Delete local branch | `git branch -d feature/name` |
| Delete remote branch | `git push origin --delete feature/name` |
| Undo last commit (keep changes) | `git reset --soft HEAD~1` |
| Undo last commit (discard changes) | `git reset --hard HEAD~1` |
| Undo pushed commit safely | `git revert HEAD && git push origin main` |
| View history | `git log --oneline -10` |
| View specific commit | `git show <sha>` |

---

### Vercel Production

| Action | How |
|---|---|
| Deploy | `git push origin main` (auto) |
| View live app | https://propflow-crm.vercel.app |
| View dashboard | https://vercel.com/primepratyush-gmailcoms-projects/propflow-crm |
| View deployments | Dashboard > Deployments tab |
| View build logs | Click deployment > Build Logs |
| View API logs | Click deployment > Functions tab |
| Rollback | Dashboard > find old deployment > Promote to Production |

---

### Key Project IDs (keep these safe)

| Item | Value |
|---|---|
| Vercel Team ID | `team_bjcNswhQEUEA3N8ha6KCdlae` |
| Vercel Project ID | `prj_SP6ozxmU409h038FiPes0JYgFo0c` |
| GitHub Repo | `Pratyush2586/propflow-crm` |
| GitHub Repo ID | `1207264570` |
| Production URL | https://propflow-crm.vercel.app |
| Local Backend | http://localhost:3002 |
| Local Frontend | http://localhost:5173 |

---

*PropFlow CRM · Node.js + Express + SQLite + React + Vite · Deployed on Vercel*
