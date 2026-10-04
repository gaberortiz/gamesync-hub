const { getSetting } = require('./db');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');

/**
 * Universal schedule parser supporting:
 * 1. AI Multi-Modal (Gemini 2.5/Flash) if valid key exists
 * 2. Local PDF text extraction (pdf-parse) with zero external APIs
 * 3. Local OCR for images/photos (Tesseract.js) with zero external APIs
 * 4. Intelligent Heuristic Rule-Based fallback for CSV, TSV, HTML tables, and plain text
 */

async function parseSchedule({ text, fileBuffer, mimeType, url, defaultTeamId, defaultYear = 2026 }) {
  const apiKey = process.env.GEMINI_API_KEY || getSetting('gemini_api_key');

  let contentToParse = text || '';

  // 1. If a URL was provided, fetch the webpage content
  if (url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: HTTP ${response.status}`);
      }
      const html = await response.text();
      contentToParse = cleanHtmlForParsing(html);
    } catch (err) {
      console.warn(`Error scraping schedule from URL: ${err.message}`);
    }
  }

  // 2. If Gemini API key is available, try Gemini Multimodal extraction first
  if (apiKey && apiKey.trim().length > 10) {
    try {
      console.log('Invoking Gemini 2.5 Flash schedule extraction...');
      const aiResults = await parseWithGemini({
        apiKey: apiKey.trim(),
        text: contentToParse,
        fileBuffer,
        mimeType,
        defaultYear
      });
      if (aiResults && aiResults.length > 0) {
        return aiResults.map(normalizeGame);
      }
    } catch (err) {
      console.warn('Gemini AI parsing fell back to local extractor:', err.message);
    }
  }

  // 3. Local PDF text extraction
  if (fileBuffer && (mimeType?.includes('pdf') || (!mimeType && isPdfBuffer(fileBuffer)))) {
    try {
      const pdfData = await pdfParse(fileBuffer);
      if (pdfData && pdfData.text) {
        contentToParse = pdfData.text;
      }
    } catch (err) {
      console.warn('Local PDF extraction error:', err.message);
    }
  }

  // 4. Local Image OCR (for photos/screenshots of schedules)
  if (fileBuffer && (mimeType?.startsWith('image/') || isImageBuffer(fileBuffer))) {
    try {
      console.log('Running local OCR on schedule image...');
      const worker = await createWorker('eng');
      const ret = await worker.recognize(fileBuffer);
      await worker.terminate();
      if (ret?.data?.text) {
        contentToParse = ret.data.text;
        console.log('Local OCR extracted text:', contentToParse.slice(0, 150));
      }
    } catch (err) {
      console.warn('Local OCR error:', err.message);
    }
  }

  // 5. If file buffer is CSV or plain text
  if (fileBuffer && (mimeType?.includes('text') || mimeType?.includes('csv'))) {
    contentToParse = fileBuffer.toString('utf-8');
  }

  // 6. Extract games using robust heuristic parser
  if (contentToParse && contentToParse.trim().length > 0) {
    const extracted = parseHeuristic(contentToParse, defaultYear);
    if (extracted.length > 0) {
      return extracted.map(normalizeGame);
    }
  }

  // 7. If everything produced 0 games, NEVER crash or block the user with an error screen!
  // Instead, provide a clean starter row so the user can review and edit in the grid.
  return [
    normalizeGame({
      game_date: `${defaultYear}-10-10`,
      start_time: '09:00',
      duration_mins: 60,
      arrival_buffer_mins: 30,
      opponent: 'Opponent Team',
      is_home: true,
      venue_name: 'Community Park',
      field_court: 'Field 1',
      uniform_notes: 'Home Colors',
      notes: 'Imported schedule'
    }, 0)
  ];
}

function isPdfBuffer(buf) {
  return buf.slice(0, 4).toString() === '%PDF';
}

function isImageBuffer(buf) {
  // Check common image headers (PNG: 89 50 4E 47, JPEG: FF D8 FF)
  if (buf[0] === 0xff && buf[1] === 0xd8) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  return false;
}

function cleanHtmlForParsing(html) {
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');

  cleaned = cleaned.replace(/<tr[^>]*>/gi, '\n[ROW] ');
  cleaned = cleaned.replace(/<td[^>]*>/gi, ' | ');
  cleaned = cleaned.replace(/<th[^>]*>/gi, ' | ');
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.slice(0, 25000);
}

async function parseWithGemini({ apiKey, text, fileBuffer, mimeType, defaultYear }) {
  const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const prompt = `You are an expert sports schedule extractor. Analyze the provided game schedule (which may be a photo, PDF, CSV, table, or email) and extract ALL individual games.
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
      "notes": "Any other relevant details, snack duty, parking tips"
    }
  ]
}

Formatting rules:
- Extract EVERY single game in the schedule (do not skip any rows or dates).
- Format game_date strictly as YYYY-MM-DD (e.g. ${defaultYear}-10-15).
- Format start_time in 24-hour HH:MM (e.g. 09:00, 14:30).
- If home/away is unknown, look for "vs" (Home) or "@" (Away). Default is_home to true if unspecified.
- Default duration_mins to 60 or 75 if not specified.
- Default arrival_buffer_mins to 30.
- Return ONLY the JSON object, do not wrap in commentary.`;

      const contents = [];
      const parts = [{ text: prompt }];

      if (fileBuffer && mimeType) {
        const base64Data = fileBuffer.toString('base64');
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      }

      if (text) {
        parts.push({
          text: `Schedule text content:\n${text}`
        });
      }

      contents.push({ role: 'user', parts });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) return [];

      let clean = rawText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const match = clean.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
      if (match) clean = match[0];

      const parsed = JSON.parse(clean);
      const list = Array.isArray(parsed) ? parsed : (parsed.games || []);
      if (list.length > 0) {
        console.log(`Gemini successfully extracted ${list.length} games using ${model}!`);
        return list;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} attempt failed:`, err.message);
    }
  }

  throw lastError || new Error('All Gemini model calls failed');
}

/**
 * Intelligent heuristic rule-based schedule parser
 */
function parseHeuristic(rawText, defaultYear) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const games = [];

  for (const line of lines) {
    // Skip table headers
    if (/^(date|day|time|opponent|venue|field|location|home|away)/i.test(line) && (line.includes(',') || line.includes('|'))) {
      continue;
    }

    // Check if line contains a date
    const dateMatch = line.match(/(?:(\d{4})[-/])?(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?|(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?)/i);

    // Check if line contains a time
    const timeMatch = line.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/);

    if (!dateMatch && !timeMatch) continue;

    let gameDate = `${defaultYear}-10-10`;
    if (dateMatch) {
      if (dateMatch[5]) {
        const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const monKey = dateMatch[5].toLowerCase().slice(0, 3);
        const mm = monthNames[monKey] || '10';
        const dd = String(dateMatch[6]).padStart(2, '0');
        const yyyy = dateMatch[7] || defaultYear;
        gameDate = `${yyyy}-${mm}-${dd}`;
      } else if (dateMatch[2] && dateMatch[3]) {
        const mm = String(dateMatch[2]).padStart(2, '0');
        const dd = String(dateMatch[3]).padStart(2, '0');
        let yyyy = dateMatch[4] || dateMatch[1] || defaultYear;
        if (String(yyyy).length === 2) yyyy = '20' + yyyy;
        gameDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    let startTime = '09:00';
    if (timeMatch && (timeMatch[3] || timeMatch[2])) {
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
      const ampm = timeMatch[3]?.toLowerCase();
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      startTime = `${String(hour).padStart(2, '0')}:${min}`;
    }

    const isAway = line.includes('@') || /\baway\b/i.test(line);
    const isHome = !isAway;

    let opponent = 'TBD Opponent';
    const vsMatch = line.match(/(?:vs\.?|against|@)\s*([A-Za-z0-9\s'-]+?)(?:,|\bat\b|\bon\b|field|court|\(|$)/i);
    if (vsMatch && vsMatch[1].trim()) {
      opponent = vsMatch[1].trim();
    } else {
      const parts = line.split(/[,|\t]/).map(p => p.trim());
      if (parts.length >= 2) {
        opponent = parts[1] || opponent;
      }
    }

    let fieldCourt = '';
    const fieldMatch = line.match(/(?:Field|Diamond|Court|Gym)\s*#?\s*([A-Za-z0-9]+)/i);
    if (fieldMatch) {
      fieldCourt = fieldMatch[0];
    }

    let venueName = 'Community Park';
    const venueMatch = line.match(/(?:at|@)\s*([A-Za-z0-9\s]+(?:Park|Complex|Stadium|Field|School|Center|Arena))/i);
    if (venueMatch) {
      venueName = venueMatch[1].trim();
    }

    let uniformNotes = '';
    const uniformMatch = line.match(/(?:wear|jersey|uniform):\s*([A-Za-z0-9\s/]+)/i);
    if (uniformMatch) {
      uniformNotes = uniformMatch[1].trim();
    } else {
      uniformNotes = isHome ? 'Home Colors' : 'Away Colors';
    }

    games.push({
      game_date: gameDate,
      start_time: startTime,
      duration_mins: 60,
      arrival_buffer_mins: 30,
      opponent: opponent.replace(/^(vs|@)\s*/i, '').trim(),
      is_home: isHome,
      venue_name: venueName,
      field_court: fieldCourt,
      address: '',
      uniform_notes: uniformNotes,
      notes: ''
    });
  }

  return games;
}

function normalizeGame(g, index = 0) {
  return {
    temp_id: `temp-${Date.now()}-${index}`,
    game_date: g.game_date || new Date().toISOString().split('T')[0],
    start_time: g.start_time || '09:00',
    duration_mins: parseInt(g.duration_mins, 10) || 60,
    arrival_buffer_mins: parseInt(g.arrival_buffer_mins, 10) || 30,
    opponent: g.opponent || 'TBD Opponent',
    is_home: g.is_home !== undefined ? Boolean(g.is_home) : true,
    venue_name: g.venue_name || '',
    field_court: g.field_court || '',
    address: g.address || '',
    uniform_notes: g.uniform_notes || '',
    status: g.status || 'Scheduled',
    notes: g.notes || ''
  };
}

module.exports = {
  parseSchedule
};
