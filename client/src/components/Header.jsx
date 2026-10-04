import React from 'react';
import { Calendar, Plus, Share2, UploadCloud, Users, Settings as SettingsIcon, Edit2 } from 'lucide-react';

export default function Header({
  teams,
  selectedTeamId,
  onSelectTeam,
  onOpenImport,
  onOpenAddGame,
  onOpenShare,
  onOpenTeamModal,
  onEditTeam,
  onOpenSettings
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">GameSync</span>
                <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Hub</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Youth Sports Schedule & Live Family Calendar</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition active:scale-95"
              title="Import schedule from Photo, PDF, CSV, or League URL"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden md:inline">Scrape & Import</span>
              <span className="md:hidden">Import</span>
            </button>

            <button
              onClick={onOpenAddGame}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Game</span>
            </button>

            <button
              onClick={onOpenShare}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-semibold transition active:scale-95"
              title="Share live calendar feed with friends and family"
            >
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Sync & Share</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Settings & AI Keys"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Team Selector Sub-Navigation */}
        <div className="flex items-center space-x-2 py-2.5 overflow-x-auto no-scrollbar border-t border-slate-100">
          <button
            onClick={() => onSelectTeam(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
              selectedTeamId === null
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🌟 All Teams (Family Feed)</span>
          </button>

          {teams.map((team) => {
            const isSelected = selectedTeamId === team.id;
            return (
              <div key={team.id} className="flex items-center space-x-1 flex-shrink-0">
                <button
                  onClick={() => onSelectTeam(team.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 border ${
                    isSelected
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  style={{
                    backgroundColor: isSelected ? team.color || '#2563eb' : undefined
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: isSelected ? '#ffffff' : (team.color || '#2563eb') }}
                  />
                  <span>{team.name}</span>
                  {team.child_name && (
                    <span className={`text-[10px] opacity-80 ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                      ({team.child_name})
                    </span>
                  )}
                  {team.upcoming_count > 0 && (
                    <span
                      className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {team.upcoming_count}
                    </span>
                  )}
                </button>

                {isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTeam(team);
                    }}
                    className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                    title={`Edit ${team.name} settings`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onOpenTeamModal}
            className="px-2.5 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-dashed border-slate-300 flex items-center space-x-1 whitespace-nowrap transition"
          >
            <Plus className="w-3 h-3" />
            <span>Add Team</span>
          </button>
        </div>
      </div>
    </header>
  );
}
