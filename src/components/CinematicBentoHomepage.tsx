import React, { useState, useEffect, useRef } from 'react';
import { Activity, Beneficiary, AttendanceRecord, User, UserRole, EventQrBroadcast } from '../types';
import {
  Camera,
  QrCode,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Compass,
  Layers,
  Radio,
  Clock,
  ChevronRight,
  ExternalLink,
  Lock,
  Eye,
  Sliders,
  Play,
  RotateCw,
  Images,
  Upload,
  FileText,
  Wrench,
  Shirt,
  Coffee,
  Calendar,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useDingalanClock } from '../utils/philippineClock';

interface CinematicBentoHomepageProps {
  currentUser: User;
  activities: Activity[];
  beneficiaries: Beneficiary[];
  attendances: AttendanceRecord[];
  onNavigate: (tab: string) => void;
  onOpenLoginModal: () => void;
  onOpenDigitalIdModal: (bene: Beneficiary) => void;
  onOpenAccomplishmentModal?: () => void;
  onOpenScanQrModal?: () => void;
  onOpenManualUploadModal?: () => void;
  onOpenGenerateQrModal?: () => void;
  onOpenEventNoticeModal?: () => void;
  onOpenPersonalQrModal?: () => void;
  eventBroadcast?: EventQrBroadcast | null;
}

export const CinematicBentoHomepage: React.FC<CinematicBentoHomepageProps> = ({
  currentUser,
  activities,
  beneficiaries,
  attendances,
  onNavigate,
  onOpenLoginModal,
  onOpenDigitalIdModal,
  onOpenAccomplishmentModal,
  onOpenScanQrModal,
  onOpenManualUploadModal,
  onOpenGenerateQrModal,
  onOpenEventNoticeModal,
  onOpenPersonalQrModal,
  eventBroadcast,
}) => {
  const { time: phTime } = useDingalanClock();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [radarAngle, setRadarAngle] = useState(0);
  const [watermarkSimulated, setWatermarkSimulated] = useState(false);
  const [activeSector, setActiveSector] = useState<'paltic' | 'aplaya' | 'ibona' | 'poblacion'>('paltic');

  // Featured sample beneficiary
  const featuredBene = beneficiaries[0] || {
    id: 'ben-001-uuid',
    beneCode: 'LD-BEN-2025-0101',
    firstName: 'Danilo',
    lastName: 'Bautista',
    nationalOrLocalId: 'PHILSYS-DING-9021',
    contactNumber: '0917-882-3401',
    barangay: 'Paltic',
    assignedCluster: 'Dingalan Feeder Port & Coastal Watch',
    emergencyContactName: 'Elena Bautista',
    emergencyContactPhone: '0917-882-3402',
    emergencyContactRelation: 'Spouse',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    qrHash: 'a8f3b20c194e82b7',
    createdAt: '2025-02-10T10:00:00Z',
    updatedAt: '2025-02-10T10:00:00Z',
  };

  // Featured ongoing activity
  const ongoingActivity = activities.find((a) => a.status === 'ongoing') || activities[0] || {
    id: 'act-2025-001',
    title: 'Dingalan Feeder Port & Paltic Coastal Cleanliness Operation',
    targetArea: 'Dingalan Feeder Port & Paltic Rock Sea Wall',
    barangay: 'Paltic',
    callTime: '06:00',
    date: '2026-09-27',
    targetBeneficiariesCount: 25,
    assignedBeneficiariesCount: 4,
    attendedBeneficiariesCount: 2,
    status: 'ongoing',
  };

  // Radar sweep animation
  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Generate QR Preview
  useEffect(() => {
    let mounted = true;
    const generate = async () => {
      try {
        const url = `https://linis-dingalan.aurora.gov.ph/attendance/checkin?bene_id=${featuredBene.id}&hash=${featuredBene.qrHash}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 240,
          margin: 1,
          color: {
            dark: '#020617',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        if (mounted) setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error(err);
      }
    };
    generate();
    return () => {
      mounted = false;
    };
  }, [featuredBene]);

  return (
    <div className="relative w-full min-h-screen text-slate-100 overflow-x-hidden font-sans">
      {/* ========================================================================= */}
      {/* CLEAN CINEMATIC OCEAN-CHARCOAL GRADE (#020617) AMBIENT BACKDROP */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Subtle Geometric Background Grid */}
        <div 
          className="absolute inset-0 opacity-[0.07]" 
          style={{
            backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px), radial-gradient(rgba(6, 182, 212, 0.4) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />

        {/* Cinematic Ocean-Charcoal Grade Overlays & Vignette */}
        <div className="absolute inset-0 bg-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />

        {/* Ambient Subtle Studio Lighting Beams */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-[600px] h-48 bg-emerald-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* FOREGROUND HERO CONTENT (FIT-TO-SCREEN COMPACT GLASS BANNER) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full px-2 sm:px-4 md:px-6 pt-1 pb-10">
        {/* Fit-To-Screen Hero Banner */}
        <section className="pt-1 pb-3">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl space-y-3 sm:space-y-4">
            {/* Top Horizontal Row: Live Telemetry Badge + Small Horizontal Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 sm:pb-3.5 border-b border-slate-800/80">
              <div className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start space-x-2 px-3 py-1.5 sm:py-1 rounded-full bg-slate-950/70 border border-emerald-500/40 text-emerald-300 text-[9px] sm:text-[11px] font-mono font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)] text-center sm:text-left">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="tracking-wide">
                  LIVE FIELD TELEMETRY • COASTAL SECTOR 04 — DINGALAN PACIFIC SEAWALL
                </span>
              </div>

              {/* Active User Status or Quick Telemetry Indicator (No duplicate buttons with Header) */}
              <div className="flex items-center gap-2 shrink-0">
                {currentUser && (
                  <div className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Naka-login: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Title & Subtitle in Full Widescreen Width */}
            <div className="max-w-5xl">
              <h1 className="text-xl xs:text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1] drop-shadow-xl">
                Linis Dingalan{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  EC Management
                </span>
              </h1>

              <p className="mt-1.5 sm:mt-2 text-[11px] sm:text-sm text-slate-200 font-normal leading-relaxed drop-shadow max-w-4xl">
                Innovation in Action Project of MENRO in Collaboration with PESO. Activity-based participants' inventory monitoring with photographic compliance and real-time GPS watermarking across 11 coastal & river Barangays.
              </p>

              {/* Primary Call-To-Action Button (Deduplicated: Field Terminal when logged in, Login when not logged in) */}
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                {currentUser ? (
                  <button
                    onClick={() => onNavigate('portal')}
                    className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
                    <span>Buksan ang Field Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={onOpenLoginModal}
                    className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
                    <span>Admin & Super Admin Login</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* LATEST EVENT QR & PAALALA BROADCAST BANNER */}
        {eventBroadcast && (
          <section className="mb-6 animate-fadeIn">
            <div className="bg-gradient-to-r from-slate-900/90 via-emerald-950/40 to-slate-900/90 border-2 border-emerald-500/50 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-3 sm:space-y-0 sm:space-x-4 w-full">
                  {eventBroadcast.qrDataUrl ? (
                    <img
                      src={eventBroadcast.qrDataUrl}
                      alt="Event QR"
                      onClick={onOpenEventNoticeModal}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 bg-white object-contain border-2 border-emerald-400/60 shadow-lg shrink-0 cursor-pointer hover:scale-105 transition-transform"
                      title="I-click upang palakihin ang QR Code"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                      <QrCode className="w-10 h-10" />
                    </div>
                  )}

                  <div className="space-y-1 w-full">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center">
                        <Sparkles className="w-3 h-3 mr-1 text-emerald-400" />
                        Admin Broadcast: Opisyal na Event QR & Paalala
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {eventBroadcast.sentByAdminName}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-white">
                      {eventBroadcast.activityTitle} — Brgy. {eventBroadcast.barangay}
                    </h3>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-300 font-mono pt-0.5">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{eventBroadcast.startTime} – {eventBroadcast.estimatedEndTime} ({eventBroadcast.totalHours})</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="truncate max-w-[250px]">{eventBroadcast.targetArea}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
                  {onOpenEventNoticeModal && (
                    <button
                      onClick={onOpenEventNoticeModal}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>Basahin ang Lahat ng Paalala</span>
                    </button>
                  )}

                  {onOpenScanQrModal && (
                    <button
                      onClick={onOpenScanQrModal}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer transform hover:scale-105 active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4 text-slate-950" />
                      <span>I-Scan & I-Upload ang Patunay</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================================= */}
        {/* BELOW THE FOLD: ASYMMETRIC BENTO GRID OF GLASS CARDS */}
        {/* ========================================================================= */}
        <section id="bento-grid-section" className="pt-2 pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-3">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Modular Bento Architecture</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                Field Operations & Geotag Telemetry Hub
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              Engineered with frosted glassmorphism, glowing luminous borders, and real-time sensor streams for bright coastal sunlight legibility.
            </p>
          </div>

          {/* Asymmetric Bento Grid (4 core tiles) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 items-stretch">
            {/* --------------------------------------------------------------------- */}
            {/* TILE 1: LARGE TILE (Span 7) - Camera HUD Crosshairs & Geotag Watermark */}
            {/* --------------------------------------------------------------------- */}
            <div className="md:col-span-7 bg-slate-900/60 backdrop-blur-2xl border border-emerald-500/25 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col justify-between relative overflow-hidden group">
              {/* Subtle green ambient inner corner glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-2xl pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Optical Viewfinder & Geotag Watermark HUD
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        HTML5 Canvas Stamping Engine • High-Contrast Coastal Grade
                      </p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    LIVE HUD 1080P
                  </span>
                </div>

                {/* Viewfinder Frame with Tactical Corner Crosshairs */}
                <div className="mt-4 relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-slate-950 shadow-2xl">
                  {/* Photo Background (Simulated coastal cleanup frame) */}
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1280&auto=format&fit=crop&q=80"
                    alt="Field Worker Preview"
                    className="w-full h-full object-cover filter contrast-105"
                  />

                  {/* Tactical Reticle & Corner Brackets */}
                  <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                      <div className="flex items-center space-x-2 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/40 text-[9px] font-mono text-emerald-300">
                        <span>FOV 78°</span>
                        <span>•</span>
                        <span>F/1.8</span>
                        <span>•</span>
                        <span>ISO 100</span>
                      </div>
                      <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                    </div>

                    {/* Center Crosshair Target */}
                    <div className="self-center flex items-center justify-center">
                      <div className="w-12 h-12 border border-emerald-400/60 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                      <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {/* Lower-Third Burned HUD Banner Preview */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-3.5 pt-6 text-left border-t border-emerald-500/40">
                    <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400 font-bold tracking-widest uppercase mb-1">
                      <span>LINIS DINGALAN EC MANAGEMENT // AUDITED GEOTAG</span>
                      <span className="text-cyan-300 font-bold">LGU DINGALAN SEC-V1</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs sm:text-sm font-extrabold text-white">
                          DANILO P. BAUTISTA [LD-BEN-2025-0101]
                        </p>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          ACTIVITY: {ongoingActivity.title} • Brgy. Paltic
                        </p>
                        <p className="text-[10px] font-mono text-sky-400 font-bold">
                          GPS: 15.394218° N, 121.401142° E (±3.5m) • {phTime || '06:14 AM PST'}
                        </p>
                      </div>

                      {/* Glowing Compliant Badge */}
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <span className="block text-[8px] font-mono font-bold text-emerald-300">
                          STATUS
                        </span>
                        <span className="block text-xs font-mono font-extrabold text-white tracking-wider">
                          COMPLIANT
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Burn Format: 1280x720 WebP (82% Quality Compression)
                </span>
                <button
                  onClick={() => onNavigate('portal')}
                  className="px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow transition-all"
                >
                  <span>Open Active Camera</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* TILE 2: TALL TILE (Span 5) - Topographic GPS Radar Map */}
            {/* --------------------------------------------------------------------- */}
            <div className="md:col-span-5 bg-slate-900/60 backdrop-blur-2xl border border-cyan-500/25 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col justify-between relative overflow-hidden">
              {/* Subtle cyan ambient glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-2xl pointer-events-none" />

              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Topographic GPS Radar
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        Dingalan Pacific Coastline • 11 Barangays
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    14 SATS LOCKED
                  </span>
                </div>

                {/* Radar Mockup Container with Sweeping Beam */}
                <div className="mt-4 relative aspect-square w-full rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden flex items-center justify-center p-3">
                  {/* Concentric Radar Range Rings */}
                  <div className="absolute inset-4 rounded-full border border-cyan-500/20" />
                  <div className="absolute inset-14 rounded-full border border-cyan-500/20" />
                  <div className="absolute inset-24 rounded-full border border-cyan-500/25" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-cyan-500/20" />
                  <div className="absolute inset-y-0 left-1/2 border-l border-cyan-500/20" />

                  {/* Topographic Coastline SVG Overlay */}
                  <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 200 200">
                    {/* Simulated Dingalan Coastline & Sierra Madre mountain contours */}
                    <path
                      d="M 50,20 Q 80,60 70,100 T 90,160 Q 120,180 150,190"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                    />
                    <path
                      d="M 40,25 Q 70,65 60,105 T 80,165 Q 110,185 140,195"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                    <path
                      d="M 30,35 Q 60,75 50,115 T 70,175"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  </svg>

                  {/* Rotating Sweeping Radar Beam */}
                  <div
                    className="absolute w-full h-full pointer-events-none"
                    style={{ transform: `rotate(${radarAngle}deg)` }}
                  >
                    <div
                      className="w-1/2 h-1/2 origin-bottom-right"
                      style={{
                        background: 'conic-gradient(from 0deg, rgba(6, 182, 212, 0.4) 0deg, transparent 60deg)',
                      }}
                    />
                  </div>

                  {/* Waypoint Blips (Dingalan Key Areas) */}
                  <div
                    className={`absolute top-[42%] left-[46%] flex items-center space-x-1 cursor-pointer transition-transform ${
                      activeSector === 'paltic' ? 'scale-110' : 'opacity-80'
                    }`}
                    onClick={() => setActiveSector('paltic')}
                  >
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                    <span className="text-[9px] font-mono font-bold text-emerald-300 bg-slate-900/90 px-1 py-0.5 rounded border border-emerald-500/30">
                      Paltic Port
                    </span>
                  </div>

                  <div
                    className={`absolute top-[62%] left-[54%] flex items-center space-x-1 cursor-pointer transition-transform ${
                      activeSector === 'aplaya' ? 'scale-110' : 'opacity-80'
                    }`}
                    onClick={() => setActiveSector('aplaya')}
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
                    </span>
                    <span className="text-[9px] font-mono text-cyan-300 bg-slate-900/90 px-1 py-0.5 rounded border border-cyan-500/30">
                      Aplaya Coast
                    </span>
                  </div>

                  <div
                    className={`absolute bottom-[22%] left-[64%] flex items-center space-x-1 cursor-pointer transition-transform ${
                      activeSector === 'ibona' ? 'scale-110' : 'opacity-80'
                    }`}
                    onClick={() => setActiveSector('ibona')}
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                    </span>
                    <span className="text-[9px] font-mono text-amber-300 bg-slate-900/90 px-1 py-0.5 rounded border border-amber-500/30">
                      Ibona River
                    </span>
                  </div>
                </div>

                {/* Radar Telemetry Metrics */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">COORDINATES</span>
                    <span className="text-cyan-400 font-bold block text-[11px]">
                      15.3942° N, 121.4011° E
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">ELEVATION</span>
                    <span className="text-emerald-400 font-bold block text-[11px]">
                      6.2m MSL (Coastal)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Geofence: Dingalan Coastal Zone
                </span>
                <button
                  onClick={() => onNavigate('activities')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center"
                >
                  <span>View All Sectors</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* TILE 3: MEDIUM TILE (Span 6) - QR Verified-ID Badge */}
            {/* --------------------------------------------------------------------- */}
            <div className="md:col-span-6 bg-slate-900/60 backdrop-blur-2xl border border-emerald-500/25 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col justify-between relative overflow-hidden">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Cryptographic QR ID Badge
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        Universal Landing & Tokenized Check-In
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center">
                    <ShieldCheck className="w-3 h-3 mr-1" /> HMAC-SHA256
                  </span>
                </div>

                {/* ID Card Glass Surface */}
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 border border-emerald-500/30 shadow-xl flex flex-col sm:flex-row items-center gap-4">
                  {/* Photo & Details */}
                  <div className="flex-1 space-y-2 text-left">
                    <div className="flex items-center space-x-3">
                      <img
                        src={featuredBene.photoUrl}
                        alt={featuredBene.firstName}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400/80 shadow"
                      />
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                          {featuredBene.beneCode}
                        </span>
                        <h4 className="text-sm font-extrabold text-white">
                          {featuredBene.firstName} {featuredBene.lastName}
                        </h4>
                        <p className="text-[11px] text-slate-300 flex items-center mt-0.5">
                          <MapPin className="w-3 h-3 text-emerald-400 mr-1" />
                          Brgy. {featuredBene.barangay}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                      <p className="text-slate-400">
                        Cluster: <span className="text-emerald-300 font-semibold">{featuredBene.assignedCluster}</span>
                      </p>
                      <p className="text-slate-400 font-mono">
                        PhilSys ID: <span className="text-slate-200">{featuredBene.nationalOrLocalId}</span>
                      </p>
                      <p className="text-slate-400 font-mono">
                        ICE: {featuredBene.emergencyContactName} ({featuredBene.emergencyContactPhone})
                      </p>
                    </div>
                  </div>

                  {/* QR Code Container */}
                  <div className="p-2.5 bg-white rounded-2xl shadow-lg border border-slate-200 shrink-0 flex flex-col items-center">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="Beneficiary QR Code"
                        className="w-24 h-24 object-contain"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-slate-100 rounded-lg animate-pulse" />
                    )}
                    <span className="text-[8px] font-mono font-bold text-slate-900 mt-1">
                      SCAN FOR CHECK-IN
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Sig: {featuredBene.qrHash.slice(0, 12)}...
                </span>
                <button
                  onClick={() => onOpenDigitalIdModal(featuredBene)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs flex items-center space-x-1 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Printable ID Card</span>
                </button>
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* TILE 4: MEDIUM TILE (Span 6) - Circular Compliance Gauge */}
            {/* --------------------------------------------------------------------- */}
            <div className="md:col-span-6 bg-slate-900/60 backdrop-blur-2xl border border-cyan-500/25 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] flex flex-col justify-between relative overflow-hidden">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        Compliance Gauge & Verification
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400">
                        Real-time Quota Completion Ratio
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    PESO & MENRO AUDITED
                  </span>
                </div>

                {/* Circular Gauge Graphic & Breakdown */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Circular Ring Gauge */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="rgba(30, 41, 59, 0.8)"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      {/* Animated Glowing Progress Ring (94%) */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        stroke="url(#compliance-gradient)"
                        strokeWidth="10"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 * (1 - 0.948)}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="compliance-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black font-mono text-white tracking-tight">
                        94.8%
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                        COMPLIANT
                      </span>
                    </div>
                  </div>

                  {/* Sub-Metrics Breakdown */}
                  <div className="sm:col-span-7 space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Total Workforce Complied:</span>
                      <span className="font-mono font-bold text-emerald-400">142 Workers</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Pending Verification:</span>
                      <span className="font-mono font-bold text-amber-400">8 Workers</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Tampered / Forged Tokens:</span>
                      <span className="font-mono font-bold text-slate-300">0 Attempts</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                      <span className="text-slate-400">Photo Storage Optimization:</span>
                      <span className="font-mono font-bold text-cyan-400">82% Saved</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  Sign-Off: MENRO Inspector + PESO Head
                </span>
                <button
                  onClick={() => onNavigate('reports')}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600/90 hover:bg-cyan-600 text-white font-bold text-xs flex items-center space-x-1 shadow transition-all"
                >
                  <span>Export Report (CSV/PDF)</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
