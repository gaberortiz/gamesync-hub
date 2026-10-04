import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Shirt,
  ExternalLink,
  Edit2,
  Trash2,
  Trophy,
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  Plus,
  Settings,
  Navigation,
  Sparkles,
  Share2
} from 'lucide-react';

export default function GameList({
  games,
  selectedTeam,
  onEditGame,
  onDeleteGame,
  onOpenScoreModal,
  onOpenAddGame,
  onOpenShare,
  onEditTeam,
  isAdmin,
  onOpenLogin
}) {
  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'past', 'all'
  const [search, setSearch] = useState('');

  // Format date helper: "2026-10-10" -> { month: "OCT", day: "10", weekday: "Sat", full: "Saturday, Oct 10, 2026" }
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

  // Format 24h time to 12h: "09:00" -> "9:00 AM"
  function format12h(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  // Calculate arrival time: 9:00 AM minus 30 mins = 8:30 AM
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
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0) return 'Completed';
    return target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Filter by search query
  const searchedGames = games.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      g.opponent?.toLowerCase().includes(q) ||
      g.venue_name?.toLowerCase().includes(q) ||
      g.field_court?.toLowerCase().includes(q) ||
      g.team_name?.toLowerCase().includes(q) ||
      g.uniform_notes?.toLowerCase().includes(q)
    );
  });

  // 2. Separate and sort by recency
  // Upcoming games: Sorted closest/earliest first
  const upcomingGames = searchedGames
    .filter((g) => g.game_date >= todayStr && g.status !== 'Completed')
    .sort((a, b) => {
      if (a.game_date !== b.game_date) return a.game_date.localeCompare(b.game_date);
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

  // Past games: Sorted most recent first (descending)
  const pastGames = searchedGames
    .filter((g) => g.game_date < todayStr || g.status === 'Completed')
    .sort((a, b) => {
      if (a.game_date !== b.game_date) return b.game_date.localeCompare(a.game_date);
      return (b.start_time || '').localeCompare(a.start_time || '');
    });

  // All games: Chronological
  const allSortedGames = [...searchedGames].sort((a, b) => {
    if (a.game_date !== b.game_date) return a.game_date.localeCompare(b.game_date);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const nextGame = upcomingGames.length > 0 ? upcomingGames[0] : null;

  const filteredGames =
    filter === 'upcoming'
      ? upcomingGames
      : filter === 'past'
      ? pastGames
      : allSortedGames;

  return (
    <div className="space-y-6">
      {/* Team Context Banner if a team is selected */}
      {selectedTeam && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5"
            style={{ backgroundColor: selectedTeam.color || '#18181b' }}
          />
          <div className="pl-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {selectedTeam.sport}
              </span>
              {selectedTeam.season && (
                <span className="text-[11px] text-zinc-400">&bull; {selectedTeam.season}</span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight mt-0.5">
              {selectedTeam.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 mt-1">
              {selectedTeam.child_name && (
                <span>Player: <strong className="font-medium text-zinc-800">{selectedTeam.child_name}</strong></span>
              )}
              <span>Warm-up buffer: <strong className="font-medium text-zinc-800">{selectedTeam.default_arrival_buffer_mins || 30} mins</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-1 sm:pl-0">
            {isAdmin && (
              <button
                onClick={() => onEditTeam && onEditTeam(selectedTeam)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition flex items-center gap-1.5"
                title="Edit team settings"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span>Team Settings</span>
              </button>
            )}
            <button
              onClick={onOpenShare}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition shadow-xs flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-zinc-300" />
              <span>Sync to Calendar</span>
            </button>
          </div>
        </div>
      )}

      {/* SPOTLIGHT: NEXT GAME UP HERO CARD */}
      {nextGame && filter === 'upcoming' && !search.trim() && (
        <div className="bg-zinc-950 text-white rounded-2xl border border-zinc-800/80 p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all">
          {/* Subtle ambient lighting */}
          <div className="absolute right-0 top-0 -mt-12 -mr-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Eyebrow: Next Up Tag + Relative Badge */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Next Up
              </span>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-md text-white"
                style={{ backgroundColor: nextGame.team_color || '#3b82f6' }}
              >
                {nextGame.team_name}
              </span>
              {nextGame.child_name && (
                <span className="text-[11px] text-zinc-400 hidden sm:inline">
                  ({nextGame.child_name})
                </span>
              )}
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-900 text-amber-300 border border-zinc-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{getRelativeDayLabel(nextGame.game_date)}</span>
            </span>
          </div>

          {/* Matchup & Date */}
          <div className="space-y-1">
            <div className="text-xs text-zinc-400 font-medium">
              {parseGameDate(nextGame.game_date).full} &bull; <span className="text-zinc-200 font-semibold">{format12h(nextGame.start_time)}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-baseline gap-2">
              <span className="text-zinc-500 font-normal text-lg">{nextGame.is_home ? 'vs' : '@'}</span>
              <span>{nextGame.opponent}</span>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-800/80 px-2 py-0.5 rounded-md ml-1">
                {nextGame.is_home ? 'Home' : 'Away'}
              </span>
            </h2>
          </div>

          {/* Minimal Info Bar */}
          <div className="mt-4 pt-3.5 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {nextGame.arrival_buffer_mins && (
              <div className="bg-zinc-900/60 rounded-xl p-2.5 flex items-center gap-2.5 border border-zinc-800/60">
                <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-zinc-400 text-[10px] block uppercase font-medium">Warmup Arrival</span>
                  <span className="text-zinc-100 font-semibold">
                    {calculateArrivalTime(nextGame.start_time, nextGame.arrival_buffer_mins)} <span className="text-zinc-400 font-normal">({nextGame.arrival_buffer_mins}m buffer)</span>
                  </span>
                </div>
              </div>
            )}

            <div className="bg-zinc-900/60 rounded-xl p-2.5 flex items-center justify-between border border-zinc-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-zinc-400 text-[10px] block uppercase font-medium">Venue</span>
                  <span className="text-zinc-100 font-semibold truncate block">
                    {nextGame.venue_name || 'Complex'} {nextGame.field_court ? `• ${nextGame.field_court}` : ''}
                  </span>
                </div>
              </div>

              {(nextGame.venue_name || nextGame.map_url) && (
                <a
                  href={
                    nextGame.map_url ||
                    `https://maps.google.com/?q=${encodeURIComponent(`${nextGame.venue_name || ''} ${nextGame.address || ''}`)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg text-xs font-medium transition flex items-center gap-1 flex-shrink-0 active:scale-95"
                >
                  <Navigation className="w-3 h-3 text-zinc-900" />
                  <span>Directions</span>
                </a>
              )}
            </div>
          </div>

          {/* Uniform Note & Admin Tools */}
          <div className="mt-3 flex items-center justify-between text-xs">
            {nextGame.uniform_notes ? (
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Shirt className="w-3.5 h-3.5 text-zinc-400" />
                <span>Uniform: <strong className="text-zinc-200 font-medium">{nextGame.uniform_notes}</strong></span>
              </div>
            ) : <div />}

            {isAdmin && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  onClick={() => onOpenScoreModal(nextGame)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition"
                >
                  Score / Status
                </button>
                <button
                  onClick={() => onEditGame(nextGame)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Filter Segmented Control */}
        <div className="flex items-center space-x-1 bg-zinc-100/90 p-1 rounded-xl w-fit">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${
              filter === 'upcoming'
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 font-medium'
            }`}
          >
            Upcoming ({upcomingGames.length})
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${
              filter === 'past'
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 font-medium'
            }`}
          >
            Past & Scores ({pastGames.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs transition ${
              filter === 'all'
                ? 'bg-white text-zinc-900 font-semibold shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 font-medium'
            }`}
          >
            All ({allSortedGames.length})
          </button>
        </div>

        {/* Minimal Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opponent, venue..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200/80 bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition"
          />
        </div>
      </div>

      {/* Game Cards List */}
      {filteredGames.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-zinc-200 p-12 text-center">
          <div className="w-10 h-10 bg-zinc-100 text-zinc-500 rounded-xl flex items-center justify-center mx-auto mb-3">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-zinc-900 text-sm">No games found</h3>
          <p className="text-zinc-400 text-xs mt-1 max-w-sm mx-auto">
            {search
              ? 'No games matched your search criteria.'
              : filter === 'upcoming'
              ? 'No upcoming games scheduled on the calendar.'
              : 'No past games recorded yet.'}
          </p>
          <div className="mt-4">
            {isAdmin ? (
              <button
                onClick={onOpenAddGame}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Game</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium hover:bg-zinc-50 transition"
              >
                <span>Coach Login</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGames.map((game) => {
            const dateObj = parseGameDate(game.game_date);
            const arrivalTime = calculateArrivalTime(game.start_time, game.arrival_buffer_mins);
            const isCancelled = game.status === 'Rainout/Cancelled' || game.status === 'Cancelled';
            const isRescheduled = game.status === 'Rescheduled';
            const isCompleted = game.status === 'Completed';

            return (
              <div
                key={game.id}
                className={`bg-white rounded-2xl border transition-all duration-150 p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                  isCancelled
                    ? 'border-rose-200/80 bg-rose-50/20'
                    : isCompleted
                    ? 'border-zinc-200/60 bg-zinc-50/30'
                    : 'border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Minimal Typographic Date & Matchup Info */}
                  <div className="flex items-start space-x-4">
                    {/* Editorial Date Block */}
                    <div className="w-14 sm:w-16 flex flex-col items-center justify-center text-center flex-shrink-0 pt-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        {dateObj.month}
                      </span>
                      <span className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight leading-none my-0.5">
                        {dateObj.day}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400">
                        {dateObj.weekday}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="w-[1px] self-stretch bg-zinc-100 hidden sm:block" />

                    {/* Game Details */}
                    <div className="space-y-1 flex-1 min-w-0">
                      {/* Top Micro-Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Team Accent Pill */}
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 border border-zinc-200/60 px-2 py-0.5 rounded-md">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: game.team_color || '#3b82f6' }}
                          />
                          <span>{game.team_name}</span>
                        </span>

                        {/* Home / Away */}
                        <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                          {game.is_home ? 'Home' : 'Away'}
                        </span>

                        {/* Relative day pill for upcoming */}
                        {!isCompleted && !isCancelled && (
                          <span className="text-[10px] font-medium text-zinc-600 bg-zinc-50 border border-zinc-200/60 px-2 py-0.5 rounded-md">
                            {getRelativeDayLabel(game.game_date)}
                          </span>
                        )}

                        {/* Status Badges */}
                        {isCancelled && (
                          <span className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Rainout / Cancelled</span>
                          </span>
                        )}
                        {isRescheduled && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Rescheduled</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              game.outcome === 'Win'
                                ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                : game.outcome === 'Loss'
                                ? 'text-rose-700 bg-rose-50 border border-rose-200/60'
                                : 'text-zinc-700 bg-zinc-100'
                            }`}
                          >
                            <Trophy className="w-3 h-3" />
                            <span>
                              {game.outcome ? `${game.outcome} ` : 'Final '}
                              {game.home_score !== null && game.away_score !== null
                                ? `(${game.home_score} - ${game.away_score})`
                                : ''}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Opponent Heading */}
                      <h3 className="text-base font-semibold text-zinc-900 tracking-tight flex items-baseline gap-1.5">
                        <span className="text-zinc-400 font-normal text-xs">
                          {game.is_home ? 'vs' : '@'}
                        </span>
                        <span>{game.opponent}</span>
                      </h3>

                      {/* Time & Warmup */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <div className="flex items-center gap-1 text-zinc-700">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{format12h(game.start_time)} <span className="text-zinc-400">({game.duration_mins || 60}m)</span></span>
                        </div>

                        {arrivalTime && !isCancelled && !isCompleted && (
                          <div className="text-amber-800 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-md text-[11px] font-medium">
                            ⏰ Arrive {arrivalTime}
                          </div>
                        )}
                      </div>

                      {/* Venue & Field */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 pt-0.5">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                          <span className="text-zinc-700">{game.venue_name || 'TBD Venue'}</span>
                          {game.field_court && (
                            <span className="text-zinc-400">&bull; {game.field_court}</span>
                          )}
                        </div>
                      </div>

                      {/* Uniform note */}
                      {game.uniform_notes && (
                        <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/50 px-2 py-0.5 rounded-md mt-0.5">
                          <Shirt className="w-3 h-3 text-zinc-400" />
                          <span>Uniform: <strong className="text-zinc-800 font-medium">{game.uniform_notes}</strong></span>
                        </div>
                      )}

                      {/* Extra notes */}
                      {game.notes && (
                        <p className="text-xs text-zinc-400 italic">
                          "{game.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Clean Action Buttons */}
                  <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 flex-shrink-0">
                    {/* Directions Button */}
                    {(game.venue_name || game.map_url) && (
                      <a
                        href={
                          game.map_url ||
                          `https://maps.google.com/?q=${encodeURIComponent(`${game.venue_name || ''} ${game.address || ''}`)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Navigation className="w-3 h-3 text-zinc-500" />
                        <span>Directions</span>
                      </a>
                    )}

                    {/* Google Calendar Link */}
                    {game.google_calendar_url && (
                      <a
                        href={game.google_calendar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200/80 hover:bg-zinc-50 text-zinc-600 text-xs font-medium transition flex items-center justify-center gap-1.5"
                        title="Add to Google Calendar"
                      >
                        <CalendarIcon className="w-3 h-3 text-zinc-400" />
                        <span>Google Cal</span>
                      </a>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 pt-1">
                        <button
                          onClick={() => onOpenScoreModal(game)}
                          className="px-2 py-1 rounded-md border border-zinc-200 text-zinc-700 text-xs font-medium hover:bg-zinc-50 transition"
                          title="Update score or status"
                        >
                          Score / Status
                        </button>
                        <button
                          onClick={() => onEditGame(game)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition"
                          title="Edit Game"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteGame(game.id)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Game"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
