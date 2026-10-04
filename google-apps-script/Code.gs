/**
 * GameSync Hub - Google Apps Script Backend (Serverless & Free)
 * 
 * Acts as the free API & Database backend for GameSync Hub hosted on GitHub Pages.
 * Data is stored in your Google Spreadsheet in Google Drive.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet in Google Drive (name it "GameSync Hub Database").
 * 2. Click "Extensions" > "Apps Script".
 * 3. Delete any code in the editor and paste this entire file.
 * 4. Click "Deploy" > "New deployment".
 * 5. Click the gear icon next to "Select type" and choose "Web app".
 * 6. Set Description: "GameSync Hub API"
 * 7. Set "Execute as": "Me"
 * 8. Set "Who has access": "Anyone"  <-- CRITICAL for your website & calendar feeds!
 * 9. Click "Deploy", authorize permissions when prompted.
 * 10. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...)
 * 11. Paste that URL into GameSync Hub Settings > Google Sheet Connection!
 */

// -------------------------------------------------------------
// INITIALIZATION & SHEET HELPERS
// -------------------------------------------------------------
function getDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Ensure Teams sheet exists
  let teamsSheet = ss.getSheetByName('Teams');
  if (!teamsSheet) {
    teamsSheet = ss.insertSheet('Teams');
    teamsSheet.appendRow(['id', 'name', 'sport', 'child_name', 'season', 'color', 'default_arrival_buffer_mins', 'created_at']);
    // Seed default teams
    teamsSheet.appendRow(['team-1', 'Orange High', 'Soccer', 'Gabriel Ortiz', 'Fall 2026', '#d97706', 45, new Date().toISOString()]);
    teamsSheet.appendRow(['team-2', 'Lightning 8U', 'Softball', 'Emma', 'Fall 2026', '#2563eb', 30, new Date().toISOString()]);
  }

  // Ensure Games sheet exists
  let gamesSheet = ss.getSheetByName('Games');
  if (!gamesSheet) {
    gamesSheet = ss.insertSheet('Games');
    gamesSheet.appendRow([
      'id', 'team_id', 'opponent', 'game_date', 'start_time',
      'duration_mins', 'arrival_buffer_mins', 'is_home', 'venue_name',
      'field_court', 'address', 'map_url', 'uniform_notes', 'status',
      'home_score', 'away_score', 'outcome', 'notes', 'created_at'
    ]);
    // Seed initial game
    gamesSheet.appendRow([
      'game-seed-1', 'team-1', 'Cedar Ridge', '2026-10-05', '18:45',
      80, 30, 0, 'Cedar Ridge High School', '', '', '', 'Away Jersey', 'Scheduled',
      '', '', '', 'Conference game', new Date().toISOString()
    ]);
  }

  // Ensure Settings sheet exists
  let settingsSheet = ss.getSheetByName('Settings');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('Settings');
    settingsSheet.appendRow(['key', 'value']);
    settingsSheet.appendRow(['admin_password', 'coach2026']);
    settingsSheet.appendRow(['gemini_api_key', '']);
  }

  return { ss, teamsSheet, gamesSheet, settingsSheet };
}

function getRowsAsObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    headers.forEach((h, colIndex) => {
      let val = data[i][colIndex];
      // Format Dates or standard types
      if (val instanceof Date) {
        if (h === 'game_date') {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } else {
          val = val.toISOString();
        }
      }
      row[h] = val;
    });
    // Cast types
    if (row.is_home !== undefined) row.is_home = row.is_home === true || row.is_home === 1 || String(row.is_home).toLowerCase() === 'true';
    if (row.duration_mins) row.duration_mins = Number(row.duration_mins) || 60;
    if (row.arrival_buffer_mins) row.arrival_buffer_mins = Number(row.arrival_buffer_mins) || 30;
    if (row.home_score !== '' && row.home_score !== null && !isNaN(row.home_score)) row.home_score = Number(row.home_score);
    else row.home_score = null;
    if (row.away_score !== '' && row.away_score !== null && !isNaN(row.away_score)) row.away_score = Number(row.away_score);
    else row.away_score = null;

    rows.push(row);
  }
  return rows;
}

function getSetting(key) {
  const { settingsSheet } = getDatabase();
  const rows = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) return rows[i][1];
  }
  return '';
}

function setSetting(key, val) {
  const { settingsSheet } = getDatabase();
  const rows = settingsSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) {
      settingsSheet.getRange(i + 1, 2).setValue(val);
      return;
    }
  }
  settingsSheet.appendRow([key, val]);
}

// -------------------------------------------------------------
// GET REQUESTS (Data fetching & Calendar Feeds)
// -------------------------------------------------------------
function doGet(e) {
  const params = e ? e.parameter : {};
  const action = params.action || 'ping';

  const { teamsSheet, gamesSheet } = getDatabase();

  // 1. iCalendar .ics Feed Subscription
  if (action === 'calendar' || action === 'ical' || params.feed === 'ical') {
    const teamId = params.teamId || null;
    return generateICalFeed(teamId);
  }

  // 2. Get Teams
  if (action === 'getTeams' || action === 'teams') {
    const teams = getRowsAsObjects(teamsSheet);
    const games = getRowsAsObjects(gamesSheet);
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    const enriched = teams.map(t => {
      const teamGames = games.filter(g => g.team_id === t.id);
      return {
        ...t,
        game_count: teamGames.length,
        upcoming_count: teamGames.filter(g => g.game_date >= today && g.status !== 'Completed').length
      };
    });
    return jsonResponse(enriched);
  }

  // 3. Get Games
  if (action === 'getGames' || action === 'games') {
    const teamId = params.teamId;
    const teams = getRowsAsObjects(teamsSheet);
    const teamMap = {};
    teams.forEach(t => { teamMap[t.id] = t; });

    let games = getRowsAsObjects(gamesSheet);
    if (teamId && teamId !== 'all') {
      games = games.filter(g => g.team_id === teamId);
    }

    const enriched = games.map(g => {
      const team = teamMap[g.team_id] || {};
      return {
        ...g,
        team_name: team.name || 'Team',
        team_color: team.color || '#2563eb',
        child_name: team.child_name || '',
        google_calendar_url: createGoogleCalendarUrl(g, team)
      };
    });
    return jsonResponse(enriched);
  }

  // 4. Get Settings
  if (action === 'getSettings') {
    const geminiKey = getSetting('gemini_api_key');
    return jsonResponse({
      hasGeminiKey: Boolean(geminiKey),
      maskedKey: geminiKey ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : ''
    });
  }

  // Ping / Diagnostic
  return jsonResponse({
    status: 'ok',
    app: 'GameSync Hub - Google Apps Script Backend',
    timestamp: new Date().toISOString()
  });
}

// -------------------------------------------------------------
// POST REQUESTS (Mutations: Games, Teams, Auth)
// -------------------------------------------------------------
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;
    const { teamsSheet, gamesSheet } = getDatabase();

    // 1. Auth Login
    if (action === 'login') {
      const currentPassword = getSetting('admin_password') || 'coach2026';
      if (payload.password === currentPassword) {
        return jsonResponse({ success: true, token: 'gas-token-' + Date.now() });
      }
      return jsonResponse({ error: 'Invalid passcode.' }, 401);
    }

    // 2. Change Password
    if (action === 'changePassword') {
      if (!payload.newPassword || payload.newPassword.trim().length < 4) {
        return jsonResponse({ error: 'Passcode must be at least 4 characters long.' }, 400);
      }
      setSetting('admin_password', payload.newPassword.trim());
      return jsonResponse({ success: true });
    }

    // 3. Save Settings (Gemini API Key)
    if (action === 'saveSettings') {
      if (payload.gemini_api_key !== undefined) {
        setSetting('gemini_api_key', payload.gemini_api_key.trim());
      }
      return jsonResponse({ success: true });
    }

    // 4. Save Game (Add or Update)
    if (action === 'saveGame') {
      const g = payload.game;
      if (!g) return jsonResponse({ error: 'Missing game payload' }, 400);
      const isNew = !g.id || String(g.id).startsWith('preview-');
      const gameId = isNew ? 'game-' + Date.now() + '-' + Math.floor(Math.random() * 1000) : g.id;

      const rowValues = [
        gameId,
        g.team_id || '',
        g.opponent || 'TBD',
        g.game_date || '',
        g.start_time || '09:00',
        Number(g.duration_mins) || 60,
        Number(g.arrival_buffer_mins) || 30,
        g.is_home ? 1 : 0,
        g.venue_name || '',
        g.field_court || '',
        g.address || '',
        g.map_url || '',
        g.uniform_notes || '',
        g.status || 'Scheduled',
        g.home_score !== undefined && g.home_score !== '' ? g.home_score : '',
        g.away_score !== undefined && g.away_score !== '' ? g.away_score : '',
        g.outcome || '',
        g.notes || '',
        new Date().toISOString()
      ];

      const games = gamesSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < games.length; i++) {
        if (String(games[i][0]) === String(gameId)) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex > -1) {
        gamesSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        gamesSheet.appendRow(rowValues);
      }
      return jsonResponse({ success: true, game: { ...g, id: gameId } });
    }

    // 5. Batch Import Games
    if (action === 'batchGames') {
      const teamId = payload.team_id;
      const games = payload.games || [];
      games.forEach(g => {
        const id = 'game-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
        gamesSheet.appendRow([
          id,
          teamId,
          g.opponent || 'TBD',
          g.game_date || '',
          g.start_time || '09:00',
          Number(g.duration_mins) || 60,
          Number(g.arrival_buffer_mins) || 30,
          g.is_home ? 1 : 0,
          g.venue_name || '',
          g.field_court || '',
          g.address || '',
          g.map_url || '',
          g.uniform_notes || '',
          'Scheduled',
          '', '', '',
          g.notes || '',
          new Date().toISOString()
        ]);
      });
      return jsonResponse({ success: true, count: games.length });
    }

    // 6. Delete Game
    if (action === 'deleteGame') {
      const gameId = payload.id;
      const data = gamesSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(gameId)) {
          gamesSheet.deleteRow(i + 1);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: true });
    }

    // 7. Save Team (Add or Update)
    if (action === 'saveTeam') {
      const t = payload.team;
      if (!t) return jsonResponse({ error: 'Missing team payload' }, 400);
      const isNew = !t.id;
      const teamId = isNew ? 'team-' + Date.now() : t.id;

      const rowValues = [
        teamId,
        t.name || '',
        t.sport || '',
        t.child_name || '',
        t.season || '',
        t.color || '#2563eb',
        Number(t.default_arrival_buffer_mins) || 30,
        new Date().toISOString()
      ];

      const teams = teamsSheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < teams.length; i++) {
        if (String(teams[i][0]) === String(teamId)) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex > -1) {
        teamsSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        teamsSheet.appendRow(rowValues);
      }
      return jsonResponse({ success: true, team: { ...t, id: teamId } });
    }

    // 8. Delete Team
    if (action === 'deleteTeam') {
      const teamId = payload.id;
      // Delete team
      const tData = teamsSheet.getDataRange().getValues();
      for (let i = 1; i < tData.length; i++) {
        if (String(tData[i][0]) === String(teamId)) {
          teamsSheet.deleteRow(i + 1);
          break;
        }
      }
      // Delete associated games
      const gData = gamesSheet.getDataRange().getValues();
      for (let i = gData.length - 1; i >= 1; i--) {
        if (String(gData[i][1]) === String(teamId)) {
          gamesSheet.deleteRow(i + 1);
        }
      }
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Unknown action: ' + action }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// -------------------------------------------------------------
// RFC 5545 iCALENDAR GENERATOR (For Apple / Google Calendar)
// -------------------------------------------------------------
function generateICalFeed(teamId) {
  const { teamsSheet, gamesSheet } = getDatabase();
  const teams = getRowsAsObjects(teamsSheet);
  const teamMap = {};
  teams.forEach(t => { teamMap[t.id] = t; });

  let games = getRowsAsObjects(gamesSheet);
  let calName = 'Family Sports Schedule';
  if (teamId && teamId !== 'all') {
    games = games.filter(g => g.team_id === teamId);
    if (teamMap[teamId]) {
      calName = teamMap[teamId].name + ' Schedule';
    }
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GameSync Hub//Google Sheets Live Sync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + calName,
    'X-WR-TIMEZONE:America/New_York',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H'
  ];

  games.forEach(g => {
    if (!g.game_date || !g.start_time) return;
    const team = teamMap[g.team_id] || {};
    const [y, m, d] = g.game_date.split('-').map(Number);
    const [h, min] = g.start_time.split(':').map(Number);
    
    // Start date UTC string
    const startObj = new Date(y, m - 1, d, h, min);
    const endObj = new Date(startObj.getTime() + (Number(g.duration_mins) || 60) * 60000);
    
    const dtStart = formatICalDate(startObj);
    const dtEnd = formatICalDate(endObj);
    const dtStamp = formatICalDate(new Date());

    let summary = (g.is_home ? 'vs ' : '@ ') + g.opponent;
    if (team.name) summary = team.name + ': ' + summary;
    if (g.status === 'Rainout/Cancelled' || g.status === 'Cancelled') summary = '[CANCELLED] ' + summary;

    let desc = 'GameSync Schedule Feed\\n';
    if (g.arrival_buffer_mins) desc += 'Warm-up: Arrive ' + g.arrival_buffer_mins + ' mins early\\n';
    if (g.uniform_notes) desc += 'Uniform: ' + g.uniform_notes + '\\n';
    if (g.field_court) desc += 'Field/Court: ' + g.field_court + '\\n';
    if (g.notes) desc += 'Notes: ' + g.notes + '\\n';

    const location = [g.venue_name, g.field_court, g.address].filter(Boolean).join(', ');

    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + (g.id || 'game-' + Date.now()) + '@gamesync.hub');
    lines.push('DTSTAMP:' + dtStamp);
    lines.push('DTSTART:' + dtStart);
    lines.push('DTEND:' + dtEnd);
    lines.push('SUMMARY:' + escapeICal(summary));
    if (desc) lines.push('DESCRIPTION:' + escapeICal(desc));
    if (location) lines.push('LOCATION:' + escapeICal(location));
    lines.push('STATUS:' + (g.status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED'));

    // 30-minute arrival reminder alarm
    const buffer = Number(g.arrival_buffer_mins) || 30;
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT' + buffer + 'M');
    lines.push('ACTION:DISPLAY');
    lines.push('DESCRIPTION:Warm-up Arrival Reminder: ' + escapeICal(summary));
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return ContentService.createTextOutput(lines.join('\r\n'))
    .setMimeType(ContentService.MimeType.ICAL);
}

function formatICalDate(date) {
  return Utilities.formatDate(date, 'UTC', "yyyyMMdd'T'HHmmss'Z'");
}

function escapeICal(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function createGoogleCalendarUrl(g, team) {
  if (!g.game_date || !g.start_time) return '';
  const [y, m, d] = g.game_date.split('-').map(Number);
  const [h, min] = g.start_time.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const end = new Date(start.getTime() + (Number(g.duration_mins) || 60) * 60000);
  const text = encodeURIComponent((team.name ? team.name + ': ' : '') + (g.is_home ? 'vs ' : '@ ') + g.opponent);
  const location = encodeURIComponent([g.venue_name, g.field_court, g.address].filter(Boolean).join(', '));
  const dates = formatICalDate(start) + '/' + formatICalDate(end);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + text + '&dates=' + dates + '&location=' + location;
}

function jsonResponse(data, status) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
