import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GameList from './components/GameList';
import ImportModal from './components/ImportModal';
import ShareModal from './components/ShareModal';
import GameModal from './components/GameModal';
import ScoreStatusModal from './components/ScoreStatusModal';
import TeamModal from './components/TeamModal';
import SettingsModal from './components/SettingsModal';
import LoginModal from './components/LoginModal';
import {
  apiFetchTeams,
  apiFetchGames,
  apiSaveGame,
  apiDeleteGame,
  apiSaveTeam,
  apiDeleteTeam
} from './api';

export default function App() {
  // Support optional direct team links like /schedule/team-1
  const pathParts = window.location.pathname.split('/');
  const initialTeamId =
    (window.location.pathname.startsWith('/schedule') && pathParts.length > 2 && pathParts[2])
      ? pathParts[2]
      : null;

  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId); // null = All Teams / Family view
  const [isLoading, setIsLoading] = useState(true);

  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState(null);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [gameForScore, setGameForScore] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Toast / notification banner
  const [toast, setToast] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // Check admin session on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  async function checkAdminStatus() {
    const token = localStorage.getItem('gamesync_admin_token');
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/verify', {
        headers: { 'x-admin-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(Boolean(data.isAdmin));
        if (!data.isAdmin) {
          localStorage.removeItem('gamesync_admin_token');
        }
      } else {
        setIsAdmin(false);
        localStorage.removeItem('gamesync_admin_token');
      }
    } catch {
      setIsAdmin(false);
    }
  }

  async function handleLogout() {
    const token = localStorage.getItem('gamesync_admin_token');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'x-admin-token': token || '' }
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('gamesync_admin_token');
    setIsAdmin(false);
    showToast('Logged out of Editor Mode', 'info');
  }

  // Fetch initial teams
  useEffect(() => {
    fetchTeams();
  }, []);

  // Fetch games whenever selectedTeamId changes
  useEffect(() => {
    fetchGames();
  }, [selectedTeamId]);

  async function fetchTeams() {
    try {
      const data = await apiFetchTeams();
      setTeams(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  }

  async function fetchGames() {
    setIsLoading(true);
    try {
      const data = await apiFetchGames(selectedTeamId);
      setGames(data);
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Add / Edit Game
  async function handleSaveGame(gameData) {
    try {
      const isEditing = Boolean(gameData.id);
      await apiSaveGame(gameData);

      showToast(isEditing ? 'Game updated successfully!' : 'New game added to calendar!');
      setIsGameModalOpen(false);
      setGameToEdit(null);
      fetchGames();
      fetchTeams();
    } catch (err) {
      if (err.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
      }
      alert(`Error: ${err.message || 'Failed to save game'}`);
    }
  }

  // Delete Game
  async function handleDeleteGame(gameId) {
    if (!confirm('Are you sure you want to remove this game from the schedule?')) return;
    try {
      await apiDeleteGame(gameId);
      showToast('Game removed from schedule', 'info');
      fetchGames();
      fetchTeams();
    } catch (err) {
      if (err.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
      }
      alert(`Error: ${err.message || 'Failed to delete game'}`);
    }
  }

  // Update Game Score & Status
  async function handleSaveScore(updatedGame) {
    try {
      await apiSaveGame(updatedGame);
      showToast('Game score and status updated!');
      setIsScoreModalOpen(false);
      setGameForScore(null);
      fetchGames();
    } catch (err) {
      if (err.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
      }
      alert(`Error: ${err.message || 'Failed to update score'}`);
    }
  }

  // Add / Edit Team
  async function handleSaveTeam(teamData) {
    try {
      const isEditing = Boolean(teamData.id);
      await apiSaveTeam(teamData);
      showToast(isEditing ? 'Team updated!' : 'Team created!');
      setIsTeamModalOpen(false);
      setTeamToEdit(null);
      fetchTeams();
    } catch (err) {
      if (err.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
      }
      alert(`Error: ${err.message || 'Failed to save team'}`);
    }
  }

  // Delete Team
  async function handleDeleteTeam(teamId) {
    if (!confirm('Delete this team and all its scheduled games?')) return;
    try {
      await apiDeleteTeam(teamId);
      showToast('Team deleted');
      setIsTeamModalOpen(false);
      setTeamToEdit(null);
      if (selectedTeamId === teamId) setSelectedTeamId(null);
      fetchTeams();
      fetchGames();
    } catch (err) {
      if (err.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
      }
      alert(`Error: ${err.message || 'Failed to delete team'}`);
    }
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null;

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col selection:bg-zinc-900 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg text-white text-xs font-medium flex items-center space-x-2 border ${
              toast.type === 'info'
                ? 'bg-zinc-900 border-zinc-800'
                : 'bg-emerald-600 border-emerald-500'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Header */}
      <Header
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSelectTeam={(id) => setSelectedTeamId(id)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAddGame={() => {
          setGameToEdit(null);
          setIsGameModalOpen(true);
        }}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenTeamModal={() => {
          setTeamToEdit(null);
          setIsTeamModalOpen(true);
        }}
        onEditTeam={(team) => {
          setTeamToEdit(team);
          setIsTeamModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isAdmin={isAdmin}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <GameList
          games={games}
          selectedTeam={selectedTeam}
          onEditGame={(g) => {
            setGameToEdit(g);
            setIsGameModalOpen(true);
          }}
          onDeleteGame={handleDeleteGame}
          onOpenScoreModal={(g) => {
            setGameForScore(g);
            setIsScoreModalOpen(true);
          }}
          onOpenAddGame={() => {
            setGameToEdit(null);
            setIsGameModalOpen(true);
          }}
          onOpenShare={() => setIsShareOpen(true)}
          onEditTeam={(team) => {
            setTeamToEdit(team);
            setIsTeamModalOpen(true);
          }}
          isAdmin={isAdmin}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/60 py-8 text-center text-xs text-zinc-400">
        <p>GameSync Hub &bull; Automatic RFC 5545 iCalendar Feeds for Apple Calendar, Google Calendar & Outlook</p>
      </footer>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        teams={teams}
        onGamesImported={() => {
          fetchGames();
          fetchTeams();
          showToast('Schedule successfully imported and added to calendar!');
        }}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        teams={teams}
        selectedTeamId={selectedTeamId}
      />

      <GameModal
        isOpen={isGameModalOpen}
        onClose={() => {
          setIsGameModalOpen(false);
          setGameToEdit(null);
        }}
        gameToEdit={gameToEdit}
        teams={teams}
        selectedTeamId={selectedTeamId}
        onSaveGame={handleSaveGame}
      />

      <ScoreStatusModal
        isOpen={isScoreModalOpen}
        onClose={() => {
          setIsScoreModalOpen(false);
          setGameForScore(null);
        }}
        game={gameForScore}
        onSave={handleSaveScore}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setTeamToEdit(null);
        }}
        teamToEdit={teamToEdit}
        onSaveTeam={handleSaveTeam}
        onDeleteTeam={handleDeleteTeam}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={() => {
          setIsAdmin(true);
          showToast('Editor Mode unlocked! 🎉');
        }}
      />
    </div>
  );
}
