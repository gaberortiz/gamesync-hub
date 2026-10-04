import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Check, Sparkles, Database, Calendar, Lock, Sheet, ExternalLink, HelpCircle, AlertCircle } from 'lucide-react';
import { getScriptUrl, setScriptUrl, getGeminiKey, setGeminiKey, apiChangePassword } from '../api';

export default function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  // Google Sheet connection state
  const [sheetUrl, setSheetUrlState] = useState(getScriptUrl());
  const [sheetStatus, setSheetStatus] = useState('');
  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Gemini API key state
  const [apiKey, setApiKey] = useState(getGeminiKey());
  const [keyStatus, setKeyStatus] = useState('');

  // Change password state
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    setSheetUrlState(getScriptUrl());
    setApiKey(getGeminiKey());
  }, [isOpen]);

  async function handleSaveSheetUrl(e) {
    e.preventDefault();
    setIsTestingSheet(true);
    setSheetStatus('');

    const cleanUrl = sheetUrl.trim();
    if (!cleanUrl) {
      setScriptUrl('');
      setSheetStatus('Cleared Google Sheet URL (using local backend)');
      setIsTestingSheet(false);
      return;
    }

    try {
      // Test ping
      const res = await fetch(`${cleanUrl}?action=getTeams`);
      if (res.ok) {
        const teams = await res.json();
        setScriptUrl(cleanUrl);
        setSheetStatus(`Connected successfully! Loaded ${teams.length} team(s) from your Google Sheet.`);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        throw new Error(`HTTP error ${res.status}`);
      }
    } catch (err) {
      setScriptUrl(cleanUrl); // save anyway
      setSheetStatus(`Saved! Note: Ensure 'Who has access' is set to 'Anyone' in your Apps Script deployment.`);
    } finally {
      setIsTestingSheet(false);
    }
  }

  function handleSaveKey(e) {
    e.preventDefault();
    setGeminiKey(apiKey);
    setKeyStatus('Gemini API key saved in browser!');
    setTimeout(() => setKeyStatus(''), 3000);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setIsSavingPassword(true);
    setPasswordMsg('');

    try {
      await apiChangePassword(newPassword);
      setPasswordMsg('Admin passcode updated successfully!');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg(err.message || 'Failed to update passcode.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-zinc-900 text-base">GameSync Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Google Drive & Google Sheets Database */}
          <div className="border border-zinc-200/80 rounded-2xl p-4.5 bg-zinc-50/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  GS
                </div>
                <h4 className="text-xs font-bold text-zinc-900">Google Drive / Sheets Database</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showGuide ? 'Hide Setup' : 'How to Setup (Free)'}</span>
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed mb-3">
              Connect a free Google Sheet in your Google Drive to act as your live database and calendar feed generator.
            </p>

            {/* Expandable Setup Instructions */}
            {showGuide && (
              <div className="mb-3 p-3.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-700 space-y-2">
                <p className="font-semibold text-zinc-900">Quick 3-Minute Setup:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-zinc-600">
                  <li>In Google Drive, create a new <strong>Google Sheet</strong>.</li>
                  <li>Click <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Copy and paste the code from <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px]">google-apps-script/Code.gs</code>.</li>
                  <li>Click <strong>Deploy &gt; New deployment</strong>, select type <strong>Web app</strong>, set <em>Who has access</em> to <strong>Anyone</strong>, and click Deploy.</li>
                  <li>Copy the resulting Web App URL and paste it below!</li>
                </ol>
              </div>
            )}

            <form onSubmit={handleSaveSheetUrl} className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrlState(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-400 bg-white"
                />
                <button
                  type="submit"
                  disabled={isTestingSheet}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
                >
                  {isTestingSheet ? 'Testing...' : 'Connect'}
                </button>
              </div>
              {sheetStatus && (
                <p className="text-[11px] font-medium text-emerald-600 pt-0.5">{sheetStatus}</p>
              )}
            </form>
          </div>

          {/* Section 2: Gemini AI Key for Schedule Extraction */}
          <div className="border border-zinc-200/80 rounded-2xl p-4.5 bg-zinc-50/40">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-zinc-900">Google Gemini AI Schedule Vision</h4>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed mb-3">
              Allows you to take a photo of a paper schedule or upload a PDF to automatically extract games in the browser.
            </p>

            <form onSubmit={handleSaveKey} className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AQ... / AIza..."
                  className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-400 bg-white"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition"
                >
                  Save
                </button>
              </div>
              {keyStatus && (
                <p className="text-[11px] font-medium text-emerald-600 pt-0.5">{keyStatus}</p>
              )}
            </form>
          </div>

          {/* Section 3: Admin / Coach Passcode */}
          <div className="border border-zinc-200/80 rounded-2xl p-4.5 bg-zinc-50/40">
            <div className="flex items-center space-x-2 mb-1.5">
              <Lock className="w-4 h-4 text-zinc-700" />
              <h4 className="text-xs font-bold text-zinc-900">Admin / Coach Passcode</h4>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed mb-3">
              Passcode required to unlock schedule editing, adding teams, and importing games.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set new passcode..."
                  className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 rounded-xl focus:outline-none focus:border-zinc-400 bg-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isSavingPassword || !newPassword.trim()}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
                >
                  Update
                </button>
              </div>
              {passwordMsg && (
                <p className="text-[11px] font-medium text-emerald-600 pt-0.5">{passwordMsg}</p>
              )}
            </form>
          </div>

          {/* Close button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
