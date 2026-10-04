import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Check, Sparkles, Database, Calendar } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasGeminiKey);
        setMaskedKey(data.maskedKey || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }

  async function handleSaveKey(e) {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: apiKey })
      });

      if (res.ok) {
        setStatusMsg('Gemini API key saved successfully!');
        setApiKey('');
        fetchSettings();
      } else {
        setStatusMsg('Failed to save API key.');
      }
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-slate-900 text-base">GameSync Hub Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* AI Parser Setup */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-900">Google Gemini AI Vision Key</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Power schedule extraction from paper photos, fridge flyers, PDF schedules, and complex league websites.
            </p>

            {hasKey ? (
              <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span className="flex items-center space-x-1.5 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>AI Extraction Active ({maskedKey})</span>
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">Enabled</span>
              </div>
            ) : (
              <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <span>Rule-based fallback active. Enter your Gemini API key to enable OCR photo and PDF extraction.</span>
              </div>
            )}

            <form onSubmit={handleSaveKey} className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? 'Enter new key to replace' : 'AIzaSy...'}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={isSaving || !apiKey.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              {statusMsg && (
                <p className="text-[11px] font-semibold text-emerald-600">{statusMsg}</p>
              )}
            </form>
          </div>

          {/* Database & Calendar Architecture Info */}
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-center space-x-2 font-bold text-slate-800">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Embedded SQLite Database</span>
            </div>
            <p className="text-slate-500 leading-relaxed pl-6">
              All teams, games, scores, and subscriber lists are persisted locally in <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">data/gamesync.db</code> with zero cloud database fees.
            </p>

            <div className="flex items-center space-x-2 font-bold text-slate-800 pt-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Live iCal Feed Sync Rate</span>
            </div>
            <p className="text-slate-500 leading-relaxed pl-6">
              Complies with RFC 5545 standard with <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">REFRESH-INTERVAL:PT1H</code> for automatic background syncing on Apple and Google Calendar.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
