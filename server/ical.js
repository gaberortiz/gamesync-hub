/**
 * RFC 5545 iCalendar generator for GameSync Hub
 * Supports both static .ics download and live auto-updating webcal:// feeds.
 */

function formatICalDateTime(dateStr, timeStr) {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr ? timeStr.replace(/:/g, '') + '00' : '000000';
  return `${cleanDate}T${cleanTime}`;
}

function addMinutes(dateStr, timeStr, minutes) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  date.setMinutes(date.getMinutes() + minutes);

  const pad = (n) => String(n).padStart(2, '0');
  const newDateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const newTimeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return { dateStr: newDateStr, timeStr: newTimeStr };
}

function escapeICalText(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function generateICalFeed({ calendarName, games }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GameSync Hub//Sports Calendar Sync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calendarName || 'Game Schedule')}`,
    'X-WR-CALDESC:Youth sports game schedule synced via GameSync Hub',
    'X-PUBLISHED-TTL:PT1H', // Advise calendar clients to refresh hourly
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H'
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const game of games) {
    const isCancelled = game.status === 'Rainout/Cancelled' || game.status === 'Cancelled';
    const isRescheduled = game.status === 'Rescheduled';

    let summaryPrefix = '';
    if (isCancelled) summaryPrefix = '[CANCELLED] ';
    else if (isRescheduled) summaryPrefix = '[RESCHEDULED] ';

    const homeAwayStr = game.is_home ? 'vs' : '@';
    const summary = `${summaryPrefix}${game.team_name || 'Team'} ${homeAwayStr} ${game.opponent} (${game.sport || 'Game'})`;

    const startDateTime = formatICalDateTime(game.game_date, game.start_time);
    const end = addMinutes(game.game_date, game.start_time, game.duration_mins || 75);
    const endDateTime = formatICalDateTime(end.dateStr, end.timeStr);

    let location = game.venue_name || '';
    if (game.field_court) {
      location += location ? ` - ${game.field_court}` : game.field_court;
    }
    if (game.address) {
      location += location ? ` (${game.address})` : game.address;
    }

    // Build rich description
    const descParts = [];
    descParts.push(`🏆 ${game.sport || 'Sports'} Game: ${game.team_name} ${homeAwayStr} ${game.opponent}`);
    if (game.child_name) descParts.push(`Player: ${game.child_name}`);
    if (game.arrival_buffer_mins) {
      descParts.push(`⏰ Arrive Early: ${game.arrival_buffer_mins} mins before game time for warm-ups`);
    }
    if (game.uniform_notes) {
      descParts.push(`🎽 Uniform / Jersey: ${game.uniform_notes}`);
    }
    if (game.field_court) {
      descParts.push(`📍 Field / Court: ${game.field_court}`);
    }
    if (game.map_url) {
      descParts.push(`🗺️ Map Link: ${game.map_url}`);
    }
    if (game.status && game.status !== 'Scheduled') {
      descParts.push(`⚠️ Status: ${game.status}`);
    }
    if (game.home_score !== null && game.away_score !== null && game.home_score !== undefined) {
      const outcomeText = game.outcome ? ` (${game.outcome})` : '';
      descParts.push(`📊 Final Score: ${game.home_score} - ${game.away_score}${outcomeText}`);
    }
    if (game.notes) {
      descParts.push(`📝 Notes: ${game.notes}`);
    }
    descParts.push(`\nManaged with GameSync Hub`);

    const description = descParts.join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:gamesync-${game.id}@gamesynchub.local`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${startDateTime}`);
    lines.push(`DTEND:${endDateTime}`);
    lines.push(`SUMMARY:${escapeICalText(summary)}`);
    lines.push(`DESCRIPTION:${escapeICalText(description)}`);
    if (location) {
      lines.push(`LOCATION:${escapeICalText(location)}`);
    }
    lines.push(isCancelled ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED');

    // Add pre-game arrival alert if arrival_buffer_mins is set
    if (game.arrival_buffer_mins && !isCancelled) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${escapeICalText(`Arrival Reminder: ${game.team_name} warmup in ${game.arrival_buffer_mins} minutes`)}`);
      lines.push(`TRIGGER:-PT${game.arrival_buffer_mins}M`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate a direct web URL to add event to Google Calendar
 */
function createGoogleCalendarUrl(game) {
  const isCancelled = game.status === 'Rainout/Cancelled' || game.status === 'Cancelled';
  const prefix = isCancelled ? '[CANCELLED] ' : '';
  const homeAway = game.is_home ? 'vs' : '@';
  const title = encodeURIComponent(`${prefix}${game.team_name || 'Team'} ${homeAway} ${game.opponent}`);

  const startIso = formatICalDateTime(game.game_date, game.start_time);
  const end = addMinutes(game.game_date, game.start_time, game.duration_mins || 75);
  const endIso = formatICalDateTime(end.dateStr, end.timeStr);
  const dates = `${startIso}/${endIso}`;

  let location = game.venue_name || '';
  if (game.field_court) location += ` - ${game.field_court}`;
  if (game.address) location += `, ${game.address}`;

  const details = encodeURIComponent(
    `Team: ${game.team_name || ''}\nOpponent: ${game.opponent}\nUniform: ${game.uniform_notes || 'Standard'}\nArrival: Arrive ${game.arrival_buffer_mins || 30} mins early\nNotes: ${game.notes || ''}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${encodeURIComponent(location)}`;
}

module.exports = {
  generateICalFeed,
  createGoogleCalendarUrl
};
