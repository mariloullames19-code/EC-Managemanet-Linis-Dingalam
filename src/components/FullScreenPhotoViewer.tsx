import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  Calendar,
  MapPin,
  UserCheck,
  Sparkles,
  Info,
  Navigation,
  FileText,
  ShieldCheck,
  RotateCcw,
  EyeOff,
  Lock,
} from 'lucide-react';
import { formatPhilippineDateTime } from '../utils/philippineClock';
import { SendAnonymousMessageModal } from './SendAnonymousMessageModal';

export interface FullScreenPhotoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  beneficiaryName?: string;
  beneficiaryCode?: string;
  activityTitle?: string;
  locationDescription?: string;
  cleanupNotes?: string;
  timestamp?: string;
  localPhTime?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  altitudeMeters?: number | null;
  verifiedByOfficer?: string;
}

export const FullScreenPhotoViewer: React.FC<FullScreenPhotoViewerProps> = ({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  beneficiaryName = 'Benepisyaryo',
  beneficiaryCode = 'DING-000',
  activityTitle = 'Linis Dingalan Environmental Compliance Program',
  locationDescription = 'Coastal Area, Dingalan, Aurora',
  cleanupNotes,
  timestamp,
  localPhTime,
  latitude,
  longitude,
  accuracyMeters,
  altitudeMeters,
  verifiedByOfficer,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isAnonymousModalOpen, setIsAnonymousModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync index if initialIndex changes
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < photos.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, photos]);

  // Reset zoom & pan when switching photo
  useEffect(() => {
    setZoomLevel(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  }, [currentIndex]);

  // Philippine Date Time calculation based on Asia/Manila (UTC+8)
  const dtInfo = formatPhilippineDateTime(timestamp || localPhTime, localPhTime);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleBrowserFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Browser fullscreen error:', err);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleBrowserFullscreen();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      } else if (e.key === 'i' || e.key === 'I') {
        setShowInfoPanel((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, toggleBrowserFullscreen]);

  // Dragging / Panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Download high-resolution photo with descriptive file name
  const handleDownloadPhoto = () => {
    const photoUrl = photos[currentIndex];
    if (!photoUrl) return;

    const link = document.createElement('a');
    link.href = photoUrl;
    const cleanDate = dtInfo.dayAndDateTagalog.replace(/[\s,]+/g, '_');
    const cleanTime = dtInfo.exactTimeWithSeconds.replace(/[\s:]+/g, '-');
    link.download = `Accomplishment_${beneficiaryCode}_${cleanDate}_${cleanTime}_Larawan-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-2xl flex flex-col justify-between overflow-hidden select-none animate-fadeIn"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* ========================================================================= */}
      {/* TOP HEADER: ORAS NG PILIPINAS + EXACT UPLOAD TIME + CONTROLS               */}
      {/* ========================================================================= */}
      <div className="relative z-30 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-950/90 border-b border-emerald-500/30 backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5 shadow-2xl">
        
        {/* Left Side: Philippine Time & Upload Stamp */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
            <span className="text-base sm:text-lg leading-none">🇵🇭</span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-1.5 text-[9px] sm:text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Oras ng Pilipinas (PST • UTC+8)</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-300">Patunay sa Pag-upload</span>
            </div>

            {/* Exact Day & Time Banner */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm font-sans font-bold text-white">
              <span className="flex items-center gap-1 text-emerald-300">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Araw: <strong>{dtInfo.dayOfWeekTagalog}</strong> ({dtInfo.weekdayEn}), {dtInfo.monthTagalog} {dtInfo.dayNum}, {dtInfo.yearNum}</span>
              </span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="flex items-center gap-1 text-cyan-300 font-mono">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                <span>Eksaktong Oras: <strong className="text-white bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40">{dtInfo.exactTimeWithSeconds} PST</strong></span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Photo Counter + Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 ml-auto">
          {/* Anonymous Message Button */}
          <button
            type="button"
            onClick={() => setIsAnonymousModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:scale-105 active:scale-95"
            title="Magpadala ng Anonymous Message sa Admin ukol sa larawang ito (Ligtas at Kumpidensiyal)"
          >
            <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Anonymous Message</span>
          </button>

          {/* Photos Counter */}
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] sm:text-xs font-bold hidden xs:inline-flex items-center gap-1">
            <span>Larawan</span>
            <strong className="text-white">{currentIndex + 1}</strong>
            <span>/</span>
            <span>{photos.length}</span>
          </span>

          {/* Toggle Details HUD */}
          <button
            type="button"
            onClick={() => setShowInfoPanel((prev) => !prev)}
            className={`p-2 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              showInfoPanel
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Ipakita/Itago ang detalye ng attendee at lugar"
          >
            <Info className="w-4 h-4" />
            <span className="hidden md:inline">{showInfoPanel ? 'Itago Detalye' : 'Ipakita Detalye'}</span>
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom Percentage / Reset */}
          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-emerald-300 font-mono text-xs transition-colors cursor-pointer"
            title="I-reset ang laki (100%)"
          >
            {Math.round(zoomLevel * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3.5}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Rotate */}
          <button
            type="button"
            onClick={handleRotate}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Paikutin ang larawan (Rotate)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Download Photo */}
          <button
            type="button"
            onClick={handleDownloadPhoto}
            className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-white transition-colors cursor-pointer"
            title="I-download ang larawang ito sa buong kalidad"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleBrowserFullscreen}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isBrowserFullscreen ? 'Lumabas sa Fullscreen (F)' : 'I-fullscreen ang Buong Screen (F)'}
          >
            {isBrowserFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 hover:bg-rose-900/80 hover:text-white transition-colors cursor-pointer ml-1"
            title="Isara ang Full-Screen Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CENTER VIEWPORT: TRUE FULL-SCREEN HIGH RESOLUTION PHOTO STAGE             */}
      {/* ========================================================================= */}
      <div
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4 touch-none"
        onMouseDown={handleMouseDown}
      >
        {/* Navigation Arrow Previous */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-3 sm:p-4 rounded-2xl bg-slate-950/80 hover:bg-emerald-950/90 border border-slate-700 hover:border-emerald-400 text-white shadow-2xl backdrop-blur-md transition-all cursor-pointer group hover:scale-110 active:scale-95"
            title="Nakaraang Larawan (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Main Photo with Zoom & Pan */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <img
            src={currentPhoto}
            alt={`Accomplishment Proof ${currentIndex + 1}`}
            className="max-w-[96vw] max-h-[82vh] w-auto h-auto object-contain rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] border-2 border-emerald-500/40 select-none"
            draggable={false}
          />
        </div>

        {/* Navigation Arrow Next */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-3 sm:p-4 rounded-2xl bg-slate-950/80 hover:bg-emerald-950/90 border border-slate-700 hover:border-emerald-400 text-white shadow-2xl backdrop-blur-md transition-all cursor-pointer group hover:scale-110 active:scale-95"
            title="Susunod na Larawan (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FLOATING HUD CARD: BENEFICIARY, AREA, GEOTAG & EXACT UPLOAD TIME          */}
      {/* ========================================================================= */}
      {showInfoPanel && (
        <div className="relative z-30 mx-auto w-full max-w-4xl px-3 sm:px-6 pb-2 sm:pb-3 animate-fadeIn">
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/85 border border-emerald-500/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-left space-y-2">
            
            {/* Row 1: Attendee Name + Badge Code + Compliance Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                    <span>{beneficiaryName}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {beneficiaryCode}
                    </span>
                  </h4>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AUDITED GEOTAG PROOF</span>
                </span>
                {verifiedByOfficer && (
                  <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                    Opisyal: {verifiedByOfficer}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Cleaned Area + Activity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Lugar kung Saang Area Nakapaglinis:</span>
                  <span className="font-bold text-emerald-300 text-xs sm:text-sm">{locationDescription}</span>
                </div>
              </div>

              <div className="flex items-start gap-1.5 text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Gawain / Programa:</span>
                  <span className="font-bold text-white text-xs">{activityTitle}</span>
                </div>
              </div>
            </div>

            {/* Row 3: Philippine Time Exact Timestamp & GPS Coordinates */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  <strong>Na-upload Noong:</strong> {dtInfo.dayOfWeekTagalog}, {dtInfo.monthTagalog} {dtInfo.dayNum}, {dtInfo.yearNum} ganap na <strong className="text-white underline">{dtInfo.exactTimeWithSeconds} PST</strong>
                </span>
              </div>

              {typeof latitude === 'number' && typeof longitude === 'number' && (
                <div className="flex items-center gap-1 text-slate-400">
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  <span>GPS: {latitude.toFixed(6)}° N, {longitude.toFixed(6)}° E {accuracyMeters ? `(±${accuracyMeters}m)` : ''}</span>
                </div>
              )}
            </div>

            {/* Cleanup Notes (if any) */}
            {cleanupNotes && (
              <div className="pt-1.5 border-t border-slate-800/80 text-xs text-slate-300 flex items-start gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span className="font-sans italic text-slate-200">{cleanupNotes}</span>
              </div>
            )}

            {/* Anonymous Report Prompt Strip inside HUD */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Nais magsumbong o magbigay ng anonymous ulat ukol sa larawan?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAnonymousModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white font-mono text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer shrink-0"
              >
                <EyeOff className="w-3 h-3 text-emerald-400" />
                <span>Mag-send ng Anonymous Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* THUMBNAIL STRIP (When multiple photos exist)                               */}
      {/* ========================================================================= */}
      {photos.length > 1 && (
        <div className="relative z-30 px-4 py-2 bg-slate-950/95 border-t border-slate-800 flex items-center justify-center space-x-2 overflow-x-auto">
          {photos.map((photoUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                currentIndex === idx
                  ? 'border-emerald-400 scale-105 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'border-slate-700 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photoUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[8px] font-mono text-emerald-300 text-center font-bold">
                #{idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
      {/* Anonymous Message Modal */}
      {isAnonymousModalOpen && (
        <SendAnonymousMessageModal
          isOpen={isAnonymousModalOpen}
          onClose={() => setIsAnonymousModalOpen(false)}
          referencedPhotoUrl={currentPhoto}
          referencedActivityTitle={activityTitle}
          referencedLocation={locationDescription}
        />
      )}
    </div>
  );
};
