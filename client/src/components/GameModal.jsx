import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Shirt, AlertCircle } from 'lucide-react';

export default function GameModal({ isOpen, onClose, gameToEdit, teams, selectedTeamId, onSaveGame }) {
  if (!isOpen) return null;

  const defaultTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];

  const [teamId, setTeamId] = useState(gameToEdit?.team_id || defaultTeam?.id || '');
  const [opponent, setOpponent] = useState(gameToEdit?.opponent || '');
  const [isHome, setIsHome] = useState(gameToEdit ? Boolean(gameToEdit.is_home) : true);
  const [gameDate, setGameDate] = useState(gameToEdit?.game_date || new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(gameToEdit?.start_time || '09:00');
  const [durationMins, setDurationMins] = useState(gameToEdit?.duration_mins || 60);
  const [arrivalBufferMins, setArrivalBufferMins] = useState(
    gameToEdit?.arrival_buffer_mins || defaultTeam?.default_arrival_buffer_mins || 30
  );
  const [venueName, setVenueName] = useState(gameToEdit?.venue_name || '');
  const [fieldCourt, setFieldCourt] = useState(gameToEdit?.field_court || '');
  const [address, setAddress] = useState(gameToEdit?.address || '');
  const [mapUrl, setMapUrl] = useState(gameToEdit?.map_url || '');
  const [uniformNotes, setUniformNotes] = useState(gameToEdit?.uniform_notes || '');
  const [notes, setNotes] = useState(gameToEdit?.notes || '');
  const [status, setStatus] = useState(gameToEdit?.status || 'Scheduled');

  // When team changes, update default buffer
  function handleTeamChange(newTeamId) {
    setTeamId(newTeamId);
    const tm = teams.find((t) => t.id === newTeamId);
    if (tm && !gameToEdit) {
      setArrivalBufferMins(tm.default_arrival_buffer_mins || 30);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!opponent || !gameDate || !startTime) return;

    let computedMapUrl = mapUrl;
    if (!computedMapUrl && (venueName || address)) {
      computedMapUrl = `https://maps.google.com/?q=${encodeURIComponent(`${venueName} ${address}`.trim())}`;
    }

    const payload = {
      team_id: teamId,
      opponent,
      is_home: isHome,
      game_date: gameDate,
      start_time: startTime,
      duration_mins: parseInt(durationMins, 10) || 60,
      arrival_buffer_mins: parseInt(arrivalBufferMins, 10) || 30,
      venue_name: venueName,
      field_court: fieldCourt,
      address,
      map_url: computedMapUrl,
      uniform_notes: uniformNotes,
      status,
      notes
    };

    if (gameToEdit?.id) {
      payload.id = gameToEdit.id;
    }

    onSaveGame(payload);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-base">
              {gameToEdit ? 'Edit Game Details' : 'Add New Game'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Team Selector & Opponent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Team</label>
              <select
                value={teamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.sport})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Opponent</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. Thunder FC"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Home / Away & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Home / Away</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsHome(true)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    isHome
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Home (vs)
                </button>
                <button
                  type="button"
                  onClick={() => setIsHome(false)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    !isHome
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  Away (@)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Game Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Rainout/Cancelled">Rainout / Cancelled</option>
                <option value="Rescheduled">Rescheduled</option>
              </select>
            </div>
          </div>

          {/* Date & Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Game Date</label>
              <input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Time (24h)</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Duration & Warmup Arrival Buffer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Game Duration (Mins)</label>
              <input
                type="number"
                min="30"
                max="240"
                step="15"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pre-game Arrival Buffer</label>
              <select
                value={arrivalBufferMins}
                onChange={(e) => setArrivalBufferMins(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="15">15 mins before</option>
                <option value="30">30 mins before (Standard)</option>
                <option value="45">45 mins before (Batting/Warmup)</option>
                <option value="60">60 mins before</option>
              </select>
            </div>
          </div>

          {/* Venue & Field */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Park / Complex Name</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Riverside Community Park"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Field / Court #</label>
              <input
                type="text"
                value={fieldCourt}
                onChange={(e) => setFieldCourt(e.target.value)}
                placeholder="e.g. Field 3 (East Side)"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Address or City</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 1240 River Rd, Austin, TX 78701"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Uniform Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Uniform / Jersey Color</label>
            <input
              type="text"
              value={uniformNotes}
              onChange={(e) => setUniformNotes(e.target.value)}
              placeholder="e.g. Wear Blue Home Jersey + Navy Socks"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Extra Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes (Snack duty, carpool, etc.)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Liam starting at midfield. Snack duty: Miller Family."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
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
              {gameToEdit ? 'Save Changes' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
