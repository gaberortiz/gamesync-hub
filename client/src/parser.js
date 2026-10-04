/**
 * Client-Side Schedule Parser
 * Supports Gemini 3.5 Flash (direct from browser) and Heuristic regex parsing
 */

import { getGeminiKey } from './api';

export async function parseScheduleClientSide({ file, text, url, defaultYear = 2026 }) {
  const apiKey = getGeminiKey() || import.meta.env.VITE_GEMINI_API_KEY || '';

  let contentToParse = text || '';
  let fileBase64 = null;
  let fileMimeType = null;

  if (file) {
    fileMimeType = file.type;
    fileBase64 = await readFileAsBase64(file);
    // If it's a text/csv file, also decode the text
    if (file.type.includes('text') || file.type.includes('csv')) {
      contentToParse = await readFileAsText(file);
    }
  }

  // 1. Try Gemini 3.5 Flash Multimodal
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const aiGames = await callGeminiMultimodal({
        apiKey: apiKey.trim(),
        fileBase64,
        fileMimeType,
        text: contentToParse,
        defaultYear
      });
      if (aiGames && aiGames.length > 0) {
        return aiGames;
      }
    } catch (err) {
      console.warn('Gemini client-side parse error, falling back:', err);
    }
  }

  // 2. Fallback heuristic parsing for text/CSV
  if (contentToParse) {
    const heuristicGames = parseHeuristicText(contentToParse, defaultYear);
    if (heuristicGames.length > 0) {
      return heuristicGames;
    }
  }

  // 3. Fallback starter game row so user is never blocked
  return [
    {
      game_date: `${defaultYear}-10-15`,
      start_time: '09:00',
      duration_mins: 60,
      arrival_buffer_mins: 30,
      opponent: 'Opponent Team',
      is_home: true,
      venue_name: 'Community Park',
      field_court: 'Field 1',
      uniform_notes: 'Home Jersey',
      notes: ''
    }
  ];
}

async function callGeminiMultimodal({ apiKey, fileBase64, fileMimeType, text, defaultYear }) {
  const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const prompt = `You are an expert sports schedule extractor. Analyze the provided game schedule (which may be a photo, screenshot, PDF, CSV, table, or email) and extract ALL individual games.
Current year fallback is ${defaultYear}.

Return ONLY valid JSON matching this exact structure:
{
  "games": [
    {
      "game_date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "duration_mins": 60,
      "opponent": "Opponent Team Name",
      "is_home": true,
      "venue_name": "Park or Complex Name",
      "field_court": "Field or Court #",
      "address": "Street Address or City",
      "arrival_buffer_mins": 30,
      "uniform_notes": "Jersey color or uniform notes",
      "notes": "Any other relevant details"
    }
  ]
}

Formatting rules:
- Extract EVERY single game in the schedule (do not skip any rows or dates).
- Format game_date strictly as YYYY-MM-DD.
- Format start_time in 24-hour HH:MM (e.g. 09:00, 14:30).
- If home/away is unknown, look for "vs" (Home) or "@" (Away). Default is_home to true.
- Default duration_mins to 60.
- Default arrival_buffer_mins to 30.
- Return ONLY the JSON object, do not wrap in commentary.`;

      const parts = [{ text: prompt }];

      if (fileBase64 && fileMimeType) {
        // Strip data:image/...;base64, prefix
        const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
        parts.push({
          inlineData: {
            mimeType: fileMimeType,
            data: base64Data
          }
        });
      }

      if (text) {
        parts.push({
          text: `Schedule text content:\n${text}`
        });
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini error (${response.status}): ${errText}`);
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini');

      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON object found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.games)) {
        return parsed.games;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to parse with Gemini');
}

function parseHeuristicText(text, defaultYear) {
  const games = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const dateRegex = /(?:(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?)|(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:[,\s]+(\d{4}))?)/i;
  const timeRegex = /(?:(\d{1,2}):(\d{2})\s*(am|pm)?)|(?:(\d{1,2})\s*(am|pm))/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(dateRegex);
    if (!dateMatch) continue;

    let year = defaultYear;
    let month = '10';
    let day = '15';

    if (dateMatch[1] && dateMatch[2]) {
      month = dateMatch[1].padStart(2, '0');
      day = dateMatch[2].padStart(2, '0');
      if (dateMatch[3]) year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
    } else if (dateMatch[4] && dateMatch[5]) {
      const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
      month = months[dateMatch[4].toLowerCase().slice(0, 3)] || '10';
      day = dateMatch[5].padStart(2, '0');
      if (dateMatch[6]) year = dateMatch[6];
    }

    let time = '09:00';
    const timeMatch = line.match(timeRegex);
    if (timeMatch) {
      if (timeMatch[1] && timeMatch[2]) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2];
        const ampm = timeMatch[3]?.toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        time = `${String(h).padStart(2, '0')}:${m}`;
      }
    }

    let opponent = 'Opponent Team';
    const isHome = !line.includes('@');
    const vsMatch = line.match(/(?:vs\.?|@|\bagainst\b)\s+([A-Za-z0-9\s\-]+?)(?:,|\bat\b|\bfield\b|\btime\b|$)/i);
    if (vsMatch && vsMatch[1]) {
      opponent = vsMatch[1].trim();
    }

    games.push({
      game_date: `${year}-${month}-${day}`,
      start_time: time,
      duration_mins: 60,
      arrival_buffer_mins: 30,
      opponent,
      is_home: isHome,
      venue_name: 'Community Park',
      field_court: 'Field 1',
      uniform_notes: isHome ? 'Home Jersey' : 'Away Jersey',
      notes: ''
    });
  }

  return games;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
