const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'gamesync.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      child_name TEXT,
      season TEXT,
      color TEXT DEFAULT '#2563eb',
      default_arrival_buffer_mins INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      opponent TEXT NOT NULL,
      is_home INTEGER DEFAULT 1,
      game_date TEXT NOT NULL, -- YYYY-MM-DD
      start_time TEXT NOT NULL, -- HH:MM (24h)
      duration_mins INTEGER DEFAULT 75,
      arrival_buffer_mins INTEGER DEFAULT 30,
      venue_name TEXT,
      field_court TEXT,
      address TEXT,
      map_url TEXT,
      uniform_notes TEXT,
      status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Rainout/Cancelled, Rescheduled
      home_score INTEGER,
      away_score INTEGER,
      outcome TEXT, -- Win, Loss, Tie, or null
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      team_id TEXT, -- null means all teams / whole family
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      relationship TEXT,
      invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed sample data if teams table is empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM teams').get();
  if (countRow.count === 0) {
    seedInitialData();
  }
}

function seedInitialData() {
  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, sport, child_name, season, color, default_arrival_buffer_mins)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertTeam.run('team-soccer-1', 'Strikers U10', 'Soccer', 'Liam', 'Fall 2026', '#2563eb', 30);
  insertTeam.run('team-softball-1', 'Lightning 8U', 'Softball', 'Emma', 'Fall 2026', '#d97706', 45);

  const insertGame = db.prepare(`
    INSERT INTO games (
      id, team_id, opponent, is_home, game_date, start_time, duration_mins,
      arrival_buffer_mins, venue_name, field_court, address, map_url,
      uniform_notes, status, home_score, away_score, outcome, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Today is Oct 2026 in metadata, let's seed upcoming games
  insertGame.run(
    'game-1',
    'team-soccer-1',
    'Thunder FC',
    1,
    '2026-10-10',
    '09:00',
    60,
    30,
    'Riverside Community Park',
    'Field 3 (East side)',
    '1240 River Rd, Austin, TX 78701',
    'https://maps.google.com/?q=Riverside+Community+Park+Austin+TX',
    'Wear Blue Home Jersey + Navy Socks. Bring extra water!',
    'Scheduled',
    null,
    null,
    null,
    'Liam is starting at midfield. Snack duty: Miller Family.'
  );

  insertGame.run(
    'game-2',
    'team-soccer-1',
    'Galaxy United',
    0,
    '2026-10-17',
    '10:30',
    60,
    30,
    'Memorial High Stadium Fields',
    'Upper Turf Field B',
    '500 Stadium Dr, Austin, TX 78703',
    'https://maps.google.com/?q=Memorial+High+School+Austin+TX',
    'Wear White Away Jersey + Navy Socks',
    'Scheduled',
    null,
    null,
    null,
    'Away game. Parking fills up quickly near gate 2.'
  );

  insertGame.run(
    'game-3',
    'team-soccer-1',
    'Red Bulls Academy',
    1,
    '2026-10-03',
    '09:00',
    60,
    30,
    'Riverside Community Park',
    'Field 1',
    '1240 River Rd, Austin, TX 78701',
    'https://maps.google.com/?q=Riverside+Community+Park+Austin+TX',
    'Wear Blue Home Jersey',
    'Completed',
    4,
    2,
    'Win',
    'Great season opener! Liam scored 2 goals.'
  );

  insertGame.run(
    'game-4',
    'team-softball-1',
    'Fireballs 8U',
    1,
    '2026-10-11',
    '13:00',
    75,
    45,
    'Sunset Youth Sports Complex',
    'Diamond 2',
    '880 Sunset Blvd, Austin, TX 78704',
    'https://maps.google.com/?q=Sunset+Youth+Sports+Complex+Austin+TX',
    'Wear Gold Game Jersey + Black Pants & Gold Socks',
    'Scheduled',
    null,
    null,
    null,
    'Batting cage warm-ups start prompt at 12:15 PM.'
  );

  insertGame.run(
    'game-5',
    'team-softball-1',
    'Tornadoes 8U',
    0,
    '2026-10-18',
    '14:30',
    75,
    45,
    'Oak Hill Ballpark',
    'Field 4',
    '3100 Oak Hill Pkwy, Austin, TX 78735',
    'https://maps.google.com/?q=Oak+Hill+Ballpark+Austin+TX',
    'Wear Black Alternate Jersey',
    'Scheduled',
    null,
    null,
    null,
    'Bring batting helmets and gear bag.'
  );

  // Seed sample subscriber
  const insertSub = db.prepare(`
    INSERT INTO subscribers (id, team_id, name, email, relationship)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertSub.run('sub-1', null, 'Grandma Rose', 'grandma.rose@example.com', 'Grandmother');
  insertSub.run('sub-2', 'team-soccer-1', 'Uncle Dave', 'uncle.dave@example.com', 'Uncle');
}

initDatabase();

module.exports = {
  db,
  // Helper queries
  getTeams: () => db.prepare('SELECT * FROM teams ORDER BY name ASC').all(),
  getTeamById: (id) => db.prepare('SELECT * FROM teams WHERE id = ?').get(id),
  createTeam: (team) => {
    const stmt = db.prepare(`
      INSERT INTO teams (id, name, sport, child_name, season, color, default_arrival_buffer_mins)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(team.id, team.name, team.sport, team.child_name || '', team.season || '', team.color || '#2563eb', team.default_arrival_buffer_mins || 30);
    return team;
  },
  updateTeam: (id, team) => {
    const stmt = db.prepare(`
      UPDATE teams
      SET name = ?, sport = ?, child_name = ?, season = ?, color = ?, default_arrival_buffer_mins = ?
      WHERE id = ?
    `);
    stmt.run(team.name, team.sport, team.child_name || '', team.season || '', team.color || '#2563eb', team.default_arrival_buffer_mins || 30, id);
    return db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  },
  deleteTeam: (id) => db.prepare('DELETE FROM teams WHERE id = ?').run(id),

  getGames: (teamId) => {
    if (teamId) {
      return db.prepare(`
        SELECT g.*, t.name as team_name, t.sport, t.child_name, t.color as team_color
        FROM games g
        JOIN teams t ON g.team_id = t.id
        WHERE g.team_id = ?
        ORDER BY g.game_date ASC, g.start_time ASC
      `).all(teamId);
    }
    return db.prepare(`
      SELECT g.*, t.name as team_name, t.sport, t.child_name, t.color as team_color
      FROM games g
      JOIN teams t ON g.team_id = t.id
      ORDER BY g.game_date ASC, g.start_time ASC
    `).all();
  },
  getGameById: (id) => db.prepare(`
    SELECT g.*, t.name as team_name, t.sport, t.child_name, t.color as team_color
    FROM games g
    JOIN teams t ON g.team_id = t.id
    WHERE g.id = ?
  `).get(id),
  createGame: (g) => {
    const stmt = db.prepare(`
      INSERT INTO games (
        id, team_id, opponent, is_home, game_date, start_time, duration_mins,
        arrival_buffer_mins, venue_name, field_court, address, map_url,
        uniform_notes, status, home_score, away_score, outcome, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      g.id, g.team_id, g.opponent, g.is_home !== undefined ? (g.is_home ? 1 : 0) : 1,
      g.game_date, g.start_time, g.duration_mins || 60, g.arrival_buffer_mins || 30,
      g.venue_name || '', g.field_court || '', g.address || '', g.map_url || '',
      g.uniform_notes || '', g.status || 'Scheduled', g.home_score !== undefined ? g.home_score : null,
      g.away_score !== undefined ? g.away_score : null, g.outcome || null, g.notes || ''
    );
    return g;
  },
  updateGame: (id, g) => {
    const stmt = db.prepare(`
      UPDATE games SET
        team_id = ?, opponent = ?, is_home = ?, game_date = ?, start_time = ?,
        duration_mins = ?, arrival_buffer_mins = ?, venue_name = ?, field_court = ?,
        address = ?, map_url = ?, uniform_notes = ?, status = ?, home_score = ?,
        away_score = ?, outcome = ?, notes = ?
      WHERE id = ?
    `);
    stmt.run(
      g.team_id, g.opponent, g.is_home ? 1 : 0, g.game_date, g.start_time,
      g.duration_mins, g.arrival_buffer_mins, g.venue_name, g.field_court,
      g.address, g.map_url, g.uniform_notes, g.status, g.home_score,
      g.away_score, g.outcome, g.notes, id
    );
    return db.prepare('SELECT * FROM games WHERE id = ?').get(id);
  },
  deleteGame: (id) => db.prepare('DELETE FROM games WHERE id = ?').run(id),

  getSubscribers: (teamId) => {
    if (teamId) {
      return db.prepare('SELECT * FROM subscribers WHERE team_id = ? OR team_id IS NULL ORDER BY invited_at DESC').all(teamId);
    }
    return db.prepare('SELECT * FROM subscribers ORDER BY invited_at DESC').all();
  },
  createSubscriber: (sub) => {
    const stmt = db.prepare('INSERT INTO subscribers (id, team_id, name, email, relationship) VALUES (?, ?, ?, ?, ?)');
    stmt.run(sub.id, sub.team_id || null, sub.name, sub.email, sub.relationship || '');
    return sub;
  },
  deleteSubscriber: (id) => db.prepare('DELETE FROM subscribers WHERE id = ?').run(id),

  getSetting: (key) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  },
  setSetting: (key, value) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, value);
    return value;
  }
};
