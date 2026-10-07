import React, { useState } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Download,
  Printer,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ScanLine,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  Building2,
  User,
  QrCode as QrIcon,
} from 'lucide-react';
import { useDingalanClock } from '../utils/philippineClock';

interface OfficialQrPassCardProps {
  qrCodeUrl: string;
  payloadUrl?: string;
  title: string;
  subtitle?: string;
  trackingCode: string;
  beneficiaryName?: string;
  departmentOrCluster?: string;
  barangay?: string;
  eventDate?: string;
  timeSlot?: string;
  securityHash?: string;
  isLiveEvent?: boolean;
  onScanAction?: () => void;
  scanActionLabel?: string;
}

export const OfficialQrPassCard: React.FC<OfficialQrPassCardProps> = ({
  qrCodeUrl,
  payloadUrl,
  title,
  subtitle = 'Linis Dingalan Environmental Compliance & Attendance System',
  trackingCode,
  beneficiaryName,
  departmentOrCluster,
  barangay,
  eventDate,
  timeSlot,
  securityHash = 'SEC-LD-VERIFIED-2026',
  isLiveEvent = false,
  onScanAction,
  scanActionLabel,
}) => {
  const [copied, setCopied] = useState(false);
  const [isLaserScanning, setIsLaserScanning] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const clock = useDingalanClock();

  const handleCopy = () => {
    if (payloadUrl) {
      navigator.clipboard.writeText(payloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="relative w-full max-w-md mx-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-slate-100 overflow-hidden font-sans">
        {/* Holographic Security Sheen Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-300 to-cyan-400 animate-pulse" />

        {/* Card Header */}
        <div className="flex items-start justify-between border-b border-emerald-500/30 pb-3.5 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-black text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              LGU
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400">
                  Republic of the Philippines
                </span>
                <span className="text-[9px] text-slate-500">•</span>
                <span className="text-[9px] uppercase font-bold text-slate-300">
                  Dingalan, Aurora
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {title}
              </h3>
              <p className="text-[10px] text-emerald-300/80 font-mono">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300 font-mono shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>{isLiveEvent ? 'LIVE EVENT' : 'VERIFIED ID'}</span>
            </span>
            <span className="text-[9px] text-slate-400 font-mono">
              PST (UTC+8)
            </span>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="relative my-3 flex flex-col items-center justify-center">
          {/* Target Bracket Corner Decorators */}
          <div className="relative p-4 sm:p-5 bg-white rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] border-4 border-emerald-400/40 group overflow-hidden">
            {/* Top-Left Bracket */}
            <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-emerald-600 rounded-tl-lg pointer-events-none" />
            {/* Top-Right Bracket */}
            <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-emerald-600 rounded-tr-lg pointer-events-none" />
            {/* Bottom-Left Bracket */}
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-emerald-600 rounded-bl-lg pointer-events-none" />
            {/* Bottom-Right Bracket */}
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-emerald-600 rounded-br-lg pointer-events-none" />

            {/* Laser Scan Beam Animation */}
            {isLaserScanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_12px_#10b981] animate-bounce pointer-events-none z-10 opacity-75 top-4" />
            )}

            {/* QR Image with Fixed Center Logo Emblem Overlay */}
            <div className="relative inline-flex items-center justify-center">
              <img
                src={qrCodeUrl}
                alt="Official Scannable QR Code"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl select-none"
              />
              {/* Permanent Fixed Center LGU Dingalan Emblem Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white p-0.5 border-2 border-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)] flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#022c22] flex flex-col items-center justify-center text-center p-0.5 border border-amber-400">
                    <span className="text-[9px] sm:text-[10px] font-black text-emerald-300 leading-none">LGU</span>
                    <span className="text-[7px] sm:text-[8px] font-extrabold text-white leading-none tracking-tighter">DINGALAN</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Micro security watermark on QR */}
            <div className="mt-2 text-center border-t border-slate-200 pt-1.5 flex items-center justify-between px-1">
              <span className="font-mono text-[10px] font-bold text-slate-800 tracking-wider">
                {trackingCode}
              </span>
              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                LGU-AURORA
              </span>
            </div>
          </div>

          {/* Laser scan toggler & Fullscreen icon */}
          <div className="flex items-center space-x-2 mt-2.5">
            <button
              type="button"
              onClick={() => setIsLaserScanning(!isLaserScanning)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center space-x-1 transition-all"
            >
              <ScanLine className="w-3 h-3 text-emerald-400" />
              <span>{isLaserScanning ? 'Laser: On' : 'Laser: Off'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center space-x-1 transition-all"
            >
              <Maximize2 className="w-3 h-3 text-cyan-400" />
              <span>Fullscreen Pass</span>
            </button>
          </div>
        </div>

        {/* Pass Details Data Grid */}
        <div className="w-full bg-slate-950/90 border border-emerald-500/20 rounded-2xl p-3 sm:p-4 my-3 space-y-2 text-xs font-mono">
          {beneficiaryName && (
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Pangalan:
              </span>
              <span className="font-bold text-slate-100 truncate max-w-[200px]">
                {beneficiaryName}
              </span>
            </div>
          )}

          {departmentOrCluster && (
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Opisina / Cluster:
              </span>
              <span className="font-semibold text-emerald-300 truncate max-w-[200px]">
                {departmentOrCluster}
              </span>
            </div>
          )}

          {barangay && (
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Barangay:
              </span>
              <span className="text-slate-200">
                Brgy. {barangay}, Dingalan
              </span>
            </div>
          )}

          {eventDate && (
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Petsa:
              </span>
              <span className="text-slate-200 font-semibold">{eventDate}</span>
            </div>
          )}

          {timeSlot && (
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Oras / Call Time:
              </span>
              <span className="text-amber-300 font-semibold">{timeSlot}</span>
            </div>
          )}

          {/* Live Authority Clock Timestamp */}
          <div className="flex items-center justify-between pt-0.5 text-[10px] text-emerald-400/90">
            <span>Oras ng Sistema (PST):</span>
            <span className="font-bold">{clock.timeWithSeconds} • {clock.dateFormatted}</span>
          </div>
        </div>

        {/* Security Hash & Micro-Badge Footer */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 mb-4">
          <span className="truncate max-w-[180px]">HASH: {securityHash}</span>
          <span className="text-emerald-500 font-bold">● TAMPER RESISTANT</span>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {onScanAction && (
            <button
              type="button"
              onClick={onScanAction}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center space-x-2 cursor-pointer col-span-1 sm:col-span-2 active:scale-95"
            >
              <QrIcon className="w-4 h-4 text-slate-950" />
              <span>{scanActionLabel || 'Gamitin Para Magpasa ng Attendance'}</span>
            </button>
          )}

          <a
            href={qrCodeUrl}
            download={`Linis_Dingalan_Official_QR_${trackingCode}.png`}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>I-download ang QR</span>
          </a>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            <span>I-print ang Pass</span>
          </button>

          {payloadUrl && (
            <button
              type="button"
              onClick={handleCopy}
              className="py-2.5 px-3 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl border border-slate-800 flex items-center justify-center space-x-1.5 transition-all col-span-1 sm:col-span-2"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Na-kopya na ang Scannable Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kopyahin ang Direct Scannable Link</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Presenter Mode Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-all flex items-center space-x-2"
          >
            <Minimize2 className="w-5 h-5 text-rose-400" />
            <span className="text-xs font-bold">Isara ang Fullscreen</span>
          </button>

          <div className="text-center mb-6 max-w-lg">
            <span className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>OFFICIAL LGU DINGALAN PRESENTATION QR</span>
            </span>
            <h2 className="text-2xl font-black text-white mt-2">{title}</h2>
            <p className="text-xs text-slate-400 font-mono mt-1">{trackingCode}</p>
          </div>

          <div className="relative p-6 bg-white rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.4)] border-4 border-emerald-500 flex flex-col items-center">
            <img
              src={qrCodeUrl}
              alt="Fullscreen QR"
              className="w-72 h-72 sm:w-96 sm:h-96 object-contain"
            />
            <div className="mt-3 text-center">
              <p className="font-mono text-sm font-black text-slate-900">
                {trackingCode}
              </p>
              <p className="text-xs text-slate-600 font-bold">
                {beneficiaryName || 'MUNICIPALITY OF DINGALAN • PROVINCE OF AURORA'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-mono mt-6">
            I-tutok ang smartphone camera o QR scanner upang ma-scan agad.
          </p>
        </div>
      )}
    </>
  );
};
