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
  Settings
} from 'lucide-react';

export default function GameList({
  games,
  selectedTeam,
  onEditGame,
  onDeleteGame,
  onOpenScoreModal,
  onOpenAddGame,
  onOpenShare,
  onEditTeam
}) {
  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'all', 'past'
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

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredGames = games.filter((g) => {
    // Search match
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        g.opponent?.toLowerCase().includes(q) ||
        g.venue_name?.toLowerCase().includes(q) ||
        g.field_court?.toLowerCase().includes(q) ||
        g.team_name?.toLowerCase().includes(q) ||
        g.uniform_notes?.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filter === 'upcoming') {
      return g.game_date >= todayStr && g.status !== 'Completed';
    }
    if (filter === 'past') {
      return g.game_date < todayStr || g.status === 'Completed';
    }
    return true; // all
  });

  return (
    <div className="space-y-6">
      {/* Team Context Banner if a team is selected */}
      {selectedTeam ? (
        <div
          className="rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          style={{ backgroundColor: selectedTeam.color || '#2563eb' }}
        >
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                {selectedTeam.sport}
              </span>
              {selectedTeam.season && (
                <span className="text-xs font-medium bg-black/20 px-2 py-0.5 rounded-full">
                  {selectedTeam.season}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black mt-1 tracking-tight">{selectedTeam.name}</h2>
            <div className="text-sm opacity-90 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {selectedTeam.child_name && (
                <span>Player: <strong className="font-semibold">{selectedTeam.child_name}</strong></span>
              )}
              <span>Warm-up Buffer: <strong className="font-semibold">{selectedTeam.default_arrival_buffer_mins || 30} mins early</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEditTeam && onEditTeam(selectedTeam)}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-sm transition flex items-center space-x-1.5 active:scale-95 border border-white/20"
              title="Edit team settings, colors, arrival buffers, and details"
            >
              <Settings className="w-4 h-4" />
              <span>Edit Team</span>
            </button>
            <button
              onClick={onOpenShare}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-bold shadow-md hover:bg-slate-100 transition active:scale-95"
            >
              Sync Calendar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Family Master Calendar
            </span>
            <h2 className="text-2xl font-black mt-1 tracking-tight">All Family Sports Schedules</h2>
            <p className="text-sm text-blue-100 mt-1">
              All games across every child and team synchronized into one master calendar feed.
            </p>
          </div>
          <button
            onClick={onOpenShare}
            className="px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-bold shadow-md hover:bg-slate-100 transition active:scale-95 whitespace-nowrap"
          >
            Get Master Calendar Link
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              filter === 'upcoming'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming Games
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              filter === 'past'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Past & Completed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Games ({games.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opponent, venue, jersey..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
          />
        </div>
      </div>

      {/* Game Cards List */}
      {filteredGames.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No games found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            {search
              ? 'No games matched your search criteria.'
              : filter === 'upcoming'
              ? 'No upcoming games scheduled. Upload a schedule or add a game to get started!'
              : 'No past games recorded yet.'}
          </p>
          <div className="mt-4">
            <button
              onClick={onOpenAddGame}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Game Manually</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredGames.map((game) => {
            const dateObj = parseGameDate(game.game_date);
            const arrivalTime = calculateArrivalTime(game.start_time, game.arrival_buffer_mins);
            const isCancelled = game.status === 'Rainout/Cancelled' || game.status === 'Cancelled';
            const isRescheduled = game.status === 'Rescheduled';
            const isCompleted = game.status === 'Completed';

            return (
              <div
                key={game.id}
                className={`bg-white rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden ${
                  isCancelled
                    ? 'border-red-200 bg-red-50/20 opacity-85'
                    : isCompleted
                    ? 'border-slate-200 bg-slate-50/30'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left Side: Date Box & Main Details */}
                  <div className="flex items-start space-x-4">
                    {/* Date Block */}
                    <div
                      className={`flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex-shrink-0 text-center font-bold border ${
                        isCancelled
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : isCompleted
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                    >
                      <span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold opacity-75">
                        {dateObj.month}
                      </span>
                      <span className="text-2xl sm:text-3xl font-black leading-none my-0.5">
                        {dateObj.day}
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold opacity-75">
                        {dateObj.weekday}
                      </span>
                    </div>

                    {/* Game Details */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Team Badge */}
                        <span
                          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: game.team_color || '#2563eb' }}
                        >
                          {game.team_name}
                        </span>

                        {/* Home / Away */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            game.is_home
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {game.is_home ? 'HOME' : 'AWAY'}
                        </span>

                        {/* Status Badge */}
                        {isCancelled && (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 flex items-center space-x-1">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>Rainout / Cancelled</span>
                          </span>
                        )}
                        {isRescheduled && (
                          <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Rescheduled</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span
                            className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                              game.outcome === 'Win'
                                ? 'bg-emerald-100 text-emerald-800'
                                : game.outcome === 'Loss'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            <Trophy className="w-3 h-3" />
                            <span>
                              {game.outcome ? `${game.outcome.toUpperCase()} ` : 'FINAL '}
                              {game.home_score !== null && game.away_score !== null
                                ? `(${game.home_score} - ${game.away_score})`
                                : ''}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Opponent Heading */}
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                        <span className="text-slate-500 font-medium text-sm">
                          {game.is_home ? 'vs' : '@'}
                        </span>
                        <span>{game.opponent}</span>
                      </h3>

                      {/* Time & Arrival Buffer */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <div className="flex items-center space-x-1 font-semibold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Game Time: {format12h(game.start_time)} ({game.duration_mins || 60}m)</span>
                        </div>

                        {arrivalTime && !isCancelled && (
                          <div className="flex items-center space-x-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-semibold border border-amber-200/60">
                            <span>⏰ Arrive by <strong>{arrivalTime}</strong> ({game.arrival_buffer_mins}m warmup)</span>
                          </div>
                        )}
                      </div>

                      {/* Venue & Field */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {game.venue_name || 'TBD Venue'}
                          </span>
                          {game.field_court && (
                            <span className="text-slate-500 font-medium">
                              ({game.field_court})
                            </span>
                          )}
                        </div>

                        {game.map_url || game.venue_name ? (
                          <a
                            href={
                              game.map_url ||
                              `https://maps.google.com/?q=${encodeURIComponent(
                                `${game.venue_name || ''} ${game.address || ''}`
                              )}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            <span>Open Map</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : null}
                      </div>

                      {/* Uniform / Jersey Notes */}
                      {game.uniform_notes && (
                        <div className="inline-flex items-center space-x-1 text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md mt-1">
                          <Shirt className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Uniform: <strong>{game.uniform_notes}</strong></span>
                        </div>
                      )}

                      {/* Extra notes */}
                      {game.notes && (
                        <p className="text-xs text-slate-500 italic mt-1">
                          "{game.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Quick Action Buttons */}
                  <div className="flex sm:flex-col items-center justify-end gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 flex-shrink-0">
                    <button
                      onClick={() => onOpenScoreModal(game)}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center space-x-1"
                      title="Update score or report rainout/reschedule"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isCompleted ? 'Edit Score' : 'Score / Status'}</span>
                    </button>

                    {game.google_calendar_url && (
                      <a
                        href={game.google_calendar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition flex items-center justify-center space-x-1"
                        title="Add this single game to your Google Calendar"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add to Google Cal</span>
                      </a>
                    )}

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditGame(game)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                        title="Edit Game"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteGame(game.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Game"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
