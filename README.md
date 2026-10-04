# GameSync Hub 🏆📅

A full-stack web application designed for families, coaches, and youth/amateur sports teams to effortlessly scrape or upload game schedules from any format (photos of printed schedules, PDFs, CSV spreadsheets, emails, or league URLs), verify the details, and sync live auto-updating calendars directly to friends and family members' phones and calendar apps.

---

## ✨ Key Features

1. **Multi-Modal Schedule Ingestion & Scraping**:
   - 📸 **Photo / Screenshot OCR**: Upload photos of printed schedules, fridge flyers, or paper tournament sheets.
   - 📄 **PDF & Spreadsheet Upload**: Import league PDFs, CSVs, or Excel files.
   - 🔗 **Public League URL Scraper**: Enter any public league webpage URL (TeamSnap, LeagueApps, SportsEngine, high school athletics) to scrape tables and format games.
   - 📝 **Email & Text Paste**: Paste schedule announcement emails, group chat messages, or notes.
   - 🤖 **Google Gemini AI + Heuristic Fallback**: AI-assisted extraction parses complex layouts into structured game objects; runs intelligent rule-based parsing even without an API key.

2. **Interactive Verification & Review Table**:
   - Extracted games appear in an editable review grid before anything is saved.
   - Adjust dates, times, home/away status, opponents, fields, or jersey colors in 1 click.

3. **Multi-Team Organization**:
   - Organize schedules across multiple children, sports, and seasons (e.g., Liam's U10 Soccer vs. Emma's 8U Softball).
   - Dedicated team calendars or a master **All Family Games** feed.

4. **Live Auto-Updating Calendar Feeds (RFC 5545 iCalendar)**:
   - `webcal://` feed subscriptions for Apple Calendar (iOS/macOS), Google Calendar, and Outlook.
   - Pre-game arrival reminder alarms (`VALARM`) alerting parents 30–45 minutes prior for warm-ups.
   - Live synchronization: Any schedule changes, rainouts, or rescheduled games update on subscribed calendars automatically.
   - Direct 1-click **Add to Google Calendar** button and `.ics` download.

5. **Friends & Family Share Hub**:
   - **QR Code Generator**: Let grandparents or family members scan a QR code with their phone camera to instantly subscribe.
   - **Mobile Share Sheet**: Share live calendar links directly into iMessage, WhatsApp, or SMS group chats.
   - **Email Invite Dispatcher**: Send automated invitations with 1-click calendar subscribe buttons.

6. **Score & Game Status Tracking**:
   - Track final scores (Win, Loss, Tie).
   - Status flags for **Scheduled**, **Completed**, **Rainout / Cancelled**, and **Rescheduled** (with new date/time fields).

7. **Zero-Maintenance Embedded Database**:
   - Uses native `node:sqlite` database stored in `data/gamesync.db`. No cloud database setup or recurring database costs.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v20+ or v22+)
- npm

### Installation & Run

```bash
# 1. Clone or navigate to the directory
cd gamesync-hub

# 2. Install dependencies
npm run install:all

# 3. Build the frontend
npm run build

# 4. Start the application
npm start
```

Open your browser to:
**`http://localhost:4000`**

### Live Calendar Feed URLs
- **Family Master Feed**: `http://localhost:4000/api/calendar/family.ics` (or `webcal://localhost:4000/api/calendar/family.ics`)
- **Team-Specific Feed**: `http://localhost:4000/api/calendar/<team-id>.ics`

## ☁️ 100% Free Cloud Deployment (GitHub Pages + Google Drive)

You can host GameSync Hub completely free with **zero server fees** and **zero database fees**:
- **Frontend Hosting**: Free on **GitHub Pages** (automated CI/CD via GitHub Actions).
- **Database & Live Calendar Subscriptions**: Free in **Google Drive (Google Sheets)** via **Google Apps Script**.
- **AI Extraction**: Client-side in the browser using the free Google Gemini 3.5 Flash API tier.

### 3-Minute Setup
1. **Enable GitHub Pages**:
   - In your GitHub repository, go to **Settings** > **Pages**.
   - Under **Build and deployment > Source**, select **GitHub Actions**.
   - Every push to `main` deploys automatically to `https://<username>.github.io/<repo-name>/`.
2. **Deploy Google Apps Script Backend**:
   - Open [Google Drive](https://drive.google.com/) and create a new **Google Sheet** (e.g., `GameSync Database`).
   - Click **Extensions** > **Apps Script**.
   - Paste the code from [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) into the editor.
   - Click **Deploy** > **New deployment**.
   - Select **Web app** (`Execute as: Me`, `Who has access: Anyone`).
   - Copy the deployed Web App URL (`https://script.google.com/macros/s/.../exec`).
3. **Connect to Your App**:
   - Open your hosted GameSync Hub site on GitHub Pages.
   - Click **Settings** (⚙️) in the top right.
   - Paste your **Google Apps Script Web App URL** and click **Save & Test Connection**.
   - Done! Your teams, games, and live calendar subscription feeds are now powered by your Google Sheet.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, QRCode.
- **Serverless Backend (Cloud Mode)**: Google Apps Script + Google Sheets in Google Drive (RFC 5545 iCalendar engine, team & game CRUD).
- **Local Backend (Self-Hosted Mode)**: Node.js, Express, `node:sqlite` (zero-dependency native SQLite), Multer.
- **AI Extraction**: Browser-direct Google Gemini API (`gemini-2.5-flash` / `gemini-3.5-flash`) + Rule-Based Heuristic Parser.
