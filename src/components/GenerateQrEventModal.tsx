import React, { useState, useEffect } from 'react';
import { Activity, User, EventQrBroadcast } from '../types';
import { api } from '../services/api';
import QRCode from 'qrcode';
import {
  QrCode,
  Send,
  Wrench,
  Clock,
  MapPin,
  Shirt,
  Sparkles,
  CheckCircle2,
  X,
  Printer,
  Download,
  AlertCircle,
  FileText,
  Users,
  ShieldCheck,
  Coffee,
  Trash2,
  Edit3,
  Save,
  Calendar,
} from 'lucide-react';
import { getDingalanNow } from '../utils/philippineClock';
import { generateStyledLguQrDataUrl } from '../utils/qrPassGenerator';
import { OfficialQrPassCard } from './OfficialQrPassCard';

const DINGALAN_BARANGAYS = [
  'Aplaya',
  'Butas na Bato',
  'Cabischasan',
  'Caragsacan',
  'Davil-davilan',
  'Dikapanikian',
  'Ibona',
  'Paltic',
  'Poblacion',
  'Tanawan',
  'Umiray',
];

interface GenerateQrEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  currentUser: User;
  onBroadcastSuccess: (broadcast: EventQrBroadcast) => void;
}

const isBroadcastActive = (broadcast: any): boolean => {
  if (!broadcast) return false;
  try {
    const datePart = broadcast.eventDate || new Date().toISOString().split('T')[0];
    let timePart = broadcast.estimatedEndTime || '12:00 PM';
    timePart = timePart.trim().toUpperCase();
    const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)?/);
    let hours = 12;
    let minutes = 0;
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const ampm = match[3];
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return true;

    const deadlineUtcMs = Date.UTC(year, month - 1, day, hours - 8, minutes, 0);
    const nowUtcMs = getDingalanNow().getTime();

    return nowUtcMs < deadlineUtcMs;
  } catch {
    return true;
  }
};

export const GenerateQrEventModal: React.FC<GenerateQrEventModalProps> = ({
  isOpen,
  onClose,
  activities,
  currentUser,
  onBroadcastSuccess,
}) => {
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [activityTitle, setActivityTitle] = useState<string>('Dingalan Feeder Port & Paltic Coastal Cleanliness Operation');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrRawPayload, setQrRawPayload] = useState<string>('');
  
  // Optional Reminders & Details
  const [barangay, setBarangay] = useState<string>('Paltic');
  const [targetArea, setTargetArea] = useState<string>('Pacific Seawall & Mangrove Buffer Strip');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('06:00 AM');
  const [estimatedEndTime, setEstimatedEndTime] = useState<string>('11:59 PM');
  const [totalHours, setTotalHours] = useState<string>('4 na Oras');
  const [requiredTools, setRequiredTools] = useState<string>(
    'Walis tingting, dustpan, sako/trash bags, sipit/trash tongs, guwantes (gloves)'
  );
  const [waterTumblerReminder, setWaterTumblerReminder] = useState<string>(
    'Magdala ng sariling tumbler o reusable water bottle para sa sapat na hydration sa tabing-dagat'
  );
  const [recommendedAttire, setRecommendedAttire] = useState<string>(
    'Linis Dingalan t-shirt o komportableng damit pang-outdoor, bota/rubber shoes, sombrero o cap laban sa init ng araw'
  );
  const [additionalNotes, setAdditionalNotes] = useState<string>(
    'Magtipon sa Barangay Covered Court bago mag-alas 6:00 ng umaga para sa maikling briefing at cleaning cluster assignments.'
  );

  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccessSent, setIsSuccessSent] = useState<boolean>(false);
  const [broadcastHistory, setBroadcastHistory] = useState<EventQrBroadcast[]>([]);

  // Edit Broadcast Modal States
  const [editingBroadcast, setEditingBroadcast] = useState<EventQrBroadcast | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editBarangay, setEditBarangay] = useState<string>('Paltic');
  const [editTargetArea, setEditTargetArea] = useState<string>('');
  const [editEventDate, setEditEventDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEstimatedEndTime, setEditEstimatedEndTime] = useState<string>('');
  const [editTotalHours, setEditTotalHours] = useState<string>('');
  const [editRequiredTools, setEditRequiredTools] = useState<string>('');
  const [editWaterTumbler, setEditWaterTumbler] = useState<string>('');
  const [editRecommendedAttire, setEditRecommendedAttire] = useState<string>('');
  const [editAdditionalNotes, setEditAdditionalNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Load broadcast history when opened
  useEffect(() => {
    if (isOpen) {
      api.getAllEventBroadcasts().then((res) => {
        setBroadcastHistory(res);
      });
    }
  }, [isOpen]);

  // Initialize selected activity and generate QR code
  useEffect(() => {
    if (isOpen) {
      setIsSuccessSent(false);
      const defaultAct = activities.find((a) => a.status === 'ongoing') || activities[0];
      if (defaultAct) {
        setSelectedActivityId(defaultAct.id);
        setActivityTitle(defaultAct.title);
        setBarangay(defaultAct.barangay);
        setTargetArea(defaultAct.targetArea);
      }
    }
  }, [isOpen, activities]);

  // Generate dynamic QR Code when activity or details change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function makeQr() {
      const selectedAct = activities.find((a) => a.id === selectedActivityId) || activities[0];
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linis-dingalan.aurora.gov.ph';
      const payloadUrl = `${currentOrigin}/?action=personal_qr&act_id=${selectedAct?.id || 'act-001'}&brgy=${encodeURIComponent(barangay)}&date=${encodeURIComponent(eventDate)}&sig=LD-ADMIN-GEN-${Date.now().toString().slice(-6)}`;
      
      setQrRawPayload(payloadUrl);

      try {
        const url = await generateStyledLguQrDataUrl(payloadUrl, {
          width: 480,
          title: 'LINIS DINGALAN',
          code: `LD-EVT-${barangay.slice(0, 3).toUpperCase()}`,
          includeCenterBadge: true,
        });
        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate event QR', err);
      }
    }

    makeQr();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedActivityId, barangay, eventDate, activities]);

  if (!isOpen) return null;

  const currentAct = activities.find((a) => a.id === selectedActivityId) || activities[0];

  const handleActivityChange = (actId: string) => {
    setSelectedActivityId(actId);
    const act = activities.find((a) => a.id === actId);
    if (act) {
      setBarangay(act.barangay);
      setTargetArea(act.targetArea);
      if (act.date) {
        setEventDate(act.date);
      }
      if (act.callTime) {
        setStartTime(act.callTime);
      }
    }
  };

  const handleSendToAllUsers = async () => {
    setIsSending(true);

    try {
      const cleanEventDate = eventDate || new Date().toISOString().split('T')[0];
      const broadcast: EventQrBroadcast = {
        id: `broadcast-${Date.now()}`,
        activityId: currentAct?.id || 'act-001',
        activityTitle: activityTitle || currentAct?.title || 'Linis Dingalan Community Cleanup',
        barangay,
        targetArea,
        qrDataUrl,
        qrPayload: qrRawPayload,
        eventDate: cleanEventDate,
        startTime: startTime || '06:00 AM',
        estimatedEndTime: estimatedEndTime || '11:59 PM',
        totalHours: totalHours || '4 na Oras',
        requiredTools,
        waterTumblerReminder,
        recommendedAttire,
        additionalNotes,
        sentByAdminName: currentUser.name,
        sentAt: new Date().toISOString(),
      };

      // 1. Immediately store in localStorage & BroadcastChannel for 0ms lag
      try {
        localStorage.setItem('ld_latest_event_broadcast', JSON.stringify(broadcast));
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('ld_sync');
          bc.postMessage({ type: 'NEW_BROADCAST', broadcast });
          bc.close();
        }
      } catch {}

      // 2. Notify parent immediately so all views update
      onBroadcastSuccess(broadcast);
      setIsSuccessSent(true);

      // 3. Persist to API and Firestore
      await api.broadcastEventQr(broadcast);

      // 4. Immediately refresh history list
      const res = await api.getAllEventBroadcasts();
      setBroadcastHistory(res);
    } catch (err) {
      console.error('Broadcast failed', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteHistoryItem = async (broadcastId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm("Sigurado ka ba na gusto mong burahin ang paalalang ito? Mawawala rin ito sa login page kapag ito ang kasalukuyang active.")) {
      await api.deleteEventBroadcast(broadcastId);
      const res = await api.getAllEventBroadcasts();
      setBroadcastHistory(res);
      // Trigger update on parent
      onBroadcastSuccess({} as any);
    }
  };

  const handleClearAllHistory = async () => {
    if (window.confirm("🔴 WARNING: Sigurado ka ba na gusto mong burahin ang LAHAT ng paalala sa history? Parehong mabubura ang mga ito sa database at sa login page. Hindi na ito maibabalik kailanman.")) {
      await api.clearAllEventBroadcasts();
      setBroadcastHistory([]);
      onBroadcastSuccess({} as any);
    }
  };

  const handleStartEditHistoryItem = (item: EventQrBroadcast, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingBroadcast(item);
    setEditTitle(item.activityTitle || '');
    setEditBarangay(item.barangay || 'Paltic');
    setEditTargetArea(item.targetArea || '');
    setEditEventDate(item.eventDate || new Date().toISOString().split('T')[0]);
    setEditStartTime(item.startTime || '06:00 AM');
    setEditEstimatedEndTime(item.estimatedEndTime || '05:20 PM');
    setEditTotalHours(item.totalHours || '4 na Oras');
    setEditRequiredTools(item.requiredTools || '');
    setEditWaterTumbler(item.waterTumblerReminder || '');
    setEditRecommendedAttire(item.recommendedAttire || '');
    setEditAdditionalNotes(item.additionalNotes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBroadcast) return;
    setIsSavingEdit(true);

    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linis-dingalan.aurora.gov.ph';
      const payloadUrl = `${currentOrigin}/?action=personal_qr&act_id=${editingBroadcast.activityId || 'act-001'}&brgy=${encodeURIComponent(editBarangay)}&date=${encodeURIComponent(editEventDate)}&sig=LD-ADMIN-GEN-${Date.now().toString().slice(-6)}`;
      
      let newQrDataUrl = editingBroadcast.qrDataUrl;
      try {
        newQrDataUrl = await QRCode.toDataURL(payloadUrl, {
          width: 320,
          margin: 1,
          color: {
            dark: '#022c22',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
      } catch (qrErr) {
        console.warn('QR update fallback:', qrErr);
      }

      const updatedItem: EventQrBroadcast = {
        ...editingBroadcast,
        activityTitle: editTitle.trim(),
        barangay: editBarangay,
        targetArea: editTargetArea.trim(),
        eventDate: editEventDate,
        startTime: editStartTime.trim(),
        estimatedEndTime: editEstimatedEndTime.trim(),
        totalHours: editTotalHours.trim(),
        requiredTools: editRequiredTools.trim(),
        waterTumblerReminder: editWaterTumbler.trim(),
        recommendedAttire: editRecommendedAttire.trim(),
        additionalNotes: editAdditionalNotes.trim(),
        qrDataUrl: newQrDataUrl,
        qrPayload: payloadUrl,
      };

      await api.updateEventBroadcast(updatedItem);
      const refreshed = await api.getAllEventBroadcasts();
      setBroadcastHistory(refreshed);

      // Notify parent to update active broadcast everywhere in the app
      onBroadcastSuccess(updatedItem);

      setEditingBroadcast(null);
    } catch (err) {
      console.error('Failed to update broadcast:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.25)] overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
              <QrCode className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                Admin Exclusive • Event QR Generator & Advisory
              </span>
              <h3 className="text-lg font-black text-white tracking-tight">
                Generate Cleanup Event QR Code & Paalala
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* SUCCESS BROADCAST CONFIRMATION */}
          {isSuccessSent ? (
            <div className="text-center py-8 space-y-4 animate-scaleIn">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Broadcast Sent Successfully
                </span>
                <h4 className="text-2xl font-black text-white">
                  Naipadala na sa Lahat ng Naka-Register na User!
                </h4>
                <p className="text-xs text-slate-300 max-w-lg mx-auto">
                  Ang opisyal na **Event QR Code** at lahat ng paalala (tools, tumbler, barangay, oras, kasuotan) ay awtomatikong natanggap ng lahat ng user account para magamit sa pag-submit ng kanilang accomplishment attendance.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-left space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-400">Aktibidad:</span>
                  <span className="text-emerald-400 font-bold">{currentAct?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lokasyon:</span>
                  <span className="text-white font-bold">Brgy. {barangay} ({targetArea})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Oras ng Paglilinis:</span>
                  <span className="text-cyan-400 font-bold">{startTime} – {estimatedEndTime} ({totalHours})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nagpadala:</span>
                  <span className="text-white">{currentUser.name}</span>
                </div>
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  Tapos na (Done)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: QR CODE CARD & ACTIONS (Span 5) */}
              <div className="lg:col-span-5 space-y-4">
                <OfficialQrPassCard
                  qrCodeUrl={qrDataUrl}
                  payloadUrl={qrRawPayload}
                  title={activityTitle || currentAct?.title || 'Linis Dingalan Event'}
                  subtitle={`Admin Broadcast Pass • Brgy. ${barangay}`}
                  trackingCode={`LD-EVT-${barangay.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`}
                  departmentOrCluster="PESO & MENRO Operations"
                  barangay={barangay}
                  eventDate={eventDate}
                  timeSlot={`${startTime} - ${estimatedEndTime}`}
                  isLiveEvent={true}
                  securityHash={`SEC-EVT-${barangay.toUpperCase()}-2026`}
                />

                {/* Info Note */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Broadcast Security</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tanging ang Admin account lamang ang may kapangyarihang mag-generate ng Event QR code. Kapag pinindot ang <strong>Send to All</strong> sa ibaba, awtomatikong matatanggap ito ng lahat ng users.
                  </p>
                </div>
              </div>

              {/* RIGHT COLUMN: REMINDERS & EVENT ADVISORY FORM (Span 7) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Mga Paalala ng Admin sa mga Users (Optional):</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Lahat ay Editable</span>
                </div>

                {/* 1. Activity Title & Barangay */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-300">
                      Pangalan ng Cleanup Activity / Programa:
                    </label>
                    <input
                      type="text"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      placeholder="Ilagay ang pangalan ng aktibidad..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-300">
                      Barangay:
                    </label>
                    <select
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                    >
                      <option value="Paltic">Barangay Paltic</option>
                      <option value="Poblacion">Barangay Poblacion</option>
                      <option value="Ibona">Barangay Ibona</option>
                      <option value="Aplaya">Barangay Aplaya</option>
                      <option value="Umiray">Barangay Umiray</option>
                      <option value="Tanawan">Barangay Tanawan</option>
                      <option value="Butas Na Bato">Barangay Butas Na Bato</option>
                      <option value="Cabog">Barangay Cabog</option>
                      <option value="Caragsacan">Barangay Caragsacan</option>
                      <option value="Davil-Davilan">Barangay Davil-Davilan</option>
                      <option value="Dikapanikian">Barangay Dikapanikian</option>
                    </select>
                  </div>
                </div>

                {/* 2. Target Barangay Area */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Eksaktong Barangay Area / Cleanup Site:</span>
                  </label>
                  <input
                    type="text"
                    value={targetArea}
                    onChange={(e) => setTargetArea(e.target.value)}
                    placeholder="Hal. Pacific Seawall & Mangrove Buffer Strip, Purok 3 Coastline"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {/* 3. Schedule, Time & Total Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Petsa ng Event:</span>
                    </label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Oras ng Simula:</span>
                    </label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="06:00 AM"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Posibleng Matapos:</span>
                    </label>
                    <input
                      type="text"
                      value={estimatedEndTime}
                      onChange={(e) => setEstimatedEndTime(e.target.value)}
                      placeholder="11:59 PM"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-mono font-bold text-slate-300">
                      Kabuuang Oras:
                    </label>
                    <input
                      type="text"
                      value={totalHours}
                      onChange={(e) => setTotalHours(e.target.value)}
                      placeholder="4 na Oras"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 4. Tools / Kagamitan na Dapat Dalhin */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Paalala sa mga Kagamitan / Tools na Dapat Dalhin:</span>
                  </label>
                  <textarea
                    rows={2}
                    value={requiredTools}
                    onChange={(e) => setRequiredTools(e.target.value)}
                    placeholder="Hal. Walis tingting, dustpan, sako, sipit/trash tongs, guwantes..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none font-sans"
                  />
                </div>

                {/* 5. Tumbler / Inuming Tubig */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                    <Coffee className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Paalala sa Tumbler / Hydration:</span>
                  </label>
                  <input
                    type="text"
                    value={waterTumblerReminder}
                    onChange={(e) => setWaterTumblerReminder(e.target.value)}
                    placeholder="Hal. Magdala ng sariling tumbler o reusable water bottle..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {/* 6. Dapat na Kasuotan / Attire */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1.5">
                    <Shirt className="w-3.5 h-3.5 text-teal-400" />
                    <span>Dapat na Kasuotan (Attire):</span>
                  </label>
                  <input
                    type="text"
                    value={recommendedAttire}
                    onChange={(e) => setRecommendedAttire(e.target.value)}
                    placeholder="Hal. Linis Dingalan shirt, komportableng pantalon, bota/rubber shoes, sombrero..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                {/* 7. Karagdagang Paalala */}
                <div className="space-y-1">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    Karagdagang Paalala mula sa Admin (Optional Note):
                  </label>
                  <textarea
                    rows={2}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Hal. Magtipon sa Covered Court para sa orientation at cluster distribution..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none font-sans"
                  />
                </div>

                {/* Primary SEND BUTTON */}
                <button
                  type="button"
                  onClick={handleSendToAllUsers}
                  disabled={isSending}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.45)] flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <span className="flex items-center space-x-2">
                      <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Ipinapadala sa Lahat ng Users...</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-2">
                      <Send className="w-5 h-5 text-slate-950" />
                      <span>I-Send ang QR Code at mga Paalala sa Lahat ng Users</span>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* HISTORICAL ARCHIVE OF COMPLETED EVENT ADVISORIES */}
            {/* ========================================================================= */}
            <div className="pt-6 border-t border-slate-800 space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-base font-bold text-white uppercase tracking-wider">
                    📋 History ng mga Natapos na Paalala (Historical Broadcast Archives)
                  </h4>
                </div>
                {broadcastHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 border border-rose-500/30 hover:border-rose-400 text-rose-400 text-xs font-mono font-black flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] cursor-pointer self-start sm:self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Burahin Lahat ng History (Clear All)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {broadcastHistory.length === 0 ? (
                  <div className="col-span-2 p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 font-mono">
                    Walang nakaraang paalala o broadcast sa history.
                  </div>
                ) : (
                  broadcastHistory.map((historyItem) => {
                    const active = isBroadcastActive(historyItem);
                    return (
                      <div
                        key={historyItem.id}
                        className={`p-4 rounded-2xl border transition-all duration-300 ${
                          active
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                            active
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700/60'
                          }`}>
                            {active ? '🟢 ACTIVE (Ongoing)' : '🔴 COMPLETED / EXPIRED'}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] font-mono text-slate-500 mr-1">
                              {historyItem.eventDate || 'N/A'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleStartEditHistoryItem(historyItem, e)}
                              className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-emerald-950/90 text-emerald-400 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/60 transition-all cursor-pointer flex items-center space-x-1 text-[10px] font-mono font-bold shadow-sm"
                              title="I-edit ang mga nilalaman ng paalalang ito"
                            >
                              <Edit3 className="w-3 h-3 text-emerald-400" />
                              <span>I-Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHistoryItem(historyItem.id, e)}
                              className="p-1 rounded bg-slate-950/80 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/50 transition-all cursor-pointer"
                              title="Burahin ang paalalang ito"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <h5 className="text-sm font-extrabold text-white mb-1.5 leading-snug">
                          {historyItem.activityTitle}
                        </h5>

                        <div className="space-y-1 text-[11px] font-mono text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">Brgy. {historyItem.barangay} • {historyItem.targetArea}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{historyItem.startTime} – {historyItem.estimatedEndTime} ({historyItem.totalHours})</span>
                          </div>
                          {historyItem.requiredTools && (
                            <div className="flex items-start gap-1.5 pt-1.5 border-t border-slate-900 mt-1.5 text-slate-400 font-sans">
                              <strong>Kagamitan:</strong> <span className="text-slate-300 text-[11px]">{historyItem.requiredTools}</span>
                            </div>
                          )}
                          {historyItem.recommendedAttire && (
                            <div className="flex items-start gap-1.5 pt-1 border-t border-slate-900/60 text-slate-400 font-sans">
                              <strong>Kasuotan:</strong> <span className="text-slate-300 text-[11px]">{historyItem.recommendedAttire}</span>
                            </div>
                          )}
                          {historyItem.additionalNotes && (
                            <div className="flex items-start gap-1.5 pt-1 border-t border-slate-900/60 text-slate-400 font-sans italic">
                              <strong>Paalala:</strong> <span className="text-amber-300/90 text-[11px]">{historyItem.additionalNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* ========================================================================= */}
        {/* EDIT BROADCAST / ADVISORY MODAL OVERLAY                                   */}
        {/* ========================================================================= */}
        {editingBroadcast && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/80 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.3)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-400 flex items-center justify-center text-slate-950 shadow-md">
                    <Edit3 className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                      I-Edit ang Paalala at Nilalaman
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Baguhin ang Laman ng Box ({editingBroadcast.barangay})
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBroadcast(null)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 text-left font-sans">
                {/* Pamagat ng Gawain */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Pamagat ng Gawain / Activity Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs sm:text-sm font-semibold outline-none transition-all"
                  />
                </div>

                {/* Barangay & Target Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Barangay <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={editBarangay}
                      onChange={(e) => setEditBarangay(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs sm:text-sm font-semibold outline-none transition-all cursor-pointer"
                    >
                      {DINGALAN_BARANGAYS.map((b) => (
                        <option key={b} value={b}>
                          Brgy. {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Target na Lugar / Lokasyon <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editTargetArea}
                      onChange={(e) => setEditTargetArea(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs sm:text-sm font-semibold outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Petsa, Simula, Tapos, Tagal */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase mb-1">
                      Petsa (Date)
                    </label>
                    <input
                      type="date"
                      required
                      value={editEventDate}
                      onChange={(e) => setEditEventDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase mb-1">
                      Simula
                    </label>
                    <input
                      type="text"
                      required
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      placeholder="06:00 AM"
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase mb-1">
                      Tapos / Cut-off
                    </label>
                    <input
                      type="text"
                      required
                      value={editEstimatedEndTime}
                      onChange={(e) => setEditEstimatedEndTime(e.target.value)}
                      placeholder="05:20 PM"
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs font-mono outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase mb-1">
                      Tagal (Hours)
                    </label>
                    <input
                      type="text"
                      required
                      value={editTotalHours}
                      onChange={(e) => setEditTotalHours(e.target.value)}
                      placeholder="4 na Oras"
                      className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs font-mono outline-none"
                    />
                  </div>
                </div>

                {/* Mga Kagamitan (Required Tools) */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center space-x-1.5">
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mga Kagamitan (Required Tools)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editRequiredTools}
                    onChange={(e) => setEditRequiredTools(e.target.value)}
                    placeholder="Walis tingting, dustpan, sako/trash bags, sipit/trash tongs, guwantes..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs outline-none resize-none"
                  />
                </div>

                {/* Hydration Reminder */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center space-x-1.5">
                    <Coffee className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Hydration / Tubig</span>
                  </label>
                  <input
                    type="text"
                    value={editWaterTumbler}
                    onChange={(e) => setEditWaterTumbler(e.target.value)}
                    placeholder="Magdala ng sariling tumbler o reusable water bottle..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs outline-none"
                  />
                </div>

                {/* Kasuotan (Attire) */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center space-x-1.5">
                    <Shirt className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kasuotan (Attire)</span>
                  </label>
                  <input
                    type="text"
                    value={editRecommendedAttire}
                    onChange={(e) => setEditRecommendedAttire(e.target.value)}
                    placeholder="Linis Dingalan t-shirt o komportableng damit, bota/shoes, sombrero..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs outline-none"
                  />
                </div>

                {/* Admin Note / Karagdagang Paalala */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Admin Note / Karagdagang Paalala</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editAdditionalNotes}
                    onChange={(e) => setEditAdditionalNotes(e.target.value)}
                    placeholder="Magtipon sa Covered Court bago mag-alas 6:00 ng umaga..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs outline-none resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditingBroadcast(null)}
                    disabled={isSavingEdit}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    Kanselahin
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-mono font-black flex items-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>{isSavingEdit ? 'Sine-save ang Pagbabago...' : 'I-Save ang mga Pagbabago'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
