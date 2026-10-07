import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  UserCheck,
  UserX,
  Clock,
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
} from 'lucide-react';

interface AccountApprovalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingUsers: User[];
  allUsers: User[];
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  currentAdminName: string;
  currentUserRole?: UserRole;
}

export const AccountApprovalsModal: React.FC<AccountApprovalsModalProps> = ({
  isOpen,
  onClose,
  pendingUsers,
  allUsers,
  onApproveUser,
  onRejectUser,
  currentAdminName,
  currentUserRole = 'superadmin',
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const canApprove = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  if (!isOpen || !canApprove) return null;

  const handleApprove = (user: User) => {
    if (!canApprove) return;
    onApproveUser(user.id);
    setActionSuccess(`Na-approve at na-activate na ang account ni ${user.name} (${user.department}).`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleReject = (user: User) => {
    if (!canApprove) return;
    onRejectUser(user.id);
    setActionSuccess(`Tinanggihan ang registration request ni ${user.name}.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const displayedPending = pendingUsers.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.address && u.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const displayedActive = allUsers
    .filter((u) => u.status === 'active')
    .filter((u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900/95 border border-emerald-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Modal Top Header */}
        <div className="p-3.5 sm:p-6 border-b border-slate-700/60 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-xl font-extrabold text-white tracking-tight">
                  Account Registration Approvals
                </h3>
                {pendingUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    {pendingUsers.length} Pending
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono mt-0.5">
                Approver in Charge: <span className="text-emerald-300 font-bold">{currentAdminName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toast Alert */}
        {actionSuccess && (
          <div className="px-4 sm:px-6 py-2 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Search & Tabs Controls */}
        <div className="p-3 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 bg-slate-900/50">
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({pendingUsers.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active ({allUsers.filter(u => u.status === 'active').length})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search applicant name, dept..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1">
          {activeTab === 'pending' ? (
            displayedPending.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Walang Nakabinbing Rehistrasyon</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-mono">
                  Lahat ng account registration requests ay nasuri at na-proseso na ni {currentAdminName}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayedPending.map((user) => (
                  <div
                    key={user.id}
                    className="bg-slate-950/70 border border-slate-700/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-lg"
                  >
                    {/* User Details */}
                    <div className="flex items-start sm:items-center space-x-4">
                      <img
                        src={user.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                        alt={user.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-500/50 shrink-0 shadow-md"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-extrabold text-white tracking-tight">
                            {user.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            PENDING REVIEW
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-300 font-mono">
                          <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{user.department}</span>
                          </div>

                          {user.age && (
                            <div className="flex items-center space-x-1 text-slate-400">
                              <span>Edad: <strong className="text-white">{user.age}</strong> y/o</span>
                            </div>
                          )}

                          {user.address && (
                            <div className="flex items-center space-x-1 text-slate-400">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                              <span>{user.address}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                          <span>Ref ID: <strong className="text-slate-400">{user.badgeNumber}</strong></span>
                          <span>•</span>
                          <span>Registered: {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'Bago'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Strictly Admin & Superadmin only */}
                    {canApprove && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleReject(user)}
                          className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-900 hover:bg-rose-950/80 border border-slate-700/80 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 text-xs font-bold font-mono flex items-center space-x-1.5 transition-all cursor-pointer"
                          title="Tanggihan ang rehistrasyon"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>

                        <button
                          onClick={() => handleApprove(user)}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-extrabold font-mono flex items-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                          title="I-approve at i-activate ang access"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Approve Access</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {displayedActive.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3"
                >
                  <img
                    src={user.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                    alt={user.name}
                    className="w-11 h-11 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white truncate">{user.name}</h5>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-950/60 rounded border border-emerald-500/30">
                        {user.role.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate font-mono">{user.department}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{user.badgeNumber}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-emerald-400" />
            <span>Ang mga na-approve na user ay agad na makakapag-login gamit ang kanilang rehistradong credentials.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
