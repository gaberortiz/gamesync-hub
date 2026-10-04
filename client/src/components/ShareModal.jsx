import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Share2,
  Calendar,
  Copy,
  Check,
  Download,
  Mail,
  Send,
  Smartphone,
  Users,
  QrCode,
  ExternalLink,
  Trash2
} from 'lucide-react';

export default function ShareModal({ isOpen, onClose, teams, selectedTeamId }) {
  if (!isOpen) return null;

  // Selected calendar target (null = Family / All Teams, or teamId)
  const [activeCalTarget, setActiveCalTarget] = useState(selectedTeamId || 'family');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Email invite state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Grandparent');
  const [subscribers, setSubscribers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  // Compute URLs based on host and active target
  const origin = window.location.origin;
  const isFamily = activeCalTarget === 'family' || !activeCalTarget;

  const feedPath = isFamily
    ? '/api/calendar/family.ics'
    : `/api/calendar/${activeCalTarget}.ics`;

  const httpIcsUrl = `${origin}${feedPath}`;
  const webcalUrl = httpIcsUrl.replace(/^https?:\/\//, 'webcal://');
  const webScheduleUrl = isFamily ? `${origin}/schedule` : `${origin}/schedule/${activeCalTarget}`;
  const [webCopied, setWebCopied] = useState(false);

  // Google Calendar web subscription URL
  const googleCalSubscribeUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(httpIcsUrl)}`;

  // Generate QR Code whenever active target changes
  useEffect(() => {
    QRCode.toDataURL(webScheduleUrl, {
      width: 240,
      margin: 1.5,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code error:', err));
  }, [webScheduleUrl]);

  // Load existing subscribers
  useEffect(() => {
    fetchSubscribers();
  }, [activeCalTarget]);

  async function fetchSubscribers() {
    try {
      const url = activeCalTarget === 'family' ? '/api/subscribers' : `/api/subscribers?teamId=${activeCalTarget}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubscribers(data);
      }
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isFamily ? 'Family Sports Schedule' : 'Team Game Schedule',
          text: `Subscribe to our live game schedule so games automatically sync to your calendar:`,
          url: webcalUrl
        });
      } catch (err) {
        // User cancelled or failed
      }
    } else {
      handleCopy();
    }
  }

  async function handleSendInvite(e) {
    e.preventDefault();
    setIsSending(true);
    setInviteSuccess(null);
    setInviteError(null);

    try {
      const res = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          relationship,
          team_id: activeCalTarget === 'family' ? null : activeCalTarget
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send invitation.');
      }

      setInviteSuccess(`Invitation sent to ${name} (${email})!`);
      setName('');
      setEmail('');
      fetchSubscribers();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteSubscriber(id) {
    try {
      await fetch(`/api/subscribers/${id}`, { method: 'DELETE' });
      fetchSubscribers();
    } catch (err) {
      console.error('Error deleting subscriber:', err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Share Live Calendar with Friends & Family
              </h3>
              <p className="text-xs text-slate-500">
                Sync games directly to Apple Calendar, Google Calendar, or Outlook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feed Selector Tabs */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-white">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Select Calendar Feed to Share
          </label>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveCalTarget('family')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeCalTarget === 'family'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🌟 Master Family Feed (All Teams)
            </button>
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveCalTarget(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  activeCalTarget === t.id
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                style={{
                  backgroundColor: activeCalTarget === t.id ? t.color || '#2563eb' : undefined
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 0: Shareable Web Page Link */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-emerald-950 text-sm flex items-center space-x-1.5">
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span>Family Web Schedule Page (Best for Sharing)</span>
                </h4>
                <p className="text-xs text-emerald-900/80 mt-1">
                  Send this webpage link in text messages or emails! When family members open it, they see a beautiful mobile schedule with maps, arrival times, and one-click calendar sync buttons.
                </p>
              </div>
              <a
                href={webScheduleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1 whitespace-nowrap flex-shrink-0"
              >
                <span>Preview Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="mt-3 flex items-center bg-white rounded-xl border border-emerald-300 p-1.5 shadow-sm">
              <input
                type="text"
                readOnly
                value={webScheduleUrl}
                className="w-full text-xs font-mono px-2 text-slate-700 bg-transparent focus:outline-none select-all"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(webScheduleUrl);
                  setWebCopied(true);
                  setTimeout(() => setWebCopied(false), 2500);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex-shrink-0"
              >
                {webCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{webCopied ? 'Copied!' : 'Copy Page Link'}</span>
              </button>
            </div>
          </div>

          {/* Section 1: One-Click Calendar Subscriptions */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-indigo-950 text-sm flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Instant 1-Click Calendar Sync</span>
                </h4>
                <p className="text-xs text-indigo-900/80 mt-1 max-w-xl">
                  Subscribing means family members never have to re-enter anything. When a game is added, rescheduled, or rained out, their phone calendar updates automatically!
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4">
              {/* Apple Calendar / iOS */}
              <a
                href={webcalUrl}
                className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold shadow-sm transition active:scale-95 text-center"
              >
                <span>🍎 Apple Calendar</span>
              </a>

              {/* Google Calendar */}
              <a
                href={googleCalSubscribeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold shadow-sm transition active:scale-95 text-center"
              >
                <span>📅 Google Calendar</span>
              </a>

              {/* Download .ics */}
              <a
                href={httpIcsUrl}
                download
                className="flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-bold shadow-sm transition active:scale-95 text-center"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Download .ics</span>
              </a>
            </div>

            {/* Copyable Webcal URL Box */}
            <div className="mt-3.5 flex items-center bg-white rounded-xl border border-indigo-200/80 p-1.5 shadow-sm">
              <input
                type="text"
                readOnly
                value={webcalUrl}
                className="w-full text-xs font-mono px-2 text-slate-600 bg-transparent focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Section 2: Scannable QR Code & Mobile Share */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* QR Code Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center">
              <div className="flex items-center space-x-1.5 mb-2 font-bold text-xs text-slate-800">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Scan with Phone Camera</span>
              </div>
              <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-2">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Calendar Subscription QR Code" className="w-36 h-36" />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                    Generating...
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Perfect for spouses or grandparents. Just open the iPhone/Android camera, scan the QR code, and tap <strong>Subscribe</strong>.
              </p>
            </div>

            {/* Native Mobile Share Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-1.5 mb-2 font-bold text-xs text-slate-800">
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>Send via iMessage / WhatsApp</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Send the live calendar subscription link directly to family group chats via SMS, iMessage, WhatsApp, or email.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center space-x-2 active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via Chat / Message Sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: In-App Email Invitation Dispatcher */}
          <div className="border border-slate-200 rounded-2xl p-5 bg-white">
            <h4 className="font-bold text-slate-900 text-sm flex items-center space-x-2 mb-1">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Send Calendar Invite via Email</span>
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Enter email addresses for friends and family members. They'll receive an invitation email with 1-click subscription buttons.
            </p>

            {inviteSuccess && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}
            {inviteError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Grandma Rose"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rose@example.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Relationship</label>
                <div className="flex space-x-2">
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="Grandparent">Grandparent</option>
                    <option value="Parent / Spouse">Parent / Spouse</option>
                    <option value="Aunt / Uncle">Aunt / Uncle</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Family Friend">Family Friend</option>
                    <option value="Babysitter / Carpool">Carpool / Sitter</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1 disabled:opacity-50 flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of currently invited family */}
            {subscribers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Currently Invited Family ({subscribers.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {subscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{sub.name}</span>
                        <span className="text-slate-400">({sub.relationship})</span>
                        <span className="text-slate-500 text-[11px]">{sub.email}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteSubscriber(sub.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Remove contact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
