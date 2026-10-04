import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import GameList from './components/GameList';
import ImportModal from './components/ImportModal';
import ShareModal from './components/ShareModal';
import GameModal from './components/GameModal';
import ScoreStatusModal from './components/ScoreStatusModal';
import TeamModal from './components/TeamModal';
import SettingsModal from './components/SettingsModal';
import PublicSchedule from './components/PublicSchedule';
import LoginModal from './components/LoginModal';

export default function App() {
  // Check if viewing public schedule page
  const isPublicSchedule =
    window.location.pathname.startsWith('/schedule') ||
    new URLSearchParams(window.location.search).get('view') === 'public';

  if (isPublicSchedule) {
    const pathParts = window.location.pathname.split('/');
    const teamIdFromUrl = pathParts.length > 2 ? pathParts[2] : null;
    return <PublicSchedule teamId={teamIdFromUrl} />;
  }

  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null); // null = All Teams / Family view
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
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  }

  async function fetchGames() {
    setIsLoading(true);
    try {
      const url = selectedTeamId ? `/api/games?teamId=${selectedTeamId}` : '/api/games';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function getAuthHeaders() {
    const token = localStorage.getItem('gamesync_admin_token') || '';
    return {
      'Content-Type': 'application/json',
      'x-admin-token': token
    };
  }

  // Add / Edit Game
  async function handleSaveGame(gameData) {
    try {
      const isEditing = Boolean(gameData.id);
      const url = isEditing ? `/api/games/${gameData.id}` : '/api/games';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(gameData)
      });

      if (res.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
        throw new Error('Admin passcode required to modify schedule.');
      }
      if (!res.ok) throw new Error('Failed to save game');

      showToast(isEditing ? 'Game updated successfully!' : 'New game added to calendar!');
      setIsGameModalOpen(false);
      setGameToEdit(null);
      fetchGames();
      fetchTeams();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  // Delete Game
  async function handleDeleteGame(gameId) {
    if (!confirm('Are you sure you want to remove this game from the schedule?')) return;
    try {
      const token = localStorage.getItem('gamesync_admin_token') || '';
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (res.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
        throw new Error('Admin passcode required to delete games.');
      }
      if (!res.ok) throw new Error('Failed to delete game');
      showToast('Game removed from schedule', 'info');
      fetchGames();
      fetchTeams();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  // Update Game Score & Status
  async function handleSaveScore(updatedGame) {
    try {
      const res = await fetch(`/api/games/${updatedGame.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedGame)
      });
      if (res.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
        throw new Error('Admin passcode required to update scores.');
      }
      if (!res.ok) throw new Error('Failed to update game status');

      showToast('Game score and status updated!');
      setIsScoreModalOpen(false);
      setGameForScore(null);
      fetchGames();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  // Add / Edit Team
  async function handleSaveTeam(teamData) {
    try {
      const isEditing = Boolean(teamData.id);
      const url = isEditing ? `/api/teams/${teamData.id}` : '/api/teams';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(teamData)
      });
      if (res.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
        throw new Error('Admin passcode required to manage teams.');
      }
      if (!res.ok) throw new Error('Failed to save team');

      showToast(isEditing ? 'Team updated!' : 'Team created!');
      setIsTeamModalOpen(false);
      setTeamToEdit(null);
      fetchTeams();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  // Delete Team
  async function handleDeleteTeam(teamId) {
    if (!confirm('Delete this team and all its scheduled games?')) return;
    try {
      const token = localStorage.getItem('gamesync_admin_token') || '';
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (res.status === 401) {
        setIsAdmin(false);
        setIsLoginOpen(true);
        throw new Error('Admin passcode required to delete teams.');
      }
      if (!res.ok) throw new Error('Failed to delete team');
      showToast('Team deleted');
      setIsTeamModalOpen(false);
      setTeamToEdit(null);
      if (selectedTeamId === teamId) setSelectedTeamId(null);
      fetchTeams();
      fetchGames();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl text-white text-xs font-bold flex items-center space-x-2 border ${
              toast.type === 'info'
                ? 'bg-slate-900 border-slate-700'
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
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
