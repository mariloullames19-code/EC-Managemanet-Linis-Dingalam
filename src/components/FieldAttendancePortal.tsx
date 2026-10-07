import React, { useState, useEffect, useRef } from 'react';
import { Activity, Beneficiary, AttendanceRecord, User } from '../types';
import { burnGeotagWatermark, getGpsCoordinates, formatCoordinatesDMS, formatPSTDate, GeotagResult } from '../utils/watermarkEngine';
import { verifyQrSignature } from '../utils/crypto';
import { UploadAccomplishmentModal } from './UploadAccomplishmentModal';
import { FullScreenPhotoViewer } from './FullScreenPhotoViewer';
import { formatPhilippineDateTime } from '../utils/philippineClock';
import {
  Camera,
  QrCode,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  ShieldCheck,
  Compass,
  Sparkles,
  ArrowRight,
  UserCheck,
  Check,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface FieldAttendancePortalProps {
  activities: Activity[];
  beneficiaries: Beneficiary[];
  currentUser: User;
  initialActivity?: Activity | null;
  initialBeneficiary?: Beneficiary | null;
  onSubmitAttendance: (payload: any) => Promise<{ success: boolean; attendance: AttendanceRecord }>;
}

export const FieldAttendancePortal: React.FC<FieldAttendancePortalProps> = ({
  activities,
  beneficiaries,
  currentUser,
  initialActivity,
  initialBeneficiary,
  onSubmitAttendance,
}) => {
  // Step flow: 1 = Scan/Identify, 2 = Select Activity & GPS, 3 = Capture & Geotag, 4 = Confirmed
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Beneficiary & QR State
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(initialBeneficiary || null);
  const [qrVerificationStatus, setQrVerificationStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [qrErrorMessage, setQrErrorMessage] = useState<string | null>(null);

  // Activity State
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(initialActivity || null);

  // GPS Sensor State
  const [gpsLoading, setGpsLoading] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
  } | null>(null);

  // Camera & Accomplishment Photo State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedRawImage, setCapturedRawImage] = useState<string | null>(null);
  const [watermarkedResult, setWatermarkedResult] = useState<GeotagResult | null>(null);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<AttendanceRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAccomplishmentPopupOpen, setIsAccomplishmentPopupOpen] = useState(false);
  const [isFullscreenPhotoOpen, setIsFullscreenPhotoOpen] = useState(false);

  // Manual QR input or search
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Auto-resolve ongoing activity on initial load
  useEffect(() => {
    if (!selectedActivity) {
      const ongoing = activities.find((a) => a.status === 'ongoing') || activities[0];
      if (ongoing) setSelectedActivity(ongoing);
    }
  }, [activities, selectedActivity]);

  // Handle URL query parameters or initialBeneficiary
  useEffect(() => {
    if (initialBeneficiary) {
      handleSelectBeneficiary(initialBeneficiary);
    }
  }, [initialBeneficiary]);

  // Check URL query parameters (e.g. ?bene_id=xxx&hash=yyy)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const beneId = params.get('bene_id');
    const hash = params.get('hash');

    if (beneId && hash) {
      const found = beneficiaries.find((b) => b.id === beneId);
      if (found) {
        verifyAndSetBeneficiary(found, hash);
      }
    }
  }, [beneficiaries]);

  // Auto-acquire GPS when entering Step 2 or 3
  useEffect(() => {
    if (currentStep >= 2 && !currentCoords) {
      refreshGps();
    }
  }, [currentStep]);

  const refreshGps = async () => {
    setGpsLoading(true);
    try {
      const preferredBarangay = selectedActivity?.barangay || selectedBeneficiary?.barangay || 'Poblacion';
      const coords = await getGpsCoordinates(preferredBarangay);
      setCurrentCoords(coords);
    } catch (err) {
      console.error('GPS acquisition error', err);
    } finally {
      setGpsLoading(false);
    }
  };

  const verifyAndSetBeneficiary = async (bene: Beneficiary, signature?: string) => {
    setQrVerificationStatus('verifying');
    setQrErrorMessage(null);

    const sig = signature || bene.qrHash;
    const isValid = await verifyQrSignature(bene.id, bene.beneCode, sig);

    if (isValid) {
      setQrVerificationStatus('valid');
      setSelectedBeneficiary(bene);
      // Auto-bind to ongoing activity matching beneficiary's barangay if available
      const matchingAct = activities.find(
        (a) => (a.status === 'ongoing' || a.status === 'scheduled') &&
               (a.barangay === bene.barangay || a.targetArea.toLowerCase().includes(bene.barangay.toLowerCase()))
      ) || activities.find((a) => a.status === 'ongoing') || activities[0];

      if (matchingAct) {
        setSelectedActivity(matchingAct);
      }
      setCurrentStep(2);
      // Automatic pop-up: Open Upload Accomplishment Pictures dialog immediately
      setIsAccomplishmentPopupOpen(true);
    } else {
      setQrVerificationStatus('invalid');
      setQrErrorMessage('Cryptographic signature mismatch! The QR code may have been altered or forged.');
    }
  };

  const handleSelectBeneficiary = (bene: Beneficiary) => {
    verifyAndSetBeneficiary(bene, bene.qrHash);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;

    const term = manualCodeInput.trim().toLowerCase();
    const found = beneficiaries.find(
      (b) =>
        b.beneCode.toLowerCase().includes(term) ||
        b.nationalOrLocalId.toLowerCase().includes(term) ||
        `${b.firstName} ${b.lastName}`.toLowerCase().includes(term)
    );

    if (found) {
      verifyAndSetBeneficiary(found, found.qrHash);
    } else {
      setQrErrorMessage(`No beneficiary found matching "${manualCodeInput}".`);
    }
  };

  // Camera Management
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraActive(true);
        }
      } else {
        throw new Error('Camera hardware API not available in this browser environment');
      }
    } catch (err: any) {
      console.warn('Camera stream failed, fallback to file snapshot:', err.message);
      setCameraError('Direct camera stream inaccessible. Use the Snapshot / File Upload option below.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Trigger camera on reaching Step 3
  useEffect(() => {
    if (currentStep === 3) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [currentStep]);

  // Capture Live Photo from Camera Video element
  const handleCapturePhoto = async () => {
    if (!videoRef.current || !selectedBeneficiary || !selectedActivity) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedRawImage(rawDataUrl);
      stopCamera();

      // Immediately Burn Geotag Watermark
      await processWatermark(rawDataUrl);
    } catch (err) {
      console.error('Capture error', err);
    }
  };

  // Handle File Upload or Mock Accomplishment Capture
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawData = event.target?.result as string;
      setCapturedRawImage(rawData);
      stopCamera();
      await processWatermark(rawData);
    };
    reader.readAsDataURL(file);
  };

  const handleSimulatedFieldCapture = async (photoPresetUrl?: string) => {
    const sampleUrl =
      photoPresetUrl ||
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1280&auto=format&fit=crop&q=80';
    setCapturedRawImage(sampleUrl);
    stopCamera();
    await processWatermark(sampleUrl);
  };

  // Watermark Execution Pipeline
  const processWatermark = async (imageSource: string) => {
    if (!selectedBeneficiary || !selectedActivity) return;

    setIsWatermarking(true);
    try {
      const coords = currentCoords || (await getGpsCoordinates(selectedActivity.barangay));

      const result = await burnGeotagWatermark(
        imageSource,
        {
          beneficiaryName: `${selectedBeneficiary.firstName} ${selectedBeneficiary.lastName}`,
          beneficiaryCode: selectedBeneficiary.beneCode,
          activityTitle: selectedActivity.title,
          assignedArea: selectedActivity.targetArea,
          barangay: selectedActivity.barangay,
          verifiedByOfficer: currentUser.name,
        },
        1280,
        0.82,
        coords
      );

      setWatermarkedResult(result);
    } catch (err) {
      console.error('Watermarking failed', err);
      alert('Watermark engine error: ' + (err as any).message);
    } finally {
      setIsWatermarking(false);
    }
  };

  // Final Commit to Server
  const handleFinalSubmit = async () => {
    if (!selectedBeneficiary || !selectedActivity || !watermarkedResult || !currentCoords) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        activity_id: selectedActivity.id,
        beneficiary_id: selectedBeneficiary.id,
        qr_signature: selectedBeneficiary.qrHash,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        accuracy_meters: currentCoords.accuracy,
        altitude_meters: currentCoords.altitude,
        location_description: `${selectedActivity.targetArea}, Brgy. ${selectedActivity.barangay}`,
        photo_watermarked: watermarkedResult.watermarkedDataUrl,
        photo_size_kb: Math.round(watermarkedResult.fileSizeBytes / 1024),
        notes: `Complied on-site at ${selectedActivity.targetArea}. Verified by ${currentUser.name}.`,
      };

      const res = await onSubmitAttendance(payload);
      setSubmittedRecord(res.attendance);
      setCurrentStep(4);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setSelectedBeneficiary(null);
    setQrVerificationStatus('idle');
    setCapturedRawImage(null);
    setWatermarkedResult(null);
    setSubmittedRecord(null);
    setSubmitError(null);
    setCurrentStep(1);
  };

  return (
    <div className="space-y-3 sm:space-y-6 max-w-4xl mx-auto">
      {/* High-Contrast Mobile Terminal Header */}
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/30 shrink-0">
              <QrCode className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Field Terminal • Outdoor HUD Mode
                </span>
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h1 className="text-base sm:text-2xl font-black text-white tracking-tight leading-tight">
                Linis Dingalan QR Check-In
              </h1>
            </div>
          </div>

          {/* Supervisor / MENRO Officer Badge */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between sm:justify-end space-x-2 text-[10px] sm:text-xs">
            <div className="text-left sm:text-right">
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono">FIELD OPERATOR</p>
              <p className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[180px]">
                {currentUser.name}
              </p>
            </div>
            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {currentUser.department}
            </span>
          </div>
        </div>

        {/* Step Progress Bar - Big Outdoor Touch Steps (Compact on Mobile) */}
        <div className="mt-3 sm:mt-5 grid grid-cols-4 gap-1 sm:gap-2 pt-2.5 sm:pt-4 border-t border-slate-800">
          {[
            { step: 1, title: 'Scan ID', shortTitle: '1. Scan', icon: QrCode },
            { step: 2, title: 'GPS & Area', shortTitle: '2. GPS', icon: MapPin },
            { step: 3, title: 'Live Geotag', shortTitle: '3. Geotag', icon: Camera },
            { step: 4, title: 'Verified', shortTitle: '4. Done', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const isPassed = currentStep > item.step;
            const isCurrent = currentStep === item.step;

            return (
              <div
                key={item.step}
                className={`flex items-center justify-center py-1 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                    : isPassed
                    ? 'bg-slate-800/80 text-emerald-400 border-emerald-500/40 font-bold'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800 font-medium'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="sm:hidden text-[10px] font-mono uppercase tracking-tight">
                    {item.shortTitle}
                  </span>
                  <span className="hidden sm:inline text-[11px] uppercase tracking-wide">
                    {item.step}. {item.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: SCAN OR IDENTIFY BENEFICIARY */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4">
            <div>
              <h3 className="text-sm sm:text-lg font-bold text-white flex items-center">
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mr-1.5" />
                Step 1: Scan Beneficiary QR or Lookup Code
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Scan dynamic QR code on printed ID card or mobile screen.
              </p>
            </div>

            {qrErrorMessage && (
              <div className="p-2.5 sm:p-3.5 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{qrErrorMessage}</span>
              </div>
            )}

            {/* Quick Manual Search Form */}
            <form onSubmit={handleManualSearch} className="flex gap-1.5 sm:gap-2">
              <input
                type="text"
                placeholder="Enter Beneficiary Code (e.g. LD-BEN-2025-0101)..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-2 sm:px-5 sm:py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow shrink-0 flex items-center"
              >
                Lookup
              </button>
            </form>

            {/* Field Supervisor Fast Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <span className="text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 mr-1" />
                  Quick Field Roster (Tap to Simulate Scan):
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
                  {beneficiaries.length} Registered
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 sm:max-h-72 overflow-y-auto p-0.5">
                {beneficiaries.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBeneficiary(b)}
                    className="p-2 sm:p-3 bg-slate-900/90 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/60 rounded-xl text-left transition-all flex items-center space-x-2.5 sm:space-x-3 group"
                  >
                    <img
                      src={b.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt={b.firstName}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-slate-700 group-hover:border-emerald-400 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-white text-xs truncate group-hover:text-emerald-300">
                        {b.firstName} {b.lastName}
                      </div>
                      <div className="font-mono text-[10px] text-emerald-400">
                        {b.beneCode}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Brgy. {b.barangay} • {b.assignedCluster}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: VERIFIED BENEFICIARY & WORK AREA / GPS BINDING */}
      {/* ========================================================================= */}
      {currentStep === 2 && selectedBeneficiary && (
        <div className="space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-5">
            {/* Identity Card Bar */}
            <div className="p-4 bg-slate-900 border-2 border-emerald-500/50 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={selectedBeneficiary.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedBeneficiary.firstName}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {selectedBeneficiary.beneCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1" /> HMAC VERIFIED
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-white">
                    {selectedBeneficiary.firstName} {selectedBeneficiary.middleName ? `${selectedBeneficiary.middleName[0]}.` : ''} {selectedBeneficiary.lastName} {selectedBeneficiary.suffix || ''}
                  </h4>
                  <p className="text-xs text-slate-300">
                    Brgy. {selectedBeneficiary.barangay} • Cluster: {selectedBeneficiary.assignedCluster}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs text-slate-400 hover:text-white underline font-mono"
              >
                Change
              </button>
            </div>

            {/* Target Activity Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center">
                <Calendar className="w-4 h-4 text-cyan-400 mr-1.5" />
                Active Work Program / Coastal Assignment:
              </label>
              <select
                value={selectedActivity?.id || ''}
                onChange={(e) => {
                  const act = activities.find((a) => a.id === e.target.value);
                  if (act) setSelectedActivity(act);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-white font-medium focus:border-emerald-500 focus:outline-none"
              >
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.status.toUpperCase()}] {a.title} ({a.targetArea}, Brgy. {a.barangay})
                  </option>
                ))}
              </select>
            </div>

            {/* Live GPS Coordinates Sensor Card */}
            <div className="p-4 bg-slate-900/90 border border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center">
                  <Compass className="w-4 h-4 text-cyan-400 mr-1.5 animate-spin-slow" />
                  HTML5 GPS Geofencing Sensor:
                </span>
                <button
                  type="button"
                  onClick={refreshGps}
                  disabled={gpsLoading}
                  className="px-2.5 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${gpsLoading ? 'animate-spin text-emerald-400' : ''}`} />
                  Refresh GPS Fix
                </button>
              </div>

              {currentCoords ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono">LATITUDE</p>
                    <p className="text-xs font-mono font-bold text-sky-400">
                      {currentCoords.latitude}° N
                    </p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono">LONGITUDE</p>
                    <p className="text-xs font-mono font-bold text-sky-400">
                      {currentCoords.longitude}° E
                    </p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono">SENSOR ACCURACY</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      ±{currentCoords.accuracy} meters
                    </p>
                  </div>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-mono">ELEVATION</p>
                    <p className="text-xs font-mono font-bold text-slate-300">
                      {currentCoords.altitude || 8}m MSL
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 animate-pulse">
                  Acquiring satellite constellation fix for Dingalan, Aurora...
                </div>
              )}

              {currentCoords && (
                <p className="text-[11px] text-slate-400 font-mono text-center">
                  DMS: {formatCoordinatesDMS(currentCoords.latitude, currentCoords.longitude)} • Dingalan Coastal Zone
                </p>
              )}
            </div>

            {/* Accomplishment Upload Proof Card - Prompt upon scanning QR */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-slate-900 border-2 border-emerald-500/70 shadow-[0_0_30px_rgba(16,185,129,0.25)] space-y-3">
              <div className="flex items-center space-x-2 text-emerald-300 font-mono font-bold text-xs uppercase tracking-wide">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Patunay sa Pagdalo sa Linis Dingalan Event</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                Mag-upload ng mga accomplishment picture (kahit ilang picture) bilang patunay na nakadalo at naglinis si <strong className="text-white">{selectedBeneficiary.firstName} {selectedBeneficiary.lastName}</strong> sa naturang activity.
              </p>
              <button
                type="button"
                onClick={() => setIsAccomplishmentPopupOpen(true)}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-sm sm:text-base rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.45)] flex items-center justify-center space-x-2.5 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <Upload className="w-5 h-5 text-slate-950" />
                <span>Mag-Upload ng Accomplishment Pictures (Kahit Ilang Picture)</span>
              </button>
            </div>

            {/* Proceed to Camera Button */}
            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                Back to QR
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-xl flex items-center space-x-2 transition-transform active:scale-95"
              >
                <span>Proceed to Accomplishment Camera</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: LIVE CAMERA ACCOMPLISHMENT PHOTO & WATERMARKING HUD */}
      {/* ========================================================================= */}
      {currentStep === 3 && selectedBeneficiary && selectedActivity && (
        <div className="space-y-4">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center">
                  <Camera className="w-5 h-5 text-emerald-400 mr-2" />
                  Step 3: Geotagged Accomplishment Photo Capture
                </h3>
                <p className="text-xs text-slate-400">
                  Take a clear photograph of beneficiary at work in {selectedActivity.targetArea}.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                PST: {formatPSTDate()}
              </span>
            </div>

            {/* Live Camera Viewfinder or Captured Preview */}
            <div className="relative w-full aspect-[4/3] sm:aspect-video bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
              {!capturedRawImage && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* High-visibility outdoor crosshair overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400/60 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1" />
                    </div>
                  </div>

                  {/* Camera Top HUD */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-950/80 text-emerald-300 border border-emerald-500/40">
                      LIVE OPTICAL SENSOR • 1280x720
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-950/80 text-cyan-300 border border-cyan-500/40">
                      GPS FIX: {currentCoords ? `±${currentCoords.accuracy}m` : 'Acquiring...'}
                    </span>
                  </div>

                  {/* Camera Bottom Shutter Trigger (Extra large for outdoor gloved fingers) */}
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center space-x-6">
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 border-4 border-white shadow-2xl flex items-center justify-center transition-transform active:scale-90"
                      title="Snap Photograph"
                    >
                      <Camera className="w-8 h-8 text-slate-950" />
                    </button>
                  </div>
                </>
              )}

              {/* Watermarked Result Preview */}
              {capturedRawImage && watermarkedResult && (
                <div
                  className="relative w-full h-full cursor-pointer group"
                  onClick={() => setIsFullscreenPhotoOpen(true)}
                  title="Pindutin para i-fullscreen kasama ang eksaktong oras ng Pilipinas"
                >
                  <img
                    src={watermarkedResult.watermarkedDataUrl}
                    alt="Watermarked accomplishment"
                    className="w-full h-full object-contain bg-slate-950"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white font-mono text-[10px] font-bold px-2.5 py-1 rounded shadow">
                    CANVAS HUD BURNED & COMPRESSED
                  </div>
                  <div className="absolute bottom-3 inset-x-3 bg-slate-950/80 text-center py-1.5 rounded-lg border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold opacity-90 group-hover:opacity-100 transition-opacity">
                    Pindutin para I-fullscreen (Tingnan sa Oras ng Pilipinas)
                  </div>
                </div>
              )}

              {isWatermarking && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-center p-4">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                  <p className="text-sm font-bold text-white">
                    Processing HTML5 Canvas Watermark...
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Burning Dingalan LGU Seal, Coordinates & Timestamp onto pixel array
                  </p>
                </div>
              )}
            </div>

            {/* Alternative Quick Presets / File Upload for Desktop Testing */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
              <div className="flex items-center space-x-2">
                <label className="px-3 py-2 bg-slate-900 hover:bg-slate-750 text-slate-300 rounded-xl border border-slate-700 cursor-pointer flex items-center font-medium">
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                  <span>Upload Field File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleSimulatedFieldCapture()}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-750 text-slate-300 rounded-xl border border-slate-700 flex items-center font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Simulate Coastal Photo
                </button>
              </div>

              {capturedRawImage && (
                <button
                  type="button"
                  onClick={() => {
                    setCapturedRawImage(null);
                    setWatermarkedResult(null);
                    startCamera();
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-mono"
                >
                  Retake Photograph
                </button>
              )}
            </div>

            {/* Watermark Engine Output Stats */}
            {watermarkedResult && (
              <div className="p-3 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-emerald-400 font-bold">
                    ✓ Watermark Burned Successfully:
                  </span>
                  <span className="text-slate-300">
                    Size: {Math.round(watermarkedResult.fileSizeBytes / 1024)} KB (WebP/JPEG Standardized)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Burned Metadata: {selectedBeneficiary.firstName} {selectedBeneficiary.lastName} [{selectedBeneficiary.beneCode}] • {selectedActivity.title} • Lat {watermarkedResult.coordinates.latitude}, Lng {watermarkedResult.coordinates.longitude} • PST {watermarkedResult.localPhTime}
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3.5 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-200 text-xs">
                {submitError}
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
              >
                Back to Logistics
              </button>

              <button
                type="button"
                disabled={!watermarkedResult || isSubmitting}
                onClick={handleFinalSubmit}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-xl flex items-center space-x-2 transition-transform active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    <span>Transmitting Compliance Payload...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-1" />
                    <span>Commit & Verify Attendance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: VERIFIED CONFIRMATION RECEIPT */}
      {/* ========================================================================= */}
      {currentStep === 4 && submittedRecord && (
        <div className="bg-slate-800/90 border-2 border-emerald-500 rounded-2xl p-6 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              STATUS: CONFIRMED & COMPLIED
            </span>
            <h2 className="text-2xl font-black text-white mt-2">
              Geotagged Attendance Recorded!
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Beneficiary compliance photograph has been watermarked with GPS telemetry and securely committed to PESO & MENRO audit servers.
            </p>
          </div>

          {/* Receipt Breakdown Card */}
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-xl p-4 text-left text-xs space-y-2 font-mono">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Beneficiary:</span>
              <span className="text-white font-bold">{submittedRecord.beneficiaryName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">ID Code:</span>
              <span className="text-emerald-400">{submittedRecord.beneficiaryCode}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Work Activity:</span>
              <span className="text-slate-200 truncate max-w-[220px]">{submittedRecord.activityTitle}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">GPS Coordinates:</span>
              <span className="text-sky-400 font-bold">{submittedRecord.latitude}° N, {submittedRecord.longitude}° E</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Oras ng Pilipinas:</span>
              <span className="text-cyan-300 font-bold">
                {formatPhilippineDateTime(submittedRecord.timestamp || submittedRecord.localPhTime).fullCombinedTagalog}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verified By:</span>
              <span className="text-emerald-300">{submittedRecord.verifiedByOfficerName}</span>
            </div>
          </div>

          {/* Next Action */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => setIsFullscreenPhotoOpen(true)}
              className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 text-emerald-300 font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-95 inline-flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4 mr-1.5 text-emerald-400" />
              <span>I-fullscreen ang Larawan</span>
            </button>

            <button
              type="button"
              onClick={handleResetForNext}
              className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-xl transition-transform active:scale-95 inline-flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4 mr-1.5" />
              <span>Scan Next Beneficiary</span>
            </button>
          </div>
        </div>
      )}

      {/* Automatic Upload Accomplishment Pictures Modal */}
      {selectedBeneficiary && (
        <UploadAccomplishmentModal
          isOpen={isAccomplishmentPopupOpen}
          onClose={() => setIsAccomplishmentPopupOpen(false)}
          beneficiary={selectedBeneficiary}
          activity={selectedActivity}
          currentUser={currentUser}
          onSubmitAttendance={onSubmitAttendance}
          onSuccessSubmitted={(att) => {
            setSubmittedRecord(att);
            setCurrentStep(4);
            setIsAccomplishmentPopupOpen(false);
          }}
        />
      )}

      {/* Fullscreen Photo Viewer */}
      {isFullscreenPhotoOpen && (watermarkedResult || submittedRecord) && (
        <FullScreenPhotoViewer
          isOpen={isFullscreenPhotoOpen}
          onClose={() => setIsFullscreenPhotoOpen(false)}
          photos={
            submittedRecord?.accomplishmentPhotos && submittedRecord.accomplishmentPhotos.length > 0
              ? submittedRecord.accomplishmentPhotos
              : submittedRecord?.photoWatermarkedUrl
              ? [submittedRecord.photoWatermarkedUrl]
              : watermarkedResult?.watermarkedDataUrl
              ? [watermarkedResult.watermarkedDataUrl]
              : []
          }
          beneficiaryName={
            submittedRecord?.beneficiaryName ||
            (selectedBeneficiary ? `${selectedBeneficiary.firstName} ${selectedBeneficiary.lastName}` : 'Benepisyaryo')
          }
          beneficiaryCode={submittedRecord?.beneficiaryCode || selectedBeneficiary?.beneCode || 'DING-000'}
          activityTitle={submittedRecord?.activityTitle || selectedActivity?.title || 'Linis Dingalan Cleanup'}
          locationDescription={submittedRecord?.locationDescription || selectedActivity?.targetArea || 'Dingalan, Aurora'}
          timestamp={submittedRecord?.timestamp || new Date().toISOString()}
          localPhTime={submittedRecord?.localPhTime || watermarkedResult?.localPhTime}
          latitude={submittedRecord?.latitude || currentCoords?.latitude}
          longitude={submittedRecord?.longitude || currentCoords?.longitude}
          accuracyMeters={submittedRecord?.accuracyMeters || currentCoords?.accuracy}
          altitudeMeters={submittedRecord?.altitudeMeters || currentCoords?.altitude}
          verifiedByOfficer={submittedRecord?.verifiedByOfficerName || currentUser.name}
        />
      )}
    </div>
  );
};
