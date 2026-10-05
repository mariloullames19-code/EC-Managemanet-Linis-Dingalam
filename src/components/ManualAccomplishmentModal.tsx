import React, { useState, useRef, useEffect } from 'react';
import { Beneficiary, Activity, AttendanceRecord, User } from '../types';
import { getGpsCoordinates, burnGeotagWatermark, detectDingalanAreaByCoordinates, formatCoordinatesDMS } from '../utils/watermarkEngine';
import {
  Camera,
  Upload,
  Images,
  MapPin,
  Clock,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  FileCheck,
  UserCheck,
  Calendar,
  RefreshCw,
  Edit3,
  Navigation,
  Compass,
} from 'lucide-react';

interface ManualAccomplishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaries: Beneficiary[];
  activities: Activity[];
  currentUser: User;
  onSubmitAttendance: (payload: any) => Promise<{ success: boolean; attendance: AttendanceRecord }>;
  onSuccessSubmitted?: (attendance: AttendanceRecord) => void;
}

export const ManualAccomplishmentModal: React.FC<ManualAccomplishmentModalProps> = ({
  isOpen,
  onClose,
  beneficiaries,
  activities,
  currentUser,
  onSubmitAttendance,
  onSuccessSubmitted,
}) => {
  // Field 1: Full Name (User has full control to type or select)
  const [fullName, setFullName] = useState<string>('');
  const [selectedBeneId, setSelectedBeneId] = useState<string>('');
  
  // Field 2: Cleaned Area (User has full control to type or select)
  const [cleanedArea, setCleanedArea] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [accomplishmentNotes, setAccomplishmentNotes] = useState<string>('');
  
  // Realtime GPS & Detected Area
  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
  } | null>(null);
  const [realtimeDetectedArea, setRealtimeDetectedArea] = useState<string>('Brgy. Paltic (Dingalan Feeder Port & Seawall Area)');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState<AttendanceRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Acquire Realtime GPS
  const refreshGps = async () => {
    setGpsLoading(true);
    try {
      const coords = await getGpsCoordinates('Paltic');
      setGpsCoords(coords);
      const detected = detectDingalanAreaByCoordinates(coords.latitude, coords.longitude);
      setRealtimeDetectedArea(detected);
    } catch (err) {
      console.warn('Realtime GPS error', err);
    } finally {
      setGpsLoading(false);
    }
  };

  // Initialize defaults
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setErrorMessage(null);
      setUploadedPhotos([]);
      setAccomplishmentNotes('');

      // Auto-populate Field 1: Full Name
      const matching = beneficiaries.find(
        (b) => `${b.firstName} ${b.lastName}`.toLowerCase() === currentUser.name.toLowerCase()
      ) || beneficiaries[0];

      if (matching) {
        setSelectedBeneId(matching.id);
        setFullName(`${matching.firstName} ${matching.lastName}`);
      } else {
        setFullName(currentUser.name || 'Danilo Bautista');
      }

      // Auto-populate Field 2: Cleaned Area
      const ongoing = activities.find((a) => a.status === 'ongoing') || activities[0];
      if (ongoing) {
        setSelectedActivityId(ongoing.id);
        setCleanedArea(`${ongoing.title} (${ongoing.targetArea}, Brgy. ${ongoing.barangay})`);
      } else {
        setCleanedArea('Dingalan Feeder Port & Paltic Coastal Cleanliness Operation');
      }

      // Start Realtime GPS tracking
      refreshGps();
    }
  }, [isOpen, beneficiaries, activities, currentUser]);

  if (!isOpen) return null;

  const currentBeneficiary = beneficiaries.find((b) => b.id === selectedBeneId) || beneficiaries[0];
  const currentActivity = activities.find((a) => a.id === selectedActivityId) || activities[0];

  // Handle Selection Change for Beneficiary
  const handleSelectBeneficiary = (beneId: string) => {
    setSelectedBeneId(beneId);
    const found = beneficiaries.find((b) => b.id === beneId);
    if (found) {
      setFullName(`${found.firstName} ${found.lastName}`);
    }
  };

  // Handle Selection Change for Activity
  const handleSelectActivity = (actId: string) => {
    setSelectedActivityId(actId);
    const found = activities.find((a) => a.id === actId);
    if (found) {
      setCleanedArea(`${found.title} (${found.targetArea}, Brgy. ${found.barangay})`);
    }
  };

  // Use Realtime GPS Area for Field 2
  const handleApplyRealtimeGpsArea = () => {
    if (realtimeDetectedArea) {
      setCleanedArea(realtimeDetectedArea);
    }
  };

  // Handle Multiple File Upload
  const handleMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const fileList = Array.from(files);
    const newPhotos: string[] = [];

    for (const file of fileList) {
      try {
        const rawData = await readFileAsDataUrl(file);
        const coords = gpsCoords || (await getGpsCoordinates(currentActivity?.barangay || 'Paltic'));
        const watermarked = await burnGeotagWatermark(
          rawData,
          {
            beneficiaryName: fullName || `${currentBeneficiary?.firstName} ${currentBeneficiary?.lastName}`,
            beneficiaryCode: currentBeneficiary?.beneCode || 'LD-BEN-2025-0101',
            activityTitle: cleanedArea || currentActivity?.title || 'Linis Dingalan Clean-Up Operation',
            assignedArea: cleanedArea || currentActivity?.targetArea || realtimeDetectedArea,
            barangay: currentBeneficiary?.barangay || 'Paltic',
            verifiedByOfficer: currentUser.name,
          },
          1280,
          0.82,
          coords
        );
        newPhotos.push(watermarked.watermarkedDataUrl);
      } catch (err: any) {
        console.error('Failed to process photo', err);
      }
    }

    if (newPhotos.length > 0) {
      setUploadedPhotos((prev) => [...prev, ...newPhotos]);
    }
    setIsProcessing(false);
    if (e.target) e.target.value = '';
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSamplePhotos = async () => {
    setIsProcessing(true);

    const sampleImages = [
      'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=1000&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1000&auto=format&fit=crop&q=80',
    ];

    const coords = gpsCoords || (await getGpsCoordinates(currentActivity?.barangay || 'Paltic'));
    const generated: string[] = [];

    for (const url of sampleImages) {
      try {
        const watermarked = await burnGeotagWatermark(
          url,
          {
            beneficiaryName: fullName || `${currentBeneficiary?.firstName} ${currentBeneficiary?.lastName}`,
            beneficiaryCode: currentBeneficiary?.beneCode || 'LD-BEN-2025-0101',
            activityTitle: cleanedArea || currentActivity?.title || 'Linis Dingalan Clean-Up Operation',
            assignedArea: cleanedArea || currentActivity?.targetArea || realtimeDetectedArea,
            barangay: currentBeneficiary?.barangay || 'Paltic',
            verifiedByOfficer: currentUser.name,
          },
          1280,
          0.82,
          coords
        );
        generated.push(watermarked.watermarkedDataUrl);
      } catch (err) {
        console.error(err);
      }
    }

    setUploadedPhotos((prev) => [...prev, ...generated]);
    setIsProcessing(false);
  };

  // Submit Attendance
  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setErrorMessage('Pakiusap ilagay ang inyong Full Name sa Number 1.');
      return;
    }

    if (!cleanedArea.trim()) {
      setErrorMessage('Pakiusap ilagay kung saang area kayo nakapaglinis sa Number 2.');
      return;
    }

    if (uploadedPhotos.length === 0) {
      setErrorMessage('Pakiusap mag-upload ng kahit isang (1) accomplishment picture bilang patunay ng inyong pagdalo.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const coords = gpsCoords || (await getGpsCoordinates(currentActivity?.barangay || 'Paltic'));

      const payload = {
        activity_id: currentActivity?.id || 'act-001',
        beneficiary_id: currentBeneficiary?.id || 'ben-001',
        qr_signature: currentBeneficiary?.qrHash || 'LD-ADMIN-GEN-2026',
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: coords.accuracy,
        altitude_meters: coords.altitude || 10,
        location_description: `${cleanedArea} [Realtime GPS: ${realtimeDetectedArea}]`,
        photo_watermarked: uploadedPhotos[0],
        accomplishment_photos: uploadedPhotos,
        photo_size_kb: Math.round(uploadedPhotos[0].length / 1024),
        notes: accomplishmentNotes || `Accomplishment attendance ni ${fullName} sa ${cleanedArea}. Nagsumite ng ${uploadedPhotos.length} larawan gamit ang realtime GPS.`,
        accomplishment_notes: accomplishmentNotes || `Linis Dingalan patunay sa paglilinis sa ${cleanedArea}.`,
      };

      const res = await onSubmitAttendance(payload);
      if (res.success && res.attendance) {
        setSubmittedRecord(res.attendance);
        setIsSuccess(true);
        if (onSuccessSubmitted) {
          onSuccessSubmitted(res.attendance);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Nagkaroon ng problema sa pagsusumite ng manual accomplishment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.25)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md">
              <Upload className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-cyan-400">
                Linis Dingalan • Accomplishment Attendance Submission
              </span>
              <h3 className="text-lg font-black text-white tracking-tight">
                Upload Accomplishment Attendance
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* SUCCESS SCREEN */}
          {isSuccess ? (
            <div className="text-center py-8 space-y-4 animate-scaleIn">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Accomplishment Proof Recorded
                </span>
                <h4 className="text-2xl font-black text-white">
                  Matagumpay na Naisumite ang Patunay!
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Ang {uploadedPhotos.length} na accomplishment picture ay naipasa na at matatanggap ng Admin account bilang opisyal na patunay ng inyong attendance sa paglilinis.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-left space-y-1.5 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Attendee (Pangalan):</span>
                  <span className="text-white font-bold">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lugar na Nilinis:</span>
                  <span className="text-emerald-400 font-bold">{cleanedArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Realtime GPS Area:</span>
                  <span className="text-cyan-300 font-bold">{realtimeDetectedArea}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mga Larawan:</span>
                  <span className="text-cyan-400 font-bold">{uploadedPhotos.length} Pictures</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-300 font-bold">VERIFIED CLEANUP ATTENDANCE</span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full max-w-md mx-auto py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
              >
                Tapos na (Done)
              </button>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* FIELD 1: FULL NAME NG BENEPISYARYO / ATTENDEE (Malaya nyang ilalagay) */}
              {/* ========================================================================= */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>1. Full Name ng Benepisyaryo / Attendee <span className="text-rose-400">*</span></span>
                  </label>
                  <span className="text-[10px] font-mono text-emerald-400">Kayo ang magpapasya ng ilalagay</span>
                </div>

                {/* Free Text Input for Full Name */}
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ilagay ang inyong Buong Pangalan (Full Name)..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-emerald-400 text-white text-xs sm:text-sm font-sans font-bold shadow-inner"
                  />
                  <Edit3 className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Optional Quick Select from Registered List */}
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>O pumili mula sa Masterlist:</span>
                  </div>
                  <select
                    value={selectedBeneId}
                    onChange={(e) => handleSelectBeneficiary(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300 text-xs font-sans focus:border-emerald-400"
                  >
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.firstName} {b.lastName} ({b.beneCode}) — Brgy. {b.barangay}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* FIELD 2: LUGAR KUNG SAANG AREA NAKAPAGLINIS (Malaya nyang ilalagay) */}
              {/* ========================================================================= */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>2. Lugar kung Saang Area Nakapaglinis <span className="text-rose-400">*</span></span>
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400">Kayo ang magpapasya ng ilalagay</span>
                </div>

                {/* Free Text Input for Cleaned Area */}
                <div className="relative">
                  <input
                    type="text"
                    value={cleanedArea}
                    onChange={(e) => setCleanedArea(e.target.value)}
                    placeholder="Hal. Dingalan Feeder Port & Paltic Coastal Seawall, Purok 2 Coastline..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-cyan-400 text-white text-xs sm:text-sm font-sans font-bold shadow-inner"
                  />
                  <MapPin className="w-4 h-4 text-cyan-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Quick Action: Apply Realtime GPS Area & Select Event */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleApplyRealtimeGpsArea}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3 text-emerald-400" />
                    <span>Gamitin ang Realtime GPS Area</span>
                  </button>

                  <select
                    value={selectedActivityId}
                    onChange={(e) => handleSelectActivity(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-300 text-xs font-sans focus:border-cyan-400 flex-1 max-w-xs"
                  >
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.status.toUpperCase()}] {a.title} ({a.targetArea})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Upload Accomplishment Pictures: Kahit Ilang Picture */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
                    <Images className="w-4 h-4 text-emerald-400" />
                    <span>3. Accomplishment Pictures (Kahit Ilang Picture) <span className="text-rose-400">*</span></span>
                  </label>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {uploadedPhotos.length} Larawan Na-upload
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-slate-900 border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 text-slate-200 hover:text-white flex items-center justify-center space-x-2.5 transition-all cursor-pointer group shadow-lg"
                  >
                    <Upload className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs sm:text-sm">Pumili ng mga Larawan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="p-4 rounded-2xl bg-slate-950/80 border-2 border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center justify-center space-x-2.5 transition-all cursor-pointer group shadow-lg"
                  >
                    <Camera className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-xs sm:text-sm">Kumuha ng Camera Snapshot</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMultipleFiles}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleMultipleFiles}
                  className="hidden"
                />

                {uploadedPhotos.length === 0 && (
                  <button
                    type="button"
                    onClick={handleAddSamplePhotos}
                    disabled={isProcessing}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-950/50 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-emerald-300 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mag-load ng Sample Cleanup Photos para sa Test</span>
                  </button>
                )}
              </div>

              {/* Photos Gallery */}
              {uploadedPhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {uploadedPhotos.map((photo, index) => (
                      <div
                        key={index}
                        className="group relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-700 shadow"
                      >
                        <img
                          src={photo}
                          alt={`Accomplishment ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-emerald-300 font-bold border border-emerald-500/30">
                          #{index + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-950/90 text-rose-300 hover:text-white border border-rose-500/50 opacity-90 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-400 bg-slate-950/40 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-mono font-bold">Magdagdag pa</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Notes / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-200 block">
                  4. Ulat sa Ginawang Paglilinis (Deskripsyon)
                </label>
                <textarea
                  value={accomplishmentNotes}
                  onChange={(e) => setAccomplishmentNotes(e.target.value)}
                  placeholder="Halimbawa: Isinagawa ang coastal cleanup sa tabing dagat, naglinis kasama ang grupo at nakakolekta ng mga basura..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-emerald-400 text-white placeholder-slate-500 text-xs font-sans"
                />
              </div>

              {/* Primary Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isProcessing || uploadedPhotos.length === 0}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Ipinoproseso at Isinusumite ang Patunay...</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-slate-950" />
                    <span>I-Submit ang Accomplishment Attendance ({uploadedPhotos.length} Larawan)</span>
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
