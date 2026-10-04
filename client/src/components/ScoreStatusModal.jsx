import React, { useState } from 'react';
import { X, Trophy, AlertTriangle, XCircle, CheckCircle, Clock } from 'lucide-react';

export default function ScoreStatusModal({ isOpen, onClose, game, onSave }) {
  if (!isOpen || !game) return null;

  const [status, setStatus] = useState(game.status || 'Scheduled');
  const [homeScore, setHomeScore] = useState(game.home_score !== null && game.home_score !== undefined ? game.home_score : '');
  const [awayScore, setAwayScore] = useState(game.away_score !== null && game.away_score !== undefined ? game.away_score : '');
  const [outcome, setOutcome] = useState(game.outcome || 'Win');
  const [gameDate, setGameDate] = useState(game.game_date || '');
  const [startTime, setStartTime] = useState(game.start_time || '');
  const [notes, setNotes] = useState(game.notes || '');

  function handleScoreChange(h, a) {
    setHomeScore(h);
    setAwayScore(a);
    if (h !== '' && a !== '') {
      const hNum = parseInt(h, 10);
      const aNum = parseInt(a, 10);
      if (game.is_home) {
        if (hNum > aNum) setOutcome('Win');
        else if (hNum < aNum) setOutcome('Loss');
        else setOutcome('Tie');
      } else {
        // We are away team
        if (aNum > hNum) setOutcome('Win');
        else if (aNum < hNum) setOutcome('Loss');
        else setOutcome('Tie');
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const updated = {
      ...game,
      status,
      game_date: gameDate,
      start_time: startTime,
      notes,
      home_score: status === 'Completed' && homeScore !== '' ? parseInt(homeScore, 10) : null,
      away_score: status === 'Completed' && awayScore !== '' ? parseInt(awayScore, 10) : null,
      outcome: status === 'Completed' ? outcome : null
    };

    onSave(updated);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-base">Update Game Score & Status</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <div className="text-xs text-slate-500 font-semibold mb-1">Matchup</div>
            <div className="font-bold text-slate-800 text-sm">
              {game.team_name} {game.is_home ? 'vs' : '@'} {game.opponent}
            </div>
            <div className="text-xs text-slate-500">
              {game.venue_name} {game.field_court ? `(${game.field_court})` : ''}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Game Status</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Scheduled')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  status === 'Scheduled'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Scheduled
              </button>

              <button
                type="button"
                onClick={() => setStatus('Completed')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  status === 'Completed'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Completed
              </button>

              <button
                type="button"
                onClick={() => setStatus('Rainout/Cancelled')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  status === 'Rainout/Cancelled'
                    ? 'bg-red-50 border-red-400 text-red-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Rainout / Cancelled
              </button>

              <button
                type="button"
                onClick={() => setStatus('Rescheduled')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                  status === 'Rescheduled'
                    ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Rescheduled
              </button>
            </div>
          </div>

          {/* If Rescheduled, show date/time pickers */}
          {status === 'Rescheduled' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-amber-900 flex items-center space-x-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Set New Game Date & Time</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-amber-800 mb-1">New Date</label>
                  <input
                    type="date"
                    value={gameDate}
                    onChange={(e) => setGameDate(e.target.value)}
                    className="w-full p-2 text-xs border border-amber-300 rounded-lg bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-800 mb-1">New Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2 text-xs border border-amber-300 rounded-lg bg-white"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* If Completed, show Score & Outcome */}
          {status === 'Completed' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-slate-700">Final Score & Result</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {game.is_home ? `${game.team_name} (Home)` : `${game.team_name} (Away)`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={game.is_home ? homeScore : awayScore}
                    onChange={(e) => {
                      if (game.is_home) handleScoreChange(e.target.value, awayScore);
                      else handleScoreChange(homeScore, e.target.value);
                    }}
                    placeholder="e.g. 4"
                    className="w-full p-2 text-sm font-bold border border-slate-300 rounded-xl bg-white text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {game.is_home ? `${game.opponent} (Away)` : `${game.opponent} (Home)`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={game.is_home ? awayScore : homeScore}
                    onChange={(e) => {
                      if (game.is_home) handleScoreChange(homeScore, e.target.value);
                      else handleScoreChange(e.target.value, awayScore);
                    }}
                    placeholder="e.g. 2"
                    className="w-full p-2 text-sm font-bold border border-slate-300 rounded-xl bg-white text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Result Outcome</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Win', 'Loss', 'Tie'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setOutcome(opt)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition border ${
                        outcome === opt
                          ? opt === 'Win'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : opt === 'Loss'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Game Notes / Highlights</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Liam scored 2 goals in 2nd half! Snack duty was great."
              className="w-full p-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              Save Updates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
