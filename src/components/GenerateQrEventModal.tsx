import React, { useState, useEffect } from 'react';
import { Activity, User, EventQrBroadcast } from '../types';
import { api } from '../services/api';
import { INITIAL_ACTIVITIES, INITIAL_EVENT_BROADCAST } from '../data/seedData';
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
import { getDingalanNow, checkIsBroadcastActive } from '../utils/philippineClock';
import { generateStyledLguQrDataUrl } from '../utils/qrPassGenerator';

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
  return checkIsBroadcastActive(broadcast);
};

export const GenerateQrEventModal: React.FC<GenerateQrEventModalProps> = ({
  isOpen,
  onClose,
  activities,
  currentUser,
  onBroadcastSuccess,
}) => {
  const safeActs = Array.isArray(activities) && activities.length > 0 ? activities : INITIAL_ACTIVITIES;

  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [activityTitle, setActivityTitle] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrRawPayload, setQrRawPayload] = useState<string>('');
  
  // Optional Reminders & Details (Defaults to clean/empty)
  const [barangay, setBarangay] = useState<string>('');
  const [targetArea, setTargetArea] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [estimatedEndTime, setEstimatedEndTime] = useState<string>('');
  const [totalHours, setTotalHours] = useState<string>('');
  const [requiredTools, setRequiredTools] = useState<string>('');
  const [waterTumblerReminder, setWaterTumblerReminder] = useState<string>('');
  const [recommendedAttire, setRecommendedAttire] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [assignedPersonnel, setAssignedPersonnel] = useState<string[]>([]);
  const [newPersonInput, setNewPersonInput] = useState<string>('');

  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccessSent, setIsSuccessSent] = useState<boolean>(false);
  const [broadcastHistory, setBroadcastHistory] = useState<EventQrBroadcast[]>([]);

  // Edit Broadcast Modal States
  const [editingBroadcast, setEditingBroadcast] = useState<EventQrBroadcast | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editBarangay, setEditBarangay] = useState<string>('');
  const [editTargetArea, setEditTargetArea] = useState<string>('');
  const [editEventDate, setEditEventDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEstimatedEndTime, setEditEstimatedEndTime] = useState<string>('');
  const [editTotalHours, setEditTotalHours] = useState<string>('');
  const [editRequiredTools, setEditRequiredTools] = useState<string>('');
  const [editWaterTumbler, setEditWaterTumbler] = useState<string>('');
  const [editRecommendedAttire, setEditRecommendedAttire] = useState<string>('');
  const [editAdditionalNotes, setEditAdditionalNotes] = useState<string>('');
  const [editAssignedPersonnel, setEditAssignedPersonnel] = useState<string[]>([]);
  const [editPersonInput, setEditPersonInput] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Function to manually clear all text fields to zero data
  const handleClearAllFields = () => {
    setSelectedActivityId('');
    setActivityTitle('');
    setBarangay('');
    setTargetArea('');
    setEventDate('');
    setStartTime('');
    setEstimatedEndTime('');
    setTotalHours('');
    setRequiredTools('');
    setWaterTumblerReminder('');
    setRecommendedAttire('');
    setAdditionalNotes('');
    setAssignedPersonnel([]);
    setNewPersonInput('');
  };

  // Assigned personnel helper functions
  const handleAddPerson = () => {
    if (!newPersonInput.trim()) return;
    setAssignedPersonnel((prev) => [...prev, newPersonInput.trim()]);
    setNewPersonInput('');
  };

  const handleRemovePerson = (index: number) => {
    setAssignedPersonnel((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditAddPerson = () => {
    if (!editPersonInput.trim()) return;
    setEditAssignedPersonnel((prev) => [...prev, editPersonInput.trim()]);
    setEditPersonInput('');
  };

  const handleEditRemovePerson = (index: number) => {
    setEditAssignedPersonnel((prev) => prev.filter((_, i) => i !== index));
  };

  // Load broadcast history when opened
  useEffect(() => {
    if (isOpen) {
      api.getAllEventBroadcasts().then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setBroadcastHistory(res);
        } else {
          setBroadcastHistory([]);
        }
      }).catch((err) => {
        console.warn('Failed to load broadcasts history:', err);
        setBroadcastHistory([]);
      });
    }
  }, [isOpen]);

  // Clean / Zero-data initialization when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsSuccessSent(false);
      handleClearAllFields();
    }
  }, [isOpen]);

  // Generate dynamic QR Code when activity or details change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function makeQr() {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linis-dingalan.aurora.gov.ph';
      const payloadUrl = `${currentOrigin}/?action=personal_qr&act_id=${selectedActivityId || 'custom'}&brgy=${encodeURIComponent(barangay || 'Dingalan')}&date=${encodeURIComponent(eventDate || new Date().toISOString().split('T')[0])}&sig=LD-ADMIN-GEN-${Date.now().toString().slice(-6)}`;
      
      setQrRawPayload(payloadUrl);

      try {
        const url = await generateStyledLguQrDataUrl(payloadUrl, {
          width: 480,
          title: 'LINIS DINGALAN',
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
  }, [isOpen, selectedActivityId, barangay, eventDate]);

  if (!isOpen) return null;

  const safeHistory = Array.isArray(broadcastHistory) ? broadcastHistory : [];
  const currentAct = safeActs.find((a) => a.id === selectedActivityId);

  const handleActivityChange = (actId: string) => {
    setSelectedActivityId(actId);
    if (!actId) {
      handleClearAllFields();
      return;
    }
    const act = safeActs.find((a) => a.id === actId);
    if (act) {
      setActivityTitle(act.title || '');
      setBarangay(act.barangay || '');
      setTargetArea(act.targetArea || '');
      if (act.date) setEventDate(act.date);
      if (act.callTime) setStartTime(act.callTime);
    }
  };

  const handleSendToAllUsers = async () => {
    setIsSending(true);

    try {
      const cleanEventDate = eventDate || new Date().toISOString().split('T')[0];
      const targetActId = (currentAct && currentAct.id) ? currentAct.id : `act-${Date.now().toString().slice(-6)}`;
      const finalTitle = activityTitle || currentAct?.title || 'Linis Dingalan Community Cleanup';
      
      const broadcast: EventQrBroadcast = {
        id: `broadcast-${Date.now()}`,
        activityId: targetActId,
        activityTitle: finalTitle,
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
        assignedPersonnel,
        sentByAdminName: currentUser?.name || 'Admin Officer',
        sentAt: new Date().toISOString(),
      };

      // 1. Immediately store in localStorage & BroadcastChannel for 0ms lag
      try {
        localStorage.setItem('ld_latest_event_broadcast', JSON.stringify(broadcast));
        localStorage.removeItem('ld_broadcasts_cleared');
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel('ld_sync');
          bc.postMessage({ type: 'NEW_BROADCAST', broadcast });
          bc.close();
        }
      } catch {}

      // 2. Ensure the activity is synced into Programs list in LocalStorage
      try {
        const rawActs = localStorage.getItem('ld_activities_v1');
        const actsList: Activity[] = rawActs ? JSON.parse(rawActs) : [];
        const existingIdx = actsList.findIndex((a) => a.id === targetActId || a.title === finalTitle);
        
        if (existingIdx >= 0) {
          actsList[existingIdx] = {
            ...actsList[existingIdx],
            title: finalTitle,
            barangay: barangay as any,
            targetArea: targetArea,
            date: cleanEventDate,
            callTime: startTime || '06:00 AM',
            notes: additionalNotes || actsList[existingIdx].notes,
            supervisorName: currentUser?.name || actsList[existingIdx].supervisorName,
            status: 'scheduled',
          };
        } else {
          const newActObj: Activity = {
            id: targetActId,
            title: finalTitle,
            programType: 'COASTAL_CLEANUP',
            description: additionalNotes || 'Linis Dingalan Cleanup Operation & Environmental Compliance',
            date: cleanEventDate,
            callTime: startTime || '06:00 AM',
            targetArea: targetArea,
            barangay: barangay as any,
            menroSupervisorId: currentUser?.id || 'admin',
            supervisorName: currentUser?.name || 'Admin Officer',
            targetBeneficiariesCount: 20,
            assignedBeneficiariesCount: 0,
            attendedBeneficiariesCount: 0,
            status: 'scheduled',
            notes: additionalNotes || '',
            createdAt: new Date().toISOString(),
          };
          actsList.unshift(newActObj);
        }
        localStorage.setItem('ld_activities_v1', JSON.stringify(actsList));
      } catch (err) {
        console.warn('Error saving activity to localstorage:', err);
      }

      // 3. Notify parent immediately so all views (including Programs tab) update
      onBroadcastSuccess(broadcast);
      setIsSuccessSent(true);

      // 4. Persist to API and Firestore
      await api.broadcastEventQr(broadcast);

      // 5. Immediately refresh history list
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
    try {
      // 1. Immediate optimistic UI update
      setBroadcastHistory((prev) => {
        const nextList = prev.filter((b) => b.id !== broadcastId);
        if (nextList.length === 0) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('ld_broadcasts_cleared', 'true');
            localStorage.removeItem('ld_latest_event_broadcast');
            localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify([]));
          }
          onBroadcastSuccess(null as any);
        } else {
          onBroadcastSuccess(nextList[0]);
        }
        return nextList;
      });

      // 2. Persist delete in API and storage
      await api.deleteEventBroadcast(broadcastId);
      const res = await api.getAllEventBroadcasts();
      setBroadcastHistory(res);
      if (res.length === 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('ld_broadcasts_cleared', 'true');
          localStorage.removeItem('ld_latest_event_broadcast');
          localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify([]));
        }
        onBroadcastSuccess(null as any);
      } else {
        onBroadcastSuccess(res[0]);
      }
    } catch (err) {
      console.error('Failed to delete broadcast', err);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ld_broadcasts_cleared', 'true');
        localStorage.removeItem('ld_latest_event_broadcast');
        localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify([]));
      }
      await api.clearAllEventBroadcasts();
      setBroadcastHistory([]);
      onBroadcastSuccess(null as any);
    } catch (err) {
      console.error('Failed to clear broadcasts', err);
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
    setEditAssignedPersonnel(item.assignedPersonnel || []);
    setEditPersonInput('');
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
        newQrDataUrl = await generateStyledLguQrDataUrl(payloadUrl, {
          width: 320,
          includeCenterBadge: true,
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
        assignedPersonnel: editAssignedPersonnel,
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
    <>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-6 bg-slate-950/90 backdrop-blur-xl overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/70 rounded-2xl sm:rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.35)] overflow-hidden my-auto flex flex-col max-h-[94vh] text-slate-100">
          
          {/* Header Bar */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400 block">
                  Admin Exclusive • Event QR Generator & Advisory
                </span>
                <h3 className="text-sm sm:text-lg font-black text-white tracking-tight leading-tight">
                  Generate Event QR Code & Mga Paalala
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-5 flex-1 min-h-0 text-left">
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
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleClearAllFields}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center space-x-1"
                        title="Linisin at gawing zero data ang lahat ng text field"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Linisin Lahat ng Field</span>
                      </button>
                      <span className="text-[10px] font-mono text-emerald-400 hidden sm:inline">
                        Synchronized sa Active Program List
                      </span>
                    </div>
                  </div>

                  <select
                    value={selectedActivityId}
                    onChange={(e) => handleActivityChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:border-emerald-400 focus:outline-none"
                  >
                    <option value="">-- Pumili ng Activity (Iwanang Malinis / Clean) --</option>
                    {safeActs.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.title} — Brgy. {act.barangay} ({act.targetArea})
                      </option>
                    ))}
                  </select>

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
                      <input
                        type="text"
                        value={barangay}
                        onChange={(e) => setBarangay(e.target.value)}
                        placeholder="Hal. Paltic (Free text)"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
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

                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-2">
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
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Mga Paalala ng Admin sa mga Kalahok (Editable):</span>
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-emerald-400 hidden xs:inline">Lahat ay Customizable</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center space-x-1.5">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
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
                        <Coffee className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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
                        <Shirt className="w-3.5 h-3.5 text-teal-400 shrink-0" />
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

                  {/* Naka-Assign / Assigned Personnel Section */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-2">
                    <label className="block text-[11px] font-mono text-emerald-400 font-bold uppercase flex items-center space-x-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Naka-Assign na Personnel / Staff (Assigned Personnel):</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPersonInput}
                        onChange={(e) => setNewPersonInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddPerson();
                          }
                        }}
                        placeholder="I-type ang pangalan ng naka-assign..."
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddPerson}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
                      >
                        + Mag-Add
                      </button>
                    </div>

                    {/* Assigned Personnel Badges with Delete button */}
                    {assignedPersonnel.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {assignedPersonnel.map((person, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-mono"
                          >
                            <span>👤 {person}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePerson(idx)}
                              className="text-slate-400 hover:text-rose-400 ml-1 transition-colors cursor-pointer"
                              title="Burahin ang naka assign"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 block">Walang naka-assign pa. Mag-add sa itaas.</span>
                    )}
                  </div>
                </div>

                {/* Section 4: Event QR Code Canvas & Primary Action */}
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/50 shadow-xl flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
                  {/* QR Canvas Box */}
                  <div className="p-2 sm:p-2.5 bg-white rounded-xl sm:rounded-2xl shadow-2xl border-2 border-emerald-400/50 shrink-0 text-center">
                    {qrDataUrl ? (
                      <div className="relative inline-flex items-center justify-center">
                        <img
                          src={qrDataUrl}
                          alt="Official Generated Event QR Code"
                          className="w-32 h-32 xs:w-40 xs:h-40 sm:w-44 sm:h-44 object-contain mx-auto"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white p-0.5 border-2 border-emerald-600 shadow-sm flex items-center justify-center">
                            <div className="w-full h-full rounded-full bg-[#022c22] flex flex-col items-center justify-center text-center p-0.5 border border-amber-400">
                              <span className="text-[7px] sm:text-[8px] font-black text-emerald-300 leading-none">LGU</span>
                              <span className="text-[5px] sm:text-[6px] font-extrabold text-white leading-none tracking-tighter">DINGALAN</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 xs:w-40 xs:h-40 sm:w-44 sm:h-44 flex items-center justify-center bg-slate-100 rounded-xl text-xs text-slate-500 animate-pulse">
                        Generating QR Code...
                      </div>
                    )}
                    <span className="text-[8px] sm:text-[9px] font-mono font-black text-slate-950 uppercase tracking-tight block mt-1">
                      SCAN ATTENDANCE
                    </span>
                  </div>

                  {/* QR Info & Actions */}
                  <div className="space-y-2.5 sm:space-y-3 flex-1 text-center sm:text-left w-full">
                    <div>
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[10px] font-mono font-bold mb-1">
                        <QrCode className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>OFFICIAL EVENT ATTENDANCE QR CODE</span>
                      </div>
                      <h4 className="text-sm sm:text-lg font-black text-white leading-tight">
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
                          className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Download QR</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Print</span>
                      </button>
                    </div>

                    {/* Primary Broadcast Send Button */}
                    <button
                      type="button"
                      onClick={handleSendToAllUsers}
                      disabled={isSending}
                      className="w-full py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#00e599] via-[#00d9b4] to-[#00d4ff] hover:from-[#00f2a5] hover:to-[#22e1ff] text-slate-950 font-mono font-bold text-xs sm:text-sm tracking-wide shadow-[0_0_25px_rgba(0,229,153,0.5)] flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50 text-center leading-snug"
                    >
                      {isSending ? (
                        <span className="flex items-center space-x-2">
                          <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>Ipinapadala sa Lahat ng Users...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <Send className="w-4 h-4 text-slate-950 shrink-0" />
                          <span>I-Broadcast ang Event QR Code at Paalala sa Lahat ng Users</span>
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
        <div className="fixed inset-0 z-[10500] flex items-center justify-center p-3 sm:p-6 bg-slate-950/95 backdrop-blur-xl overflow-y-auto select-none">
          <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/80 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.3)] overflow-hidden my-auto flex flex-col h-[90vh] max-h-[850px] text-slate-100">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/95 flex items-center justify-between shrink-0">
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
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4 text-left font-sans flex-1 min-h-0">
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
                  <input
                    type="text"
                    required
                    value={editBarangay}
                    onChange={(e) => setEditBarangay(e.target.value)}
                    placeholder="Hal. Paltic"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 text-white text-xs sm:text-sm font-semibold outline-none transition-all"
                  />
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

              {/* Naka-Assign / Assigned Personnel Manager in Edit Modal */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-xs font-mono font-bold text-emerald-400 uppercase flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Naka-Assign na Personnel / Staff (Assigned Personnel)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editPersonInput}
                    onChange={(e) => setEditPersonInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEditAddPerson();
                      }
                    }}
                    placeholder="I-type ang bagong naka-assign..."
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:border-emerald-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleEditAddPerson}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
                  >
                    + Mag-Add
                  </button>
                </div>

                {/* List of assigned personnel in edit modal */}
                {editAssignedPersonnel.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editAssignedPersonnel.map((person, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-semibold"
                      >
                        <span>👤 {person}</span>
                        <button
                          type="button"
                          onClick={() => handleEditRemovePerson(idx)}
                          className="text-slate-400 hover:text-rose-400 ml-1 transition-colors cursor-pointer"
                          title="Burahin ang naka-assign"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 block">Walang naka-assign sa kasalukuyan.</span>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingBroadcast(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-mono font-black flex items-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4 text-slate-950" />
                  <span>{isSavingEdit ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
