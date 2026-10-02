import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
  ShieldCheck,
  QrCode,
  Users,
  Calendar,
  FileText,
  Lock,
  HardDrive,
  Cpu,
  Clock,
  Sparkles,
  Terminal,
  LogIn,
  LogOut,
  UserCheck,
  Bell,
  Images,
  Upload,
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  onOpenLoginModal: () => void;
  onOpenPersonalQrModal?: () => void;
  onLogout?: () => void;
  pendingApprovalsCount?: number;
  onOpenApprovalsModal?: () => void;
  attendancesCount?: number;
  onOpenAccomplishmentModal?: () => void;
  onOpenScanQrModal?: () => void;
  onOpenManualUploadModal?: () => void;
  onOpenGenerateQrModal?: () => void;
  onOpenEventNoticeModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenLoginModal,
  onOpenPersonalQrModal,
  onLogout,
  pendingApprovalsCount = 0,
  onOpenApprovalsModal,
  attendancesCount = 0,
  onOpenAccomplishmentModal,
  onOpenScanQrModal,
  onOpenManualUploadModal,
  onOpenGenerateQrModal,
  onOpenEventNoticeModal,
}) => {
  const [phTime, setPhTime] = useState<string>('');
  const isAdminOrSuperAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPhTime(
        new Intl.DateTimeFormat('en-PH', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now) + ' PST'
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isSuperadmin = currentUser.role === 'superadmin';

  return (
    <header className="sticky top-2 z-40 px-2 sm:px-4 w-full transition-all">
      {/* Floating Frosted Glassmorphism Navigation Capsule */}
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)] rounded-full px-3 sm:px-5 py-2 flex items-center justify-between gap-2.5 text-slate-100 w-full">
        {/* Left Section: eC access Logo & System Name */}
        <div
          onClick={() => setActiveTab('homepage')}
          className="flex items-center space-x-2.5 cursor-pointer shrink-0 group select-none"
        >
          {/* Official eC access Logo */}
          <div className="flex items-center">
            <svg
              viewBox="0 0 205 64"
              className="h-6 sm:h-7 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="header-c-letter-shimmer" x1="-100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#00c875" />
                  <stop offset="35%" stopColor="#00c875" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="65%" stopColor="#a7f3d0" />
                  <stop offset="100%" stopColor="#00c875" />
                  <animate attributeName="x1" from="-120%" to="180%" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="x2" from="-20%" to="280%" dur="2.8s" repeatCount="indefinite" />
                </linearGradient>

                <linearGradient id="header-access-letter-shimmer" x1="-100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#00c875" />
                  <stop offset="35%" stopColor="#00c875" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="65%" stopColor="#a7f3d0" />
                  <stop offset="100%" stopColor="#00c875" />
                  <animate attributeName="x1" from="-120%" to="180%" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="x2" from="-20%" to="280%" dur="2.8s" repeatCount="indefinite" />
                </linearGradient>

                <linearGradient id="header-e-letter-shimmer" x1="-100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#19255a" />
                  <stop offset="35%" stopColor="#19255a" />
                  <stop offset="50%" stopColor="#93c5fd" />
                  <stop offset="65%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#19255a" />
                  <animate attributeName="x1" from="-120%" to="180%" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="x2" from="-20%" to="280%" dur="2.8s" repeatCount="indefinite" />
                </linearGradient>
              </defs>

              <path
                d="M34 60 C18 60 5 47 5 31 C5 15 18 2 34 2 C47 2 57 10 61 22 L47 26 C45 18 40 14 34 14 C24 14 17 22 17 31 C17 41 24 48 34 48 C40 48 45 44 47 37 L61 41 C57 52 47 60 34 60 Z"
                fill="#181818"
                transform="translate(2, 2.5)"
                opacity="0.75"
              />
              <path
                d="M34 60 C18 60 5 47 5 31 C5 15 18 2 34 2 C47 2 57 10 61 22 L47 26 C45 18 40 14 34 14 C24 14 17 22 17 31 C17 41 24 48 34 48 C40 48 45 44 47 37 L61 41 C57 52 47 60 34 60 Z"
                fill="url(#header-c-letter-shimmer)"
              />
              <path
                d="M32 20 C24 20 18.5 25.5 18.5 33 C18.5 40.5 24 46 32 46 C37.5 46 41.5 43 43.5 39.5 L37.5 36.5 C36.5 38 34.5 39.5 32 39.5 C28.5 39.5 25.5 37 25.5 34 L45 34 C45.2 33 45.2 32 45.2 31 C45.2 24.5 39.5 20 32 20 Z"
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <path
                d="M32 21 C25 21 20 26 20 33 C20 40 25 45 32 45 C37 45 40.5 42.5 42.5 39 L37.5 36.5 C36.5 38 34.5 39 32 39 C29 39 26.5 37 26.5 34.5 L44 34.5 C44.1 33.6 44.1 32.8 44.1 32 C44.1 25.5 39 21 32 21 Z M26.5 30.5 C27 27.5 29.2 25.5 32 25.5 C35 25.5 37.5 27.5 37.8 30.5 L26.5 30.5 Z"
                fill="url(#header-e-letter-shimmer)"
              />
              <text
                x="68"
                y="46"
                fill="#1f1f1f"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="38"
                letterSpacing="-1.8"
                opacity="0.8"
                dx="2"
                dy="2.5"
              >
                access
              </text>
              <text
                x="68"
                y="46"
                fill="url(#header-access-letter-shimmer)"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="38"
                letterSpacing="-1.8"
              >
                access
              </text>
            </svg>
          </div>

          <div className="border-l border-slate-700/60 pl-2">
            <div className="flex items-center space-x-1">
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white uppercase group-hover:text-emerald-300 transition-colors">
                Linis Dingalan
              </span>
              <span className="text-[10px] font-mono font-bold text-cyan-400">
                EC
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-mono hidden sm:block">
              PESO & MENRO Dingalan, Aurora
            </p>
          </div>
        </div>

        {/* Center Section: Navigation Pills */}
        <nav className="hidden xl:flex items-center space-x-1 text-xs font-bold font-mono">
          <button
            onClick={() => setActiveTab('homepage')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'homepage'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('portal')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'portal'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-3 h-3" />
            <span>Field Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('beneficiaries')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'beneficiaries'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Masterlist</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'activities'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Programs</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'reports'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'storage'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-3 h-3" />
            <span>Prune</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1 ${
              activeTab === 'architecture'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-cyan-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>DDL</span>
          </button>
        </nav>

        {/* Right Section: Small Live Clock & Glowing Action Pills */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Small Live Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 text-[11px] font-mono text-slate-300 bg-slate-950/70 border border-slate-700/60 px-2.5 py-1 rounded-full shadow-inner">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{phTime || 'Loading PST...'}</span>
          </div>

          {/* Accomplishment Attendance Records Button (For Admin & Super Admin) */}
          {isAdminOrSuperAdmin && onOpenAccomplishmentModal && (
            <button
              onClick={onOpenAccomplishmentModal}
              className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-xs flex items-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer shrink-0"
              title="Tingnan ang lahat ng accomplishment photos at attendance records ng mga naglinis"
            >
              <Images className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Accomplishment Attendance</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px]">
                {attendancesCount}
              </span>
            </button>
          )}

          {/* Log Out Button */}
          <button
            onClick={onLogout || onOpenLoginModal}
            className="px-3 py-1 rounded-full bg-slate-900/80 hover:bg-rose-950/80 border border-slate-700/80 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 font-bold text-xs tracking-wide shadow transition-all flex items-center space-x-1 shrink-0 cursor-pointer"
            title="Mag-log out sa system"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar - Touch-Optimized with horizontal smooth swipe */}
      <div className="flex lg:hidden overflow-x-auto py-2 px-1 mt-1.5 space-x-2 scrollbar-none text-xs font-mono font-bold select-none touch-pan-x">
        {[
          { id: 'homepage', label: 'Overview', icon: Sparkles },
          { id: 'portal', label: 'Field Terminal', icon: QrCode },
          { id: 'beneficiaries', label: 'Masterlist', icon: Users },
          { id: 'activities', label: 'Programs', icon: Calendar },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'audit', label: 'Audit Trail', icon: Terminal },
          { id: 'storage', label: 'Photo Prune', icon: HardDrive },
          { id: 'architecture', label: 'DDL Schemas', icon: Cpu },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-full whitespace-nowrap border transition-all flex items-center space-x-1.5 active:scale-95 touch-manipulation cursor-pointer shadow-md ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-900/90 backdrop-blur-lg text-slate-300 border-slate-700/70 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
