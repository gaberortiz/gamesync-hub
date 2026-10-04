/**
 * GameSync Hub - Unified API Client
 * Supports:
 * 1. Google Apps Script Web App (Free Google Drive & Google Sheets backend for GitHub Pages)
 * 2. Local Node/Express server (/api/*) when running locally
 */

const STORAGE_KEYS = {
  SCRIPT_URL: 'gamesync_script_url',
  ADMIN_TOKEN: 'gamesync_admin_token',
  GEMINI_KEY: 'gamesync_gemini_key'
};

export function getScriptUrl() {
  return localStorage.getItem(STORAGE_KEYS.SCRIPT_URL) || '';
}

export function setScriptUrl(url) {
  if (!url) {
    localStorage.removeItem(STORAGE_KEYS.SCRIPT_URL);
  } else {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url.trim());
  }
}

export function getGeminiKey() {
  return localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
}

export function setGeminiKey(key) {
  if (!key) {
    localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
  } else {
    localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, key.trim());
  }
}

export function isUsingGoogleSheets() {
  return Boolean(getScriptUrl());
}

// -------------------------------------------------------------
// CORE API CALLS
// -------------------------------------------------------------
export async function apiFetchTeams() {
  const scriptUrl = getScriptUrl();
  if (scriptUrl) {
    const res = await fetch(`${scriptUrl}?action=getTeams`);
    if (!res.ok) throw new Error('Failed to load teams from Google Sheets');
    return await res.json();
  }

  // Fallback to local server
  const res = await fetch('/api/teams');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return await res.json();
}

export async function apiFetchGames(teamId = null) {
  const scriptUrl = getScriptUrl();
  if (scriptUrl) {
    const url = `${scriptUrl}?action=getGames${teamId && teamId !== 'all' ? `&teamId=${teamId}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load games from Google Sheets');
    return await res.json();
  }

  // Fallback to local server
  const url = teamId && teamId !== 'all' ? `/api/games?teamId=${teamId}` : '/api/games';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch games');
  return await res.json();
}

export async function apiSaveGame(gameData) {
  const scriptUrl = getScriptUrl();
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';

  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveGame',
        game: gameData,
        token
      })
    });
    if (!res.ok) throw new Error('Failed to save game to Google Sheets');
    return await res.json();
  }

  // Fallback to local server
  const isEditing = Boolean(gameData.id);
  const url = isEditing ? `/api/games/${gameData.id}` : '/api/games';
  const method = isEditing ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token
    },
    body: JSON.stringify(gameData)
  });

  if (res.status === 401) throw { status: 401, message: 'Admin passcode required.' };
  if (!res.ok) throw new Error('Failed to save game');
  return await res.json();
}

export async function apiDeleteGame(gameId) {
  const scriptUrl = getScriptUrl();
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';

  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'deleteGame',
        id: gameId,
        token
      })
    });
    if (!res.ok) throw new Error('Failed to delete game from Google Sheets');
    return await res.json();
  }

  const res = await fetch(`/api/games/${gameId}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token }
  });

  if (res.status === 401) throw { status: 401, message: 'Admin passcode required.' };
  if (!res.ok) throw new Error('Failed to delete game');
  return await res.json();
}

export async function apiBatchGames(teamId, games) {
  const scriptUrl = getScriptUrl();
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';

  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'batchGames',
        team_id: teamId,
        games,
        token
      })
    });
    if (!res.ok) throw new Error('Failed to save batch to Google Sheets');
    return await res.json();
  }

  const res = await fetch('/api/games/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token
    },
    body: JSON.stringify({ team_id: teamId, games })
  });

  if (res.status === 401) throw { status: 401, message: 'Admin passcode required.' };
  if (!res.ok) throw new Error('Failed to save games batch');
  return await res.json();
}

export async function apiSaveTeam(teamData) {
  const scriptUrl = getScriptUrl();
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';

  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveTeam',
        team: teamData,
        token
      })
    });
    if (!res.ok) throw new Error('Failed to save team to Google Sheets');
    return await res.json();
  }

  const isEditing = Boolean(teamData.id);
  const url = isEditing ? `/api/teams/${teamData.id}` : '/api/teams';
  const method = isEditing ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token
    },
    body: JSON.stringify(teamData)
  });

  if (res.status === 401) throw { status: 401, message: 'Admin passcode required.' };
  if (!res.ok) throw new Error('Failed to save team');
  return await res.json();
}

export async function apiDeleteTeam(teamId) {
  const scriptUrl = getScriptUrl();
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';

  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'deleteTeam',
        id: teamId,
        token
      })
    });
    if (!res.ok) throw new Error('Failed to delete team from Google Sheets');
    return await res.json();
  }

  const res = await fetch(`/api/teams/${teamId}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': token }
  });

  if (res.status === 401) throw { status: 401, message: 'Admin passcode required.' };
  if (!res.ok) throw new Error('Failed to delete team');
  return await res.json();
}

export async function apiLogin(password) {
  const scriptUrl = getScriptUrl();
  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', password })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Invalid passcode');
    return data;
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Invalid passcode');
  return data;
}

export async function apiChangePassword(newPassword) {
  const scriptUrl = getScriptUrl();
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN) || '';

  if (scriptUrl) {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({ action: 'changePassword', newPassword, token })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to change passcode');
    return data;
  }

  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': token
    },
    body: JSON.stringify({ newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to change passcode');
  return data;
}

export function getCalendarFeedUrl(teamId = null) {
  const scriptUrl = getScriptUrl();
  if (scriptUrl) {
    if (teamId && teamId !== 'all' && teamId !== 'family') {
      return `${scriptUrl}?action=calendar&teamId=${teamId}`;
    }
    return `${scriptUrl}?action=calendar`;
  }

  const origin = window.location.origin;
  if (teamId && teamId !== 'all' && teamId !== 'family') {
    return `${origin}/api/calendar/${teamId}.ics`;
  }
  return `${origin}/api/calendar/family.ics`;
}
