import React, { useState } from 'react';
import {
  X,
  Upload,
  Globe,
  FileText,
  Camera,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { parseScheduleClientSide } from '../parser';
import { apiBatchGames } from '../api';

export default function ImportModal({ isOpen, onClose, teams, onGamesImported }) {
  if (!isOpen) return null;

  const [inputMode, setInputMode] = useState('file'); // 'file', 'url', 'text'
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [targetTeamId, setTargetTeamId] = useState(teams[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Review step state
  const [parsedGames, setParsedGames] = useState(null); // Array of editable games

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
      if (selected.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setFilePreview(reader.result);
        reader.readAsDataURL(selected);
      } else {
        setFilePreview(null);
      }
    }
  }

  async function handleParseSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (inputMode === 'file' && !file) {
        throw new Error('Please select a file to extract.');
      } else if (inputMode === 'url' && !url) {
        throw new Error('Please enter a schedule URL.');
      } else if (inputMode === 'text' && !rawText) {
        throw new Error('Please paste schedule text to extract.');
      }

      const rawGames = await parseScheduleClientSide({
        file: inputMode === 'file' ? file : null,
        text: inputMode === 'text' ? rawText : '',
        url: inputMode === 'url' ? url : '',
        defaultYear: 2026
      });

      // Populate review table
      setParsedGames(
        rawGames.map((g, idx) => ({
          ...g,
          id: `preview-${idx}`,
          duration_mins: g.duration_mins || 60,
          arrival_buffer_mins: g.arrival_buffer_mins || 30,
          is_home: g.is_home !== undefined ? g.is_home : true
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleUpdateGame(index, field, value) {
    setParsedGames((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleDeleteGame(index) {
    setParsedGames((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddEmptyRow() {
    setParsedGames((prev) => [
      ...prev,
      {
        id: `preview-${Date.now()}`,
        game_date: '2026-10-15',
        start_time: '10:00',
        duration_mins: 60,
        arrival_buffer_mins: 30,
        opponent: 'New Opponent',
        is_home: true,
        venue_name: 'Community Park',
        field_court: 'Field 1',
        uniform_notes: 'Home Jersey',
        notes: ''
      }
    ]);
  }

  async function handleConfirmImport() {
    if (!targetTeamId) {
      setError('Please select a target team.');
      return;
    }
    if (!parsedGames || parsedGames.length === 0) {
      setError('No games to import.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiBatchGames(targetTeamId, parsedGames);
      // Success!
      onGamesImported();
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setParsedGames(null);
    setFile(null);
    setFilePreview(null);
    setUrl('');
    setRawText('');
    setError(null);
    setIsLoading(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {parsedGames ? 'Review & Confirm Extracted Games' : 'Scrape & Import Game Schedule'}
              </h3>
              <p className="text-xs text-slate-500">
                {parsedGames
                  ? `Verify the detected games below before saving to calendar`
                  : `Upload photos of fridge schedules, PDFs, league URLs, or email text`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!parsedGames ? (
            /* STEP 1: UPLOAD / SCRAPE FORM */
            <form onSubmit={handleParseSubmit} className="space-y-5">
              {/* Target Team Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Team to Assign Schedule To
                </label>
                <select
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.sport} {t.child_name ? `- ${t.child_name}` : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Choose Input Method
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`py-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                      inputMode === 'file'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Photo / PDF / CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode('url')}
                    className={`py-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                      inputMode === 'url'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>League Website URL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`py-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                      inputMode === 'text'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Paste Email / Text</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: File Dropzone */}
              {inputMode === 'file' && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf,.csv,.xlsx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center">
                      <div className="p-3 bg-white rounded-full shadow-sm text-emerald-600 mb-2 border border-slate-100">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {file ? file.name : 'Click to select or drag and drop schedule file'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports schedule photos (PNG, JPEG), PDFs, CSV, or spreadsheets
                      </p>
                    </div>
                  </div>

                  {filePreview && (
                    <div className="mt-2 p-2 bg-slate-100 rounded-xl border border-slate-200 flex items-center space-x-3">
                      <img
                        src={filePreview}
                        alt="Schedule preview"
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="text-xs text-slate-700">
                        <p className="font-bold">Image preview loaded</p>
                        <p className="text-slate-500">AI will detect game dates, times, fields, and opponents</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: League URL Scraper */}
              {inputMode === 'url' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    Public League Schedule Webpage URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://leagues.example.com/teams/strikers-u10/schedule"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Enter the URL of any public league schedule page (TeamSnap, LeagueApps, SportsEngine, high school athletics, etc.). We'll scrape the tables and format the games.
                  </p>
                </div>
              )}

              {/* Mode 3: Raw Text Paste */}
              {inputMode === 'text' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    Paste League Announcement Email or Schedule Text
                  </label>
                  <textarea
                    rows={6}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Example:
Oct 10 at 9:00 AM vs Thunder FC at Riverside Park Field 3 (Wear Blue)
Oct 17 at 10:30 AM @ Galaxy United at Memorial High Field B (Wear White)
Oct 24 at 1:00 PM vs Tornadoes at Sunset Park Field 1`}
                    className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing & Extracting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Extract & Review Games</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: INTERACTIVE REVIEW & VERIFICATION GRID */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-emerald-800">
                    🎉 Extracted {parsedGames.length} Game{parsedGames.length === 1 ? '' : 's'}!
                  </span>
                  <p className="text-xs text-emerald-700">
                    Review and adjust any dates, times, or field assignments below before saving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddEmptyRow}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Game</span>
                </button>
              </div>

              {/* Table of Parsed Games */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Opponent</th>
                      <th className="p-2.5">Home/Away</th>
                      <th className="p-2.5">Venue & Field</th>
                      <th className="p-2.5">Uniform / Notes</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedGames.map((g, idx) => (
                      <tr key={g.id || idx} className="hover:bg-slate-50">
                        {/* Date */}
                        <td className="p-2 min-w-[125px]">
                          <input
                            type="date"
                            value={g.game_date}
                            onChange={(e) => handleUpdateGame(idx, 'game_date', e.target.value)}
                            className="w-full p-1 border border-slate-200 rounded text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Start Time */}
                        <td className="p-2 min-w-[90px]">
                          <input
                            type="time"
                            value={g.start_time}
                            onChange={(e) => handleUpdateGame(idx, 'start_time', e.target.value)}
                            className="w-full p-1 border border-slate-200 rounded text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Opponent */}
                        <td className="p-2 min-w-[140px]">
                          <input
                            type="text"
                            value={g.opponent}
                            onChange={(e) => handleUpdateGame(idx, 'opponent', e.target.value)}
                            placeholder="Opponent"
                            className="w-full p-1 border border-slate-200 rounded text-xs font-medium focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Home / Away */}
                        <td className="p-2 min-w-[95px]">
                          <select
                            value={g.is_home ? 'home' : 'away'}
                            onChange={(e) => handleUpdateGame(idx, 'is_home', e.target.value === 'home')}
                            className="w-full p-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="home">Home (vs)</option>
                            <option value="away">Away (@)</option>
                          </select>
                        </td>

                        {/* Venue & Field */}
                        <td className="p-2 min-w-[180px]">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={g.venue_name || ''}
                              onChange={(e) => handleUpdateGame(idx, 'venue_name', e.target.value)}
                              placeholder="Venue / Park name"
                              className="w-full p-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                            <input
                              type="text"
                              value={g.field_court || ''}
                              onChange={(e) => handleUpdateGame(idx, 'field_court', e.target.value)}
                              placeholder="Field / Court #"
                              className="w-full p-1 border border-slate-200 rounded text-[11px] text-slate-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </td>

                        {/* Uniform / Notes */}
                        <td className="p-2 min-w-[150px]">
                          <input
                            type="text"
                            value={g.uniform_notes || ''}
                            onChange={(e) => handleUpdateGame(idx, 'uniform_notes', e.target.value)}
                            placeholder="Jersey color"
                            className="w-full p-1 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Remove */}
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteGame(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove game"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Review Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setParsedGames(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  ← Back to Upload
                </button>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isLoading || parsedGames.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Confirm & Import ({parsedGames.length}) Games</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
