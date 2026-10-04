import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Calendar,
  Clock,
  MapPin,
  Shirt,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  Download,
  Share2,
  Trophy,
  XCircle,
  AlertTriangle,
  Navigation,
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function PublicSchedule({ teamId }) {
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(teamId || 'all');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const origin = window.location.origin;
  const isAll = selectedTeamId === 'all';
  const feedPath = isAll ? '/api/calendar/family.ics' : `/api/calendar/${selectedTeamId}.ics`;
  const httpIcsUrl = `${origin}${feedPath}`;
  const webcalUrl = httpIcsUrl.replace(/^https?:\/\//, 'webcal://');
  const googleCalSubscribeUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(httpIcsUrl)}`;

  useEffect(() => {
    fetchData();
  }, [selectedTeamId]);

  useEffect(() => {
    QRCode.toDataURL(webcalUrl, { width: 220, margin: 1.5 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [webcalUrl]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [tRes, gRes] = await Promise.all([
        fetch('/api/teams'),
        fetch(selectedTeamId && selectedTeamId !== 'all' ? `/api/games?teamId=${selectedTeamId}` : '/api/games')
      ]);
      if (tRes.ok) setTeams(await tRes.json());
      if (gRes.ok) setGames(await gRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Family Sports Schedule',
          text: 'View and subscribe to our live game schedule:',
          url: window.location.href
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  }

  // Format date helper
  function parseGameDate(dateStr) {
    if (!dateStr) return { month: 'TBD', day: '--', weekday: '', full: '' };
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    };
  }

  function format12h(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  function calculateArrivalTime(timeStr, bufferMins) {
    if (!timeStr || !bufferMins) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = h * 60 + m - bufferMins;
    if (totalMins < 0) return null;
    const arrH = Math.floor(totalMins / 60);
    const arrM = totalMins % 60;
    const ampm = arrH >= 12 ? 'PM' : 'AM';
    const hour = arrH % 12 || 12;
    return `${hour}:${String(arrM).padStart(2, '0')} ${ampm}`;
  }

  // Relative day label (e.g. "Today", "Tomorrow", "In 3 days", "Past")
  function getRelativeDayLabel(dateStr) {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '🔥 Today';
    if (diffDays === 1) return '⚡ Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `📅 In ${diffDays} days`;
    if (diffDays < 0) return 'Completed';
    return target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Separate upcoming vs past games
  const upcomingGames = games
    .filter((g) => g.game_date >= todayStr && g.status !== 'Completed')
    .sort((a, b) => {
      if (a.game_date !== b.game_date) return a.game_date.localeCompare(b.game_date);
      return a.start_time.localeCompare(b.start_time);
    });

  const pastGames = games
    .filter((g) => g.game_date < todayStr || g.status === 'Completed')
    .sort((a, b) => {
      // Past games: Most recent first!
      if (a.game_date !== b.game_date) return b.game_date.localeCompare(a.game_date);
      return b.start_time.localeCompare(a.start_time);
    });

  const nextGame = upcomingGames.length > 0 ? upcomingGames[0] : null;

  const displayGames =
    activeTab === 'upcoming'
      ? upcomingGames
      : activeTab === 'past'
      ? pastGames
      : [...upcomingGames, ...pastGames];

  const currentTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                Family Game Schedule
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">Auto-Updating Spectator Hub</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5 active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Add to Phone</span>
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition border border-slate-200"
              title="Share page"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Team Filter Pills */}
        <div className="max-w-3xl mx-auto px-4 pb-2.5 pt-1 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedTeamId('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition ${
              isAll ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🌟 All Teams
          </button>
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTeamId(t.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                selectedTeamId === t.id
                  ? 'border-transparent text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              style={{
                backgroundColor: selectedTeamId === t.id ? t.color || '#2563eb' : undefined
              }}
            >
              {t.name} {t.child_name ? `(${t.child_name})` : ''}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* HERO CARD: NEXT GAME UP (Prominently highlighted for parents!) */}
        {nextGame && activeTab === 'upcoming' && (
          <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Badge Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Next Game Up</span>
              </div>
              <span className="text-xs font-bold bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full shadow-sm">
                {getRelativeDayLabel(nextGame.game_date)}
              </span>
            </div>

            {/* Date & Opponent */}
            <div className="space-y-1">
              <div className="text-xs text-blue-200 font-semibold flex items-center space-x-2">
                <span>{parseGameDate(nextGame.game_date).full}</span>
                <span>&bull;</span>
                <span className="text-white font-bold">{format12h(nextGame.start_time)}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-baseline space-x-2">
                <span className="text-blue-200 text-lg font-medium">{nextGame.is_home ? 'vs' : '@'}</span>
                <span>{nextGame.opponent}</span>
              </h2>
              <div className="text-xs text-blue-100 flex items-center space-x-2 pt-0.5">
                <span
                  className="px-2 py-0.5 rounded-md font-bold text-[11px]"
                  style={{ backgroundColor: nextGame.team_color || '#2563eb' }}
                >
                  {nextGame.team_name}
                </span>
                {nextGame.child_name && <span>(Player: {nextGame.child_name})</span>}
                <span className="bg-white/20 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                  {nextGame.is_home ? 'HOME' : 'AWAY'}
                </span>
              </div>
            </div>

            {/* Warmup & Field Callouts */}
            <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {nextGame.arrival_buffer_mins && (
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <div>
                    <span className="text-slate-300 text-[10px] block font-semibold uppercase">Arrival / Warmup</span>
                    <strong className="text-white font-bold">
                      Arrive by {calculateArrivalTime(nextGame.start_time, nextGame.arrival_buffer_mins)} ({nextGame.arrival_buffer_mins}m buffer)
                    </strong>
                  </div>
                </div>
              )}

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  <MapPin className="w-4 h-4 text-rose-300 flex-shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-300 text-[10px] block font-semibold uppercase">Field / Venue</span>
                    <span className="text-white font-bold truncate block">
                      {nextGame.venue_name || 'Complex'} {nextGame.field_court ? `(${nextGame.field_court})` : ''}
                    </span>
                  </div>
                </div>

                <a
                  href={
                    nextGame.map_url ||
                    `https://maps.google.com/?q=${encodeURIComponent(`${nextGame.venue_name || ''} ${nextGame.address || ''}`)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-black shadow transition hover:bg-slate-100 flex items-center space-x-1 flex-shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Directions</span>
                </a>
              </div>
            </div>

            {/* Uniform Note */}
            {nextGame.uniform_notes && (
              <div className="mt-3 flex items-center space-x-2 text-xs bg-black/25 px-3 py-1.5 rounded-xl text-blue-100">
                <Shirt className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span>Uniform: <strong>{nextGame.uniform_notes}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* View Switcher: Upcoming vs Past / Recent */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'upcoming'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming ({upcomingGames.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'past'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past & Recent Scores ({pastGames.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({games.length})
            </button>
          </div>

          <span className="text-[11px] font-bold text-slate-500">
            {activeTab === 'past' ? 'Sorted: Newest First' : 'Sorted: Closest First'}
          </span>
        </div>

        {/* Game Cards List */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-xs">Loading game schedule...</div>
        ) : displayGames.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              {activeTab === 'upcoming' ? 'No Upcoming Games Scheduled' : 'No Past Games Recorded Yet'}
            </h3>
            <p className="text-xs text-slate-400">
              {activeTab === 'upcoming'
                ? 'Check back later or view past results.'
                : 'As games are played, their scores and results will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayGames.map((g) => {
              const dateObj = parseGameDate(g.game_date);
              const arrivalTime = calculateArrivalTime(g.start_time, g.arrival_buffer_mins);
              const isCancelled = g.status === 'Rainout/Cancelled' || g.status === 'Cancelled';
              const isRescheduled = g.status === 'Rescheduled';
              const isCompleted = g.status === 'Completed';

              return (
                <div
                  key={g.id}
                  className={`bg-white rounded-2xl border transition shadow-xs hover:shadow-md overflow-hidden ${
                    isCancelled
                      ? 'border-red-200 bg-red-50/25 opacity-85'
                      : isCompleted
                      ? 'border-slate-200 bg-slate-50/50'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Date + Main Info */}
                    <div className="flex items-start space-x-3.5 sm:space-x-4">
                      {/* Big Date Badge */}
                      <div
                        className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex-shrink-0 text-center font-bold border ${
                          isCancelled
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isCompleted
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-black opacity-75">{dateObj.month}</span>
                        <span className="text-xl sm:text-2xl font-black leading-none">{dateObj.day}</span>
                        <span className="text-[10px] font-bold opacity-75">{dateObj.weekday}</span>
                      </div>

                      {/* Matchup Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Status / Team Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: g.team_color || '#2563eb' }}
                          >
                            {g.team_name}
                          </span>

                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                              g.is_home ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {g.is_home ? 'HOME' : 'AWAY'}
                          </span>

                          {/* Relative day pill for upcoming games */}
                          {!isCompleted && !isCancelled && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                              {getRelativeDayLabel(g.game_date)}
                            </span>
                          )}

                          {isCancelled && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center space-x-1">
                              <XCircle className="w-3 h-3 text-red-600" />
                              <span>Rainout / Cancelled</span>
                            </span>
                          )}

                          {isCompleted && (
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                                g.outcome === 'Win' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              <Trophy className="w-3 h-3 text-amber-600" />
                              <span>
                                {g.outcome ? `${g.outcome.toUpperCase()} ` : 'FINAL '}
                                {g.home_score !== null && g.away_score !== null ? `(${g.home_score} - ${g.away_score})` : ''}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Matchup */}
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-baseline space-x-1.5">
                          <span className="text-slate-400 font-medium text-sm">{g.is_home ? 'vs' : '@'}</span>
                          <span>{g.opponent}</span>
                        </h3>

                        {/* Time & Arrival */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <div className="flex items-center space-x-1 font-semibold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Game Time: {format12h(g.start_time)}</span>
                          </div>
                          {arrivalTime && !isCancelled && !isCompleted && (
                            <div className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-bold text-[11px] border border-amber-200/60">
                              ⏰ Arrive: <strong>{arrivalTime}</strong>
                            </div>
                          )}
                        </div>

                        {/* Field & Venue */}
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 pt-0.5">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            <span className="font-semibold text-slate-800">{g.venue_name || 'TBD Venue'}</span>
                            {g.field_court && (
                              <span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                {g.field_court}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Uniform Note */}
                        {g.uniform_notes && (
                          <div className="inline-flex items-center space-x-1 text-xs text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md mt-1">
                            <Shirt className="w-3 h-3 text-indigo-500" />
                            <span>Uniform: <strong>{g.uniform_notes}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: One-Touch Directions & Map Button */}
                    <div className="flex items-center sm:flex-col justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-shrink-0">
                      <a
                        href={
                          g.map_url ||
                          `https://maps.google.com/?q=${encodeURIComponent(`${g.venue_name || ''} ${g.address || ''}`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center space-x-1.5 w-full sm:w-auto"
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-600" />
                        <span>Map & Directions</span>
                      </a>

                      {!isCompleted && g.google_calendar_url && (
                        <a
                          href={g.google_calendar_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-[11px] font-semibold transition flex items-center justify-center space-x-1 w-full sm:w-auto"
                        >
                          <span>+ Add to Cal</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Subscribe to Calendar</h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Subscribe once on your phone or laptop. Whenever game times or fields change, your calendar stays automatically up to date!
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={webcalUrl}
                className="py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold text-center hover:bg-slate-800 transition shadow-sm"
              >
                🍎 Apple Calendar
              </a>
              <a
                href={googleCalSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold text-center hover:bg-blue-700 transition shadow-sm"
              >
                📅 Google Calendar
              </a>
            </div>

            <div className="pt-2 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Or Scan with Camera
              </span>
              {qrDataUrl && (
                <div className="inline-block p-2 bg-slate-50 rounded-2xl border border-slate-200">
                  <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 mx-auto" />
                </div>
              )}
            </div>

            <div className="flex items-center bg-slate-100 rounded-xl p-1.5 text-xs">
              <input
                type="text"
                readOnly
                value={webcalUrl}
                className="w-full font-mono px-2 bg-transparent focus:outline-none text-slate-600 select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1 bg-white text-slate-800 rounded-lg font-bold shadow-sm"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={() => setShowSyncModal(false)}
              className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
