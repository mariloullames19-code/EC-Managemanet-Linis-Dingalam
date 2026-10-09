import React, { useState } from 'react';
import {
  X,
  EyeOff,
  Inbox,
  Shield,
  ShieldAlert,
  Clock,
  MapPin,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  Trash2,
  Filter,
  Search,
  Check,
  Radio,
  ExternalLink,
  ChevronDown,
  Layers,
  Archive,
  RefreshCw,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { AnonymousMessage, User } from '../types';
import { api } from '../services/api';

interface AdminAnonymousInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  messages: AnonymousMessage[];
  onRefreshMessages?: () => void;
  onOpenBroadcastModal?: () => void;
}

export const AdminAnonymousInboxModal: React.FC<AdminAnonymousInboxModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  messages,
  onRefreshMessages,
  onOpenBroadcastModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<AnonymousMessage | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  if (!isOpen) return null;

  // RBAC: strictly verify admin or superadmin
  const isAdminOrSuperAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
  if (!isAdminOrSuperAdmin) return null;

  const unreadCount = messages.filter((m) => m.status === 'unread').length;
  const urgentCount = messages.filter((m) => m.priority === 'urgent' && m.status !== 'resolved').length;

  const filteredMessages = messages.filter((msg) => {
    // Tab filter
    if (activeFilter === 'unread' && msg.status !== 'unread') return false;
    if (activeFilter === 'urgent' && msg.priority !== 'urgent') return false;
    if (activeFilter === 'resolved' && msg.status !== 'resolved') return false;

    // Category filter
    if (categoryFilter !== 'all' && msg.category !== categoryFilter) return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchText = msg.message.toLowerCase().includes(q);
      const matchAlias = msg.senderAlias.toLowerCase().includes(q);
      const matchLoc = (msg.referencedLocation || '').toLowerCase().includes(q);
      const matchAct = (msg.referencedActivityTitle || '').toLowerCase().includes(q);
      const matchCat = (msg.categoryLabelTagalog || '').toLowerCase().includes(q);
      if (!matchText && !matchAlias && !matchLoc && !matchAct && !matchCat) return false;
    }

    return true;
  });

  const handleMarkAsRead = async (msgId: string) => {
    setIsUpdating(msgId);
    try {
      await api.markAnonymousMessageStatus(msgId, 'read');
      if (onRefreshMessages) onRefreshMessages();
    } catch (e) {
      console.warn('Failed to mark read', e);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleMarkAsResolved = async (msgId: string) => {
    setIsUpdating(msgId);
    try {
      await api.markAnonymousMessageStatus(msgId, 'resolved');
      if (onRefreshMessages) onRefreshMessages();
    } catch (e) {
      console.warn('Failed to mark resolved', e);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!confirm('Sigurado ka bang nais mong burahin ang anonymous report na ito?')) return;
    setIsUpdating(msgId);
    try {
      await api.deleteAnonymousMessage(msgId);
      if (selectedMessage?.id === msgId) {
        setSelectedMessage(null);
      }
      if (onRefreshMessages) onRefreshMessages();
    } catch (e) {
      console.warn('Failed to delete anonymous message', e);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await api.deleteAllAnonymousMessages();
      setSelectedMessage(null);
      setIsDeleteAllConfirmOpen(false);
      if (onRefreshMessages) onRefreshMessages();
    } catch (e) {
      console.warn('Failed to delete all anonymous messages', e);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const getPriorityBadge = (priority: AnonymousMessage['priority']) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            URGENT
          </span>
        );
      case 'confidential':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            CONFIDENTIAL
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            NORMAL
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-1.5 xs:p-3 sm:p-6 bg-slate-950/92 backdrop-blur-xl overflow-y-auto animate-fadeIn select-none">
      <div className="relative w-full max-w-5xl bg-slate-900 border-2 border-emerald-500/60 rounded-xl sm:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_60px_rgba(16,185,129,0.25)] overflow-hidden my-auto flex flex-col h-[96vh] sm:max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                  Admin-Only Secure Access
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    {unreadCount} BAGO
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-lg font-black text-white tracking-tight leading-tight">
                Mga Anonymous na Mensahe at Ulat sa Admin
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* DELETE ALL BUTTON */}
            <button
              type="button"
              onClick={() => setIsDeleteAllConfirmOpen(true)}
              disabled={messages.length === 0}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 hover:text-rose-100 text-xs font-mono font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              title="Permanenteng burahin ang lahat ng anonymous messages sa database"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Burahin ({messages.length})</span>
            </button>

            {onOpenBroadcastModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBroadcastModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Mag-broadcast ng Paalala sa lahat ng user base sa natanggap na feedback"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Mag-post ng Paalala</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Search Strip */}
        <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs font-mono">
          {/* Tab Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all font-bold cursor-pointer shrink-0 whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              Lahat ({messages.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all font-bold cursor-pointer flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                activeFilter === 'unread'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-amber-300 hover:text-amber-200 border border-slate-800'
              }`}
            >
              <span>Hindi Nabasa</span>
              {unreadCount > 0 && <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">{unreadCount}</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('urgent')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all font-bold cursor-pointer flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
                activeFilter === 'urgent'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-900 text-rose-300 hover:text-rose-200 border border-slate-800'
              }`}
            >
              <span>Urgent</span>
              {urgentCount > 0 && <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">{urgentCount}</span>}
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('resolved')}
              className={`px-3 py-1.5 rounded-xl text-xs transition-all font-bold cursor-pointer shrink-0 whitespace-nowrap ${
                activeFilter === 'resolved'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              Naaksiyunan
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-auto sm:min-w-[200px] flex-1 max-w-none sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hanapin sa mensahe o lugar..."
              className="w-full pl-8 pr-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-sans focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Auto-Purge Notice Strip (1 Month / 30 Days Retention Policy) */}
        <div className="px-3 sm:px-5 py-1.5 sm:py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 gap-1.5 sm:gap-2">
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-cyan-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>
              <strong>1-Month Auto-Purge:</strong> Auto-bura ang ulat pagkalipas ng <strong>30 araw</strong>.
            </span>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Kumpidensiyal & Auto-Cleaned</span>
          </div>
        </div>

        {/* Modal Main Body: Master / Detail split */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          
          {/* Left Column: Messages List (col-span-5) */}
          <div className="md:col-span-5 overflow-y-auto max-h-[60vh] md:max-h-none p-3 space-y-2">
            {filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono space-y-2">
                <Inbox className="w-8 h-8 mx-auto text-slate-600" />
                <p>Walang nakitang anonymous message sa kategoryang ito.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      if (msg.status === 'unread') {
                        handleMarkAsRead(msg.id);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative space-y-1.5 ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : msg.status === 'unread'
                        ? 'bg-slate-950/90 border-amber-500/40 hover:border-amber-400'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Row: Sender Alias + Priority + Time */}
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center space-x-1.5 font-bold">
                        {msg.status === 'unread' && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        )}
                        <span className="text-amber-300">{msg.senderAlias}</span>
                      </div>
                      {getPriorityBadge(msg.priority)}
                    </div>

                    {/* Category Label */}
                    <p className="text-[11px] font-bold text-emerald-300 leading-tight">
                      {msg.categoryLabelTagalog}
                    </p>

                    {/* Snippet text */}
                    <p className="text-xs text-slate-300 font-sans line-clamp-2 leading-relaxed">
                      {msg.message}
                    </p>

                    {/* Footer: Philippine Date Time */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      <span className="truncate">{msg.referencedLocation || 'Dingalan Area'}</span>
                      <span className="shrink-0">{msg.localPhTime.split('•')[1] || msg.localPhTime}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Full Message Detail View (col-span-7) */}
          <div className="md:col-span-7 p-4 sm:p-6 overflow-y-auto max-h-[60vh] md:max-h-none text-left flex flex-col justify-between">
            {selectedMessage ? (
              <div className="space-y-4">
                {/* Detail Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-white font-mono">
                        {selectedMessage.senderAlias}
                      </span>
                      {getPriorityBadge(selectedMessage.priority)}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                        selectedMessage.status === 'resolved'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : selectedMessage.status === 'read'
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {selectedMessage.status === 'resolved' ? 'Naaksiyunan' : selectedMessage.status === 'read' ? 'Nababasa' : 'Bago (Unread)'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-emerald-400">
                      Paksa: {selectedMessage.categoryLabelTagalog}
                    </p>
                  </div>

                  <div className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-500/30 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedMessage.localPhTime}</span>
                  </div>
                </div>

                {/* Guarantee Reminder Box for Admin */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Protektadong Identidad: Ang nagpadala ay hindi pinapangalanan para sa kaligtasan at bukas na feedback.</span>
                </div>

                {/* Referenced Context */}
                {(selectedMessage.referencedActivityTitle || selectedMessage.referencedLocation || selectedMessage.referencedPhotoUrl) && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block">
                      Kaugnay na Larawan / Gawain sa Field:
                    </span>
                    <div className="flex items-center space-x-3">
                      {selectedMessage.referencedPhotoUrl && (
                        <img
                          src={selectedMessage.referencedPhotoUrl}
                          alt="Ref Proof"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                      )}
                      <div className="text-xs space-y-1">
                        {selectedMessage.referencedActivityTitle && (
                          <p className="font-bold text-white">
                            Gawain: {selectedMessage.referencedActivityTitle}
                          </p>
                        )}
                        {selectedMessage.referencedLocation && (
                          <p className="text-slate-300 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Lugar: {selectedMessage.referencedLocation}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Full Message Body */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
                    Buong Nilalaman ng Mensahe:
                  </label>
                  <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-700/80 text-xs sm:text-sm text-white leading-relaxed font-sans shadow-inner whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Admin Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 font-mono text-xs">
                  <div className="flex items-center space-x-2">
                    {selectedMessage.status !== 'resolved' ? (
                      <button
                        type="button"
                        disabled={isUpdating === selectedMessage.id}
                        onClick={() => handleMarkAsResolved(selectedMessage.id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>Markahan bilang Naaksiyunan (Resolved)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isUpdating === selectedMessage.id}
                        onClick={() => handleMarkAsRead(selectedMessage.id)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                      >
                        <Archive className="w-4 h-4" />
                        <span>Ibalik sa Nabasa (Active)</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isUpdating === selectedMessage.id}
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer"
                    title="Burahin ang mensaheng ito"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center text-slate-600">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Pumili ng Mensahe sa Kaliwa</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    I-click ang alinmang anonymous report sa listahan upang mabasa ang buong ulat at gumawa ng karampatang aksiyon.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Dingalan LGU Environmental Compliance Anonymous Feedback System</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
          >
            Isara
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DELETE ALL ANONYMOUS MESSAGES CONFIRMATION DIALOG                        */}
      {/* ========================================================================= */}
      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-500/70 rounded-3xl p-6 shadow-[0_25px_70px_rgba(244,63,94,0.35)] text-left space-y-4 animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto sm:mx-0 shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white tracking-tight">
                Permanenteng Pagbura ng Lahat ng Mensahe
              </h3>
              <p className="text-xs text-rose-200/90 font-mono font-bold">
                ⚠️ WARNING: IRREVERSIBLE / HINDI MAIBABALIK
              </p>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Sigurado ka bang nais mong permanenteng burahin ang lahat ng <strong>{messages.length}</strong> anonymous messages at reports sa sistema?
                Mawawala ang lahat ng data mula sa database at server.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Paalala: Awtomatiko ring binubura ng system ang mga lumang ulat na lampas na sa 30 araw (1 buwan).</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setIsDeleteAllConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingAll}
                onClick={handleDeleteAll}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono font-black text-xs flex items-center space-x-2 shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingAll ? 'Deleting All...' : 'Yes, Permanently Delete All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
