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
        setBroadcastHistory(Array.isArray(res) ? res : []);
      }).catch((err) => {
        console.warn('Failed to load broadcasts history:', err);
        setBroadcastHistory([]);
      });
    }
  }, [isOpen]);

  // Initialize selected activity and generate QR code
  useEffect(() => {
    if (isOpen) {
      setIsSuccessSent(false);
      const safeActs = Array.isArray(activities) ? activities : [];
      const defaultAct = safeActs.find((a) => a.status === 'ongoing') || safeActs[0];
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
      const safeActs = Array.isArray(activities) ? activities : [];
      const selectedAct = safeActs.find((a) => a.id === selectedActivityId) || safeActs[0];
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linis-dingalan.aurora.gov.ph';
      const payloadUrl = `${currentOrigin}/?action=personal_qr&act_id=${selectedAct?.id || 'act-001'}&brgy=${encodeURIComponent(barangay)}&date=${encodeURIComponent(eventDate)}&sig=LD-ADMIN-GEN-${Date.now().toString().slice(-6)}`;
      
      setQrRawPayload(payloadUrl);

      try {
        const url = await QRCode.toDataURL(payloadUrl, {
          width: 320,
          margin: 1,
          color: {
            dark: '#022c22',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
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

  const safeActs = Array.isArray(activities) ? activities : [];
  const safeHistory = Array.isArray(broadcastHistory) ? broadcastHistory : [];
  const currentAct = safeActs.find((a) => a.id === selectedActivityId) || safeActs[0];

  const handleActivityChange = (actId: string) => {
    setSelectedActivityId(actId);
    const act = safeActs.find((a) => a.id === actId);
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

  const [showHistory, setShowHistory] = useState<boolean>(false);

  return (
    <>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
        <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.3)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
          
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
                <QrCode className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                  Admin Exclusive • Event QR Generator & Advisory
                </span>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
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
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-left">
            {/* SUCCESS BROADCAST CONFIRMATION */}
            {isSuccessSent ? (
              <div className="text-center py-8 space-y-4 animate-scaleIn">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Broadcast Sent Successfully
                  </span>
                  <h4 className="text-xl font-black text-white">
                    Naipadala na sa Lahat ng Naka-Register na User!
                  </h4>
                  <p className="text-xs text-slate-300 max-w-lg mx-auto">
                    Ang opisyal na <strong>Event QR Code</strong> at lahat ng paalala (tools, tumbler, barangay, oras, kasuotan) ay awtomatikong natanggap ng lahat ng user account para magamit sa pag-submit ng kanilang accomplishment attendance.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-left space-y-1.5 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Aktibidad:</span>
                    <span className="text-emerald-400 font-bold">{activityTitle || currentAct?.title || 'Linis Dingalan Event'}</span>
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
                    <span className="text-white">{currentUser?.name || 'Admin Officer'}</span>
                  </div>
                </div>

                <div className="flex justify-center space-x-3 pt-2">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.35)] cursor-pointer"
                  >
                    Tapos na (Done)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Section 1: Choose Activity / Enter Title */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <label className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Pumili ng Cleanup Activity o Maglagay ng Custom Title:</span>
                    </label>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Synchronized sa Active Program List
                    </span>
                  </div>

                  {safeActs.length > 0 && (
                    <select
                      value={selectedActivityId}
                      onChange={(e) => handleActivityChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:border-emerald-400 focus:outline-none"
                    >
                      {safeActs.map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.title} — Brgy. {act.barangay} ({act.targetArea})
                        </option>
                      ))}
                    </select>
                  )}

                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">
                      Pangalan ng Cleanup Activity (Customizable Title):
                    </label>
                    <input
                      type="text"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      placeholder="Hal. Dingalan Feeder Port & Paltic Coastal Cleanliness Operation"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-semibold"
                    />
                  </div>
                </div>

                {/* Section 2: Location and Schedule Grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Barangay & Target Area */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-emerald-400 uppercase">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>Lokasyon ng Paglilinis:</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Barangay (11 Coastal Barangays):
                      </label>
                      <select
                        value={barangay}
                        onChange={(e) => setBarangay(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      >
                        {DINGALAN_BARANGAYS.map((b) => (
                          <option key={b} value={b}>
                            Barangay {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Eksaktong Target Area / Site:
                      </label>
                      <input
                        type="text"
                        value={targetArea}
                        onChange={(e) => setTargetArea(e.target.value)}
                        placeholder="Hal. Pacific Seawall & Mangrove Buffer Strip"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Schedule Details */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Petsa at Oras ng Event:</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Petsa (Date of Cleanup):
                      </label>
                      <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">
                          Simula:
                        </label>
                        <input
                          type="text"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          placeholder="06:00 AM"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">
                          Matapos:
                        </label>
                        <input
                          type="text"
                          value={estimatedEndTime}
                          onChange={(e) => setEstimatedEndTime(e.target.value)}
                          placeholder="11:59 PM"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">
                          Tagal:
                        </label>
                        <input
                          type="text"
                          value={totalHours}
                          onChange={(e) => setTotalHours(e.target.value)}
                          placeholder="4 na Oras"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Reminders and Advisories */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Mga Paalala ng Admin sa mga Kalahok (Editable):</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">Lahat ay Customizable</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center space-x-1.5">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kagamitan / Tools na Dapat Dalhin:</span>
                      </label>
                      <input
                        type="text"
                        value={requiredTools}
                        onChange={(e) => setRequiredTools(e.target.value)}
                        placeholder="Walis tingting, dustpan, sako/trash bags, sipit/trash tongs, guwantes..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center space-x-1.5">
                        <Coffee className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Paalala sa Tumbler / Hydration:</span>
                      </label>
                      <input
                        type="text"
                        value={waterTumblerReminder}
                        onChange={(e) => setWaterTumblerReminder(e.target.value)}
                        placeholder="Magdala ng sariling tumbler o reusable water bottle..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center space-x-1.5">
                        <Shirt className="w-3.5 h-3.5 text-teal-400" />
                        <span>Dapat na Kasuotan (Attire):</span>
                      </label>
                      <input
                        type="text"
                        value={recommendedAttire}
                        onChange={(e) => setRecommendedAttire(e.target.value)}
                        placeholder="Linis Dingalan t-shirt o komportableng damit, bota/shoes, sombrero..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Karagdagang Note mula sa Admin:
                      </label>
                      <input
                        type="text"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        placeholder="Magtipon sa Barangay Covered Court bago mag-alas 6:00 ng umaga..."
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Event QR Code Canvas & Primary Action */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/50 shadow-xl flex flex-col sm:flex-row items-center gap-5">
                  {/* QR Canvas Box */}
                  <div className="p-2.5 bg-white rounded-2xl shadow-2xl border-2 border-emerald-400/50 shrink-0 text-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Official Generated Event QR Code"
                        className="w-40 h-40 sm:w-44 sm:h-44 object-contain mx-auto"
                      />
                    ) : (
                      <div className="w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-500 animate-pulse">
                        Generating QR Code...
                      </div>
                    )}
                    <span className="text-[9px] font-mono font-black text-slate-950 uppercase tracking-tight block mt-1">
                      SCAN ATTENDANCE
                    </span>
                  </div>

                  {/* QR Info & Actions */}
                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div>
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold mb-1">
                        <QrCode className="w-3 h-3 text-emerald-400" />
                        <span>OFFICIAL EVENT ATTENDANCE QR CODE</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                        {activityTitle || currentAct?.title || 'Linis Dingalan Cleanup Event'}
                      </h4>
                      <p className="text-xs text-emerald-300 font-mono mt-0.5">
                        Brgy. {barangay} • {targetArea} • {eventDate}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      {qrDataUrl && (
                        <a
                          href={qrDataUrl}
                          download={`Linis-Dingalan-QR-${barangay}-${eventDate}.png`}
                          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Download QR</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                        <span>Print</span>
                      </button>
                    </div>

                    {/* Primary Broadcast Send Button */}
                    <button
                      type="button"
                      onClick={handleSendToAllUsers}
                      disabled={isSending}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-mono font-black text-sm tracking-wide shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {isSending ? (
                        <span className="flex items-center space-x-2">
                          <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Ipinapadala sa Lahat ng Users...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <Send className="w-4 h-4 text-slate-950" />
                          <span>I-Send ang QR Code at mga Paalala sa Lahat ng Users</span>
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Section 5: Historical Broadcast Archives */}
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        📋 Kasaysayan ng mga Naunang Paalala ({safeHistory.length})
                      </h4>
                    </div>

                    {safeHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllHistory}
                        className="px-3 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 border border-rose-500/30 hover:border-rose-400 text-rose-400 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Burahin Lahat ng History</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                    {safeHistory.length === 0 ? (
                      <div className="col-span-2 p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 font-mono">
                        Walang nakaraang broadcast sa kasaysayan.
                      </div>
                    ) : (
                      safeHistory.map((historyItem) => {
                        const active = isBroadcastActive(historyItem);
                        return (
                          <div
                            key={historyItem.id}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              active
                                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${
                                  active
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                {active ? '🟢 AKTIBO (Active)' : '🔴 TAPOS NA'}
                              </span>

                              <div className="flex items-center space-x-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleStartEditHistoryItem(historyItem, e)}
                                  className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 border border-slate-700 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center space-x-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>I-Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteHistoryItem(historyItem.id, e)}
                                  className="p-1 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <h5 className="text-xs font-bold text-white line-clamp-1 leading-snug">
                              {historyItem.activityTitle}
                            </h5>
                            <p className="text-[10px] font-mono text-emerald-300">
                              Brgy. {historyItem.barangay} • {historyItem.targetArea}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">
                              {historyItem.startTime} – {historyItem.estimatedEndTime} ({historyItem.totalHours})
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT BROADCAST MODAL OVERLAY                                              */}
      {/* ========================================================================= */}
      {editingBroadcast && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
          <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/80 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.3)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
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
                    placeholder="11:59 PM"
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
    </>
  );
};
