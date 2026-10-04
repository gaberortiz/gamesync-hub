import React, { useState, useEffect } from 'react';
import { X, Users, Trash2, Settings, ShieldAlert, Check } from 'lucide-react';

export default function TeamModal({ isOpen, onClose, teamToEdit, onSaveTeam, onDeleteTeam }) {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [sport, setSport] = useState('Soccer');
  const [childName, setChildName] = useState('');
  const [season, setSeason] = useState('Fall 2026');
  const [color, setColor] = useState('#2563eb');
  const [defaultArrivalBufferMins, setDefaultArrivalBufferMins] = useState(30);

  useEffect(() => {
    if (teamToEdit) {
      setName(teamToEdit.name || '');
      setSport(teamToEdit.sport || 'Soccer');
      setChildName(teamToEdit.child_name || '');
      setSeason(teamToEdit.season || 'Fall 2026');
      setColor(teamToEdit.color || '#2563eb');
      setDefaultArrivalBufferMins(teamToEdit.default_arrival_buffer_mins || 30);
    } else {
      setName('');
      setSport('Soccer');
      setChildName('');
      setSeason('Fall 2026');
      setColor('#2563eb');
      setDefaultArrivalBufferMins(30);
    }
  }, [teamToEdit, isOpen]);

  const predefinedColors = [
    '#2563eb', // Blue
    '#dc2626', // Red
    '#16a34a', // Green
    '#d97706', // Amber
    '#7c3aed', // Purple
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#475569'  // Slate
  ];

  function handleSubmit(e) {
    e.preventDefault();
    if (!name || !sport) return;

    onSaveTeam({
      ...(teamToEdit ? { id: teamToEdit.id } : {}),
      name,
      sport,
      child_name: childName,
      season,
      color,
      default_arrival_buffer_mins: parseInt(defaultArrivalBufferMins, 10) || 30
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {teamToEdit ? `Edit ${teamToEdit.name} Settings` : 'Add New Team'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {teamToEdit ? 'Modify team name, colors, buffer times, or player' : 'Create a new team for your child or sport'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Team Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Strikers U10, Lightning 8U"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sport</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Soccer">Soccer</option>
                <option value="Baseball">Baseball</option>
                <option value="Softball">Softball</option>
                <option value="Basketball">Basketball</option>
                <option value="Football">Football / Flag</option>
                <option value="Lacrosse">Lacrosse</option>
                <option value="Volleyball">Volleyball</option>
                <option value="Hockey">Hockey</option>
                <option value="Other">Other Sport</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Child / Player Name</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Liam, Emma"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Season</label>
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="e.g. Fall 2026, Spring 2027"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pre-game Warmup Buffer</label>
              <select
                value={defaultArrivalBufferMins}
                onChange={(e) => setDefaultArrivalBufferMins(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="15">15 mins early</option>
                <option value="30">30 mins early (Default)</option>
                <option value="45">45 mins early (Warmup)</option>
                <option value="60">60 mins early</option>
              </select>
            </div>
          </div>

          {/* Color Tag Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Team Color Theme</label>
            <div className="flex items-center space-x-2">
              {predefinedColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition transform ${
                    color === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 p-0 rounded-full border-0 cursor-pointer"
                title="Custom color"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {teamToEdit && onDeleteTeam ? (
              <button
                type="button"
                onClick={() => onDeleteTeam(teamToEdit.id)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 p-1 hover:bg-rose-50 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Team</span>
              </button>
            ) : <div />}

            <div className="flex space-x-2">
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
                {teamToEdit ? 'Save Team Settings' : 'Create Team'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
