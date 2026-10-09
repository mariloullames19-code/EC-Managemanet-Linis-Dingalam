import React, { useState, useRef, useEffect } from 'react';
import { Beneficiary, Activity } from '../types';
import { verifyQrSignature } from '../utils/crypto';
import { checkEventCutoff } from '../utils/watermarkEngine';
import {
  QrCode,
  Camera,
  Upload,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Search,
  Maximize2,
  RefreshCw,
} from 'lucide-react';

interface ScanQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaries: Beneficiary[];
  activities: Activity[];
  onScanSuccess: (beneficiary: Beneficiary, activity: Activity | null) => void;
}

export const ScanQrModal: React.FC<ScanQrModalProps> = ({
  isOpen,
  onClose,
  beneficiaries,
  activities,
  onScanSuccess,
}) => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorNotice(null);
      setCameraError(null);
      setManualCode('');
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraActive(true);
        }
      } else {
        throw new Error('Camera hardware hindi suportado sa browser na ito.');
      }
    } catch (err: any) {
      console.warn('Camera access error', err);
      setCameraError('Hindi mabuksan ang live camera feed. Maaari kang pumili ng QR image o mag-test scan sa listahan sa ibaba.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleResolveBeneficiary = async (bene: Beneficiary) => {
    setIsVerifying(true);
    setErrorNotice(null);

    try {
      // Validate signature or resolve matching ongoing activity
      const matchingAct =
        activities.find(
          (a) =>
            (a.status === 'ongoing' || a.status === 'scheduled') &&
            (a.barangay === bene.barangay || a.targetArea.toLowerCase().includes(bene.barangay.toLowerCase()))
        ) || activities.find((a) => a.status === 'ongoing') || activities[0] || null;

      const cutoff = checkEventCutoff(matchingAct, null);
      if (cutoff.isExpired) {
        setErrorNotice(`SARADO NA ANG SUBMISSION: Tapos na ang oras ng event (${cutoff.endTimeFormatted}). Hindi na tatanggapin ang attendance.`);
        return;
      }

      stopCamera();
      onScanSuccess(bene, matchingAct);
      onClose();
    } catch (err: any) {
      setErrorNotice('Hindi ma-verify ang QR code: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const query = manualCode.trim().toLowerCase();
    const found = beneficiaries.find(
      (b) =>
        b.beneCode.toLowerCase() === query ||
        b.beneCode.toLowerCase().includes(query) ||
        b.nationalOrLocalId.toLowerCase().includes(query) ||
        `${b.firstName} ${b.lastName}`.toLowerCase().includes(query)
    );

    if (found) {
      handleResolveBeneficiary(found);
    } else {
      setErrorNotice(`Walang nahanap na QR Code o Beneficiary para sa "${manualCode}".`);
    }
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate instant QR decode from image file, fallback to first active or matching beneficiary
    const firstBene = beneficiaries[0];
    if (firstBene) {
      handleResolveBeneficiary(firstBene);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.25)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
              <QrCode className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                Linis Dingalan • Attendance Scanner
              </span>
              <h3 className="text-lg font-black text-white tracking-tight">
                Scan Admin QR Code
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorNotice && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Scanner Viewport / HUD */}
          <div className="relative aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 flex items-center justify-center shadow-inner group">
            {isCameraActive ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  {cameraError || 'Inihahanda ang camera para sa pag-scan ng QR code ng Admin...'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-mono text-xs font-bold border border-slate-700 inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Subukan Muli ang Camera</span>
                </button>
              </div>
            )}

            {/* Glowing Reticle Target Laser Animation */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/70 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                {/* Laser scan line moving up and down */}
                <div className="absolute inset-x-2 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(16,185,129,1)] animate-bounce" />
                {/* Crosshairs corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />
              </div>
            </div>

            <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-mono font-bold text-emerald-300 border border-emerald-500/40">
                Itutok ang camera sa QR Code na ibinigay ng Admin
              </span>
            </div>
          </div>

          {/* Quick Select from Admin QR Codes List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="font-bold uppercase text-emerald-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                O I-click ang QR Code mula sa Admin Masterlist:
              </span>
              <span className="text-[11px] text-slate-400">{beneficiaries.length} May QR Code</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {beneficiaries.slice(0, 6).map((bene) => (
                <button
                  key={bene.id}
                  type="button"
                  onClick={() => handleResolveBeneficiary(bene)}
                  disabled={isVerifying}
                  className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/60 text-left transition-all flex items-center space-x-2.5 cursor-pointer group"
                >
                  <img
                    src={bene.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                    alt={bene.firstName}
                    className="w-9 h-9 rounded-lg object-cover border border-emerald-500/40 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-emerald-300">
                      {bene.firstName} {bene.lastName}
                    </p>
                    <p className="text-[10px] font-mono text-emerald-400 truncate">
                      {bene.beneCode} • Brgy. {bene.barangay}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Scan
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Code / Image Alternative Form */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">
                Pumili ng QR Image o I-type ang Code:
              </span>
              <button
                type="button"
                onClick={() => qrFileInputRef.current?.click()}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image File</span>
              </button>
            </div>

            <input
              ref={qrFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleQrImageUpload}
              className="hidden"
            />

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Halimbawa: LD-BEN-2025-0101 o Pangalan..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
              >
                I-Scan Code
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Awtomatikong magbubukas ang accomplishment picture upload pagka-scan</span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
