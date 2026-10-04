const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const os = require('node:os');

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Load .env file automatically if present
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(process.env.HOME || '', '.env')
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch (e) {}
    }
  }
}
loadEnv();

const db = require('./db');
const { generateICalFeed, createGoogleCalendarUrl } = require('./ical');
const { parseSchedule } = require('./parser');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/api/system-info', (req, res) => {
  const lanIp = getLanIp();
  res.json({
    lanIp,
    lanPort: PORT,
    lanUrl: `http://${lanIp}:${PORT}`,
    scheduleUrl: `http://${lanIp}:${PORT}/schedule`
  });
});

// Setup multer in-memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// -------------------------------------------------------------
// TEAMS API
// -------------------------------------------------------------
app.get('/api/teams', (req, res) => {
  try {
    const teams = db.getTeams();
    // Attach game count
    const teamsWithCount = teams.map(t => {
      const games = db.getGames(t.id);
      return {
        ...t,
        game_count: games.length,
        upcoming_count: games.filter(g => g.status === 'Scheduled').length
      };
    });
    res.json(teamsWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/teams', (req, res) => {
  try {
    const { name, sport, child_name, season, color, default_arrival_buffer_mins } = req.body;
    if (!name || !sport) {
      return res.status(400).json({ error: 'Team name and sport are required.' });
    }
    const team = {
      id: `team-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      sport,
      child_name: child_name || '',
      season: season || '',
      color: color || '#2563eb',
      default_arrival_buffer_mins: parseInt(default_arrival_buffer_mins, 10) || 30
    };
    db.createTeam(team);
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/teams/:id', (req, res) => {
  try {
    const updated = db.updateTeam(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/teams/:id', (req, res) => {
  try {
    db.deleteTeam(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// GAMES API
// -------------------------------------------------------------
app.get('/api/games', (req, res) => {
  try {
    const { teamId } = req.query;
    const games = db.getGames(teamId);
    // Enrich with Google Calendar quick links
    const enriched = games.map(g => ({
      ...g,
      google_calendar_url: createGoogleCalendarUrl(g)
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games', (req, res) => {
  try {
    const g = req.body;
    if (!g.team_id || !g.opponent || !g.game_date || !g.start_time) {
      return res.status(400).json({ error: 'Missing required game fields (team_id, opponent, date, start_time).' });
    }
    const id = g.id || `game-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const newGame = db.createGame({ ...g, id });
    const full = db.getGameById(id);
    res.status(201).json(full || newGame);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/games/batch', (req, res) => {
  try {
    const { team_id, games } = req.body;
    if (!team_id) {
      return res.status(400).json({ error: 'team_id is required for batch import.' });
    }
    if (!Array.isArray(games) || games.length === 0) {
      return res.status(400).json({ error: 'No games provided in batch.' });
    }

    const inserted = [];
    for (const g of games) {
      const id = `game-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      db.createGame({
        ...g,
        id,
        team_id
      });
      inserted.push(db.getGameById(id));
    }
    res.status(201).json({ count: inserted.length, games: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/games/:id', (req, res) => {
  try {
    const updated = db.updateGame(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/games/:id', (req, res) => {
  try {
    db.deleteGame(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SCHEDULE PARSER & SCRAPER
// -------------------------------------------------------------
app.post('/api/parse-schedule', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { text, url, defaultTeamId, defaultYear } = req.body;

    const fileBuffer = file ? file.buffer : null;
    const mimeType = file ? file.mimetype : null;

    if (!fileBuffer && !text && !url) {
      return res.status(400).json({ error: 'Please provide a file, URL, or schedule text to parse.' });
    }

    const parsedGames = await parseSchedule({
      text,
      fileBuffer,
      mimeType,
      url,
      defaultTeamId,
      defaultYear: defaultYear ? parseInt(defaultYear, 10) : new Date().getFullYear()
    });

    res.json({
      count: parsedGames.length,
      games: parsedGames
    });
  } catch (err) {
    console.error('Parse error:', err);
    res.status(500).json({ error: err.message || 'Failed to parse schedule.' });
  }
});

// -------------------------------------------------------------
// LIVE CALENDAR FEEDS (RFC 5545 iCal & WebCal)
// -------------------------------------------------------------
// Combined Family / All Teams .ics feed
app.get('/api/calendar/family.ics', (req, res) => {
  try {
    const games = db.getGames(); // All games
    const icalContent = generateICalFeed({
      calendarName: 'Family Sports Schedule',
      games
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="family_sports_schedule.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(icalContent);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Team-specific .ics / webcal feed
app.get('/api/calendar/:teamId.ics', (req, res) => {
  try {
    const teamId = req.params.teamId;
    const team = db.getTeamById(teamId);
    if (!team) {
      return res.status(404).send('Team not found');
    }

    const games = db.getGames(teamId);
    const icalContent = generateICalFeed({
      calendarName: `${team.name} Schedule`,
      games
    });

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${team.name.replace(/[^a-zA-Z0-9-_]/g, '_')}_schedule.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(icalContent);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// -------------------------------------------------------------
// FRIENDS & FAMILY INVITES & SHARING
// -------------------------------------------------------------
app.get('/api/subscribers', (req, res) => {
  try {
    const { teamId } = req.query;
    const subs = db.getSubscribers(teamId);
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/send-invitation', (req, res) => {
  try {
    const { name, email, relationship, team_id } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const sub = {
      id: `sub-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      team_id: team_id || null,
      name,
      email,
      relationship: relationship || 'Family/Friend'
    };
    db.createSubscriber(sub);

    // Formulate the invitation payload
    let targetCalendarName = 'Whole Family Schedule';
    let feedPath = '/api/calendar/family.ics';
    if (team_id) {
      const team = db.getTeamById(team_id);
      if (team) {
        targetCalendarName = `${team.name} Schedule`;
        feedPath = `/api/calendar/${team.id}.ics`;
      }
    }

    const host = req.headers.host || `localhost:${PORT}`;
    const protocol = req.protocol;
    const webcalUrl = `webcal://${host}${feedPath}`;
    const httpIcsUrl = `${protocol}://${host}${feedPath}`;

    const inviteDetails = {
      recipient: { name, email, relationship },
      calendarName: targetCalendarName,
      webcalUrl,
      httpIcsUrl,
      sentAt: new Date().toISOString(),
      message: `Hi ${name}, you've been invited to subscribe to the ${targetCalendarName}! Whenever games are scheduled, rescheduled, or cancelled, your phone or computer calendar will stay automatically in sync.`
    };

    console.log(`[INVITE DISPATCHED] To: ${email} (${name}) for ${targetCalendarName}`);

    res.json({
      success: true,
      subscriber: sub,
      inviteDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subscribers/:id', (req, res) => {
  try {
    db.deleteSubscriber(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SETTINGS API
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const geminiKey = db.getSetting('gemini_api_key') || process.env.GEMINI_API_KEY || '';
    const maskedKey = geminiKey ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : '';
    res.json({
      hasGeminiKey: Boolean(geminiKey),
      maskedKey
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { gemini_api_key } = req.body;
    if (gemini_api_key !== undefined) {
      db.setSetting('gemini_api_key', gemini_api_key.trim());
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SERVE FRONTEND (in production / after build)
// -------------------------------------------------------------
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 GameSync Hub Server running at http://localhost:${PORT}`);
  console.log(`📅 Family Calendar Feed: http://localhost:${PORT}/api/calendar/family.ics`);
});
