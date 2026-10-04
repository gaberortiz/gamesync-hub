import React from 'react';
import { Calendar, Plus, Share2, UploadCloud, Settings as SettingsIcon, Edit2, Lock, LogOut } from 'lucide-react';

export default function Header({
  teams,
  selectedTeamId,
  onSelectTeam,
  onOpenImport,
  onOpenAddGame,
  onOpenShare,
  onOpenTeamModal,
  onEditTeam,
  onOpenSettings,
  isAdmin,
  onOpenLogin,
  onLogout
}) {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200/70 sticky top-0 z-30 transition-all">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-bold text-base tracking-tight text-zinc-900">GameSync</span>
              {isAdmin ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Editor</span>
                </span>
              ) : (
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 hidden sm:inline-block">
                  Live Calendar
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <>
                <button
                  onClick={onOpenImport}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition active:scale-95"
                  title="Import schedule from Photo, PDF, or URL"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Import</span>
                </button>

                <button
                  onClick={onOpenAddGame}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Game</span>
                </button>

                <button
                  onClick={onOpenShare}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition active:scale-95"
                  title="Share and subscribe to calendar feed"
                >
                  <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">Sync</span>
                </button>

                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
                  title="Settings & Passcode"
                >
                  <SettingsIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Log out of editor mode"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onOpenShare}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Sync to Calendar</span>
                </button>

                <button
                  onClick={onOpenLogin}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-zinc-200/80 hover:bg-zinc-50 text-zinc-600 text-xs font-medium transition active:scale-95"
                >
                  <Lock className="w-3 h-3 text-zinc-400" />
                  <span className="hidden sm:inline">Coach Login</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Minimal Segmented Team Row */}
        <div className="flex items-center space-x-1.5 py-2 overflow-x-auto no-scrollbar border-t border-zinc-100">
          <button
            onClick={() => onSelectTeam(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedTeamId === null
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            All Teams
          </button>

          {teams.map((team) => {
            const isSelected = selectedTeamId === team.id;
            return (
              <div key={team.id} className="flex items-center space-x-0.5 flex-shrink-0">
                <button
                  onClick={() => onSelectTeam(team.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center space-x-2 ${
                    isSelected
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ backgroundColor: isSelected ? '#ffffff' : (team.color || '#2563eb') }}
                  />
                  <span>{team.name}</span>
                  {team.child_name && (
                    <span className={`text-[10px] ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      {team.child_name}
                    </span>
                  )}
                  {team.upcoming_count > 0 && (
                    <span
                      className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                        isSelected ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {team.upcoming_count}
                    </span>
                  )}
                </button>

                {isSelected && isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTeam(team);
                    }}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
                    title={`Edit ${team.name}`}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {isAdmin && (
            <button
              onClick={onOpenTeamModal}
              className="px-2 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border border-dashed border-zinc-200 flex items-center space-x-1 whitespace-nowrap transition"
            >
              <Plus className="w-3 h-3" />
              <span>Team</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
