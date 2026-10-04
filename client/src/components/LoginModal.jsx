import React, { useState } from 'react';
import { X, Lock, Key, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { apiLogin } from '../api';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  if (!isOpen) return null;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setIsLoading(false);

    if (!password) {
      setError('Please enter the admin passcode.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiLogin(password);
      localStorage.setItem('gamesync_admin_token', data.token || 'admin');
      setPassword('');
      onLoginSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">Admin / Coach Login</h3>
              <p className="text-[11px] text-slate-500">Unlock schedule editing & scraping</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Enter Admin Passcode
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode..."
                autoFocus
                className="w-full pl-3 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center space-x-1 font-bold text-slate-700">
              <Key className="w-3.5 h-3.5 text-blue-600" />
              <span>Initial Setup Passcode:</span>
            </div>
            <p>
              Default is <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-slate-800 border border-slate-200">coach2026</code>. You can change this anytime in Settings.
            </p>
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
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Checking...' : 'Unlock Editor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
