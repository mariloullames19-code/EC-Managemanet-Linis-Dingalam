import React, { useState, useEffect } from 'react';
import { EventQrBroadcast, Activity } from '../types';
import QRCode from 'qrcode';
import { generateStyledLguQrDataUrl } from '../utils/qrPassGenerator';
import { OfficialQrPassCard } from './OfficialQrPassCard';
import {
  QrCode,
  Wrench,
  Clock,
  MapPin,
  Shirt,
  Coffee,
  CheckCircle2,
  X,
  Camera,
  Download,
  Printer,
  Sparkles,
  Info,
  Calendar,
  History,
  AlertCircle,
  Radio,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

interface EventQrNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  broadcast: EventQrBroadcast | null;
  activities?: Activity[];
  onProceedUploadAccomplishment: (targetActivity?: Activity) => void;
}

export const EventQrNoticeModal: React.FC<EventQrNoticeModalProps> = ({
  isOpen,
  onClose,
  broadcast,
  activities = [],
  onProceedUploadAccomplishment,
}) => {
  // Combine activities and broadcast into a unified list of events in history
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [generatedQrMap, setGeneratedQrMap] = useState<Record<string, string>>({});

  // Unified items
  const historyEvents = React.useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      barangay: string;
      targetArea: string;
      date: string;
      startTime: string;
      endTime: string;
      totalHours: string;
      status: 'ongoing' | 'completed' | 'scheduled' | 'cancelled';
      isActive: boolean;
      adminName: string;
      tools: string;
      waterReminder: string;
      attire: string;
      notes: string;
      qrDataUrl?: string;
      rawPayload?: string;
      isBroadcastLatest?: boolean;
    }> = [];

    // 1. If broadcast exists, add it at the top
    if (broadcast) {
      list.push({
        id: broadcast.activityId || broadcast.id,
        title: broadcast.activityTitle,
        barangay: broadcast.barangay,
        targetArea: broadcast.targetArea,
        date: broadcast.eventDate || new Date().toISOString().split('T')[0],
        startTime: broadcast.startTime || '06:00 AM',
        endTime: broadcast.estimatedEndTime || '10:00 AM',
        totalHours: broadcast.totalHours || '4 na Oras',
        status: 'ongoing',
        isActive: true,
        adminName: broadcast.sentByAdminName,
        tools: broadcast.requiredTools || 'Walis tingting, dustpan, sako/trash bags, sipit/trash tongs, guwantes (gloves)',
        waterReminder: broadcast.waterTumblerReminder || 'Magdala ng sariling tumbler o reusable water bottle para sa sapat na hydration sa tabing-dagat',
        attire: broadcast.recommendedAttire || 'Linis Dingalan t-shirt o komportableng damit pang-outdoor, bota/rubber shoes, sombrero o cap laban sa init ng araw',
        notes: broadcast.additionalNotes || 'Magtipon sa Barangay Covered Court bago mag-alas 6:00 ng umaga para sa briefing at cluster assignments.',
        qrDataUrl: broadcast.qrDataUrl,
        rawPayload: broadcast.qrPayload,
        isBroadcastLatest: true,
      });
    }

    // 2. Add remaining activities from master activities list
    activities.forEach((act) => {
      // Check if already added via broadcast
      const alreadyInList = list.some((item) => item.id === act.id);
      if (!alreadyInList) {
        const isActive = act.status === 'ongoing';
        list.push({
          id: act.id,
          title: act.title,
          barangay: act.barangay,
          targetArea: act.targetArea,
          date: act.date,
          startTime: act.callTime ? `${act.callTime}` : '06:00 AM',
          endTime: '10:00 AM',
          totalHours: '4 na Oras',
          status: act.status,
          isActive: isActive,
          adminName: act.supervisorName || 'Operations Administrator',
          tools: 'Walis tingting, dustpan, sako/trash bags, sipit/trash tongs, guwantes (gloves)',
          waterReminder: 'Magdala ng sariling tumbler o reusable water bottle para sa sapat na hydration sa tabing-dagat',
          attire: 'Linis Dingalan t-shirt o komportableng damit pang-outdoor, bota/rubber shoes, sombrero o cap laban sa init ng araw',
          notes: act.notes || 'Magtipon sa Barangay Covered Court bago mag-alas 6:00 ng umaga para sa briefing at cluster assignments.',
          isBroadcastLatest: false,
        });
      }
    });

    return list;
  }, [broadcast, activities]);

  // Set selected event whenever modal opens or broadcast updates
  useEffect(() => {
    if (broadcast) {
      setSelectedEventId(broadcast.activityId || broadcast.id);
    } else if (historyEvents.length > 0) {
      const activeEvt = historyEvents.find((e) => e.isActive) || historyEvents[0];
      setSelectedEventId(activeEvt.id);
    }
  }, [isOpen, broadcast, historyEvents]);

  // Generate QR codes for any event in history that lacks pre-rendered qrDataUrl
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function generateMissingQrs() {
      const newMap: Record<string, string> = {};
      for (const evt of historyEvents) {
        if (evt.qrDataUrl) {
          newMap[evt.id] = evt.qrDataUrl;
        } else {
          try {
            const payload = `https://linis-dingalan.aurora.gov.ph/attendance/checkin?act_id=${evt.id}&brgy=${encodeURIComponent(evt.barangay)}&date=${encodeURIComponent(evt.date)}&sig=LD-ADMIN-GEN-${evt.id.slice(-4)}`;
            const url = await generateStyledLguQrDataUrl(payload, {
              width: 480,
              title: 'LINIS DINGALAN',
              code: `LD-EVT-${evt.barangay.slice(0, 3).toUpperCase()}`,
              includeCenterBadge: true,
            });
            if (isMounted) {
              newMap[evt.id] = url;
            }
          } catch (e) {
            console.error('QR generation failed for event', evt.id, e);
          }
        }
      }
      if (isMounted) {
        setGeneratedQrMap((prev) => ({ ...prev, ...newMap }));
      }
    }

    generateMissingQrs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, historyEvents]);

  if (!isOpen) return null;

  if (historyEvents.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
        <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.15)] overflow-hidden my-auto flex flex-col p-4 sm:p-6 space-y-4 text-left">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md shrink-0">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                  Official Public Advisory • PESO & MENRO Operations
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  No Schedule Recorded for Today
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs sm:text-sm font-sans text-slate-200 leading-relaxed">
              <p>
                Please be advised that <strong>there are currently no active field operations, coastal cleanup drives, or official environmental compliance activities scheduled for today</strong>.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                All verified beneficiaries, field supervisors, and participating workers will automatically receive the official event QR code and operational guidelines here as soon as a new schedule is broadcasted by the PESO & MENRO Operations Administrator.
              </p>
            </div>

            {/* Most Recent Program / Last Event Date Box */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 text-xs font-mono space-y-1.5 text-left shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Most Recent Program / Last Event Date:
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-semibold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  Completed Record
                </span>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm">
                Dingalan Coastal Cleanliness & Environmental Compliance Operation — <span className="text-emerald-300 font-mono">October 06, 2026</span> (Brgy. Paltic)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Office Operations:</span>
                <span className="text-white text-[11px]">Monday to Friday: 8:00 AM – 5:00 PM PST</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Operations Center:</span>
                <span className="text-white text-[11px]">Barangay Poblacion, Dingalan, Aurora</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Scheduler Active</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentEvent = historyEvents.find((e) => e.id === selectedEventId) || historyEvents[0];

  const activeQrCodeUrl = currentEvent.qrDataUrl || generatedQrMap[currentEvent.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/60 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.25)] overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Header Bar */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shrink-0">
              <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400 block">
                Official Admin Advisory (PESO / MENRO)
              </span>
              <h3 className="text-sm sm:text-lg font-black text-white tracking-tight leading-tight">
                Event QR Code & Cleanup Guidelines
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
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 min-h-0 text-left">
          
          {/* ========================================================================= */}
          {/* HISTORY NG MGA EVENT NA PAALALA (WITH GREEN CIRCLE ICON ON ACTIVE EVENTS) */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Event Advisory History ({historyEvents.length} Recorded):</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Select below to view QR code and guidelines
              </span>
            </div>

            {/* Horizontal Scrollable Event History Cards */}
            <div className="flex space-x-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {historyEvents.map((evt) => {
                const isSelected = evt.id === currentEvent.id;
                return (
                  <button
                    key={evt.id}
                    type="button"
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`shrink-0 p-3 rounded-2xl border text-left transition-all cursor-pointer min-w-[240px] max-w-[280px] relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      {/* Active Status with Prominent Green Circle Icon */}
                      <div className="flex items-center justify-between gap-1">
                        {evt.isActive ? (
                          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 font-mono text-[10px] font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            {/* Pulsing Green Circle Icon */}
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                            </span>
                            <span>Active</span>
                          </div>
                        ) : evt.status === 'completed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px] font-bold">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                            Scheduled
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {evt.date}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-white line-clamp-2 leading-snug pt-0.5">
                        {evt.title}
                      </h5>
                    </div>

                    <div className="pt-2 text-[10px] font-mono text-emerald-300 flex items-center justify-between border-t border-slate-800/80 mt-2">
                      <span className="flex items-center truncate">
                        <MapPin className="w-3 h-3 mr-1 text-emerald-400 shrink-0" />
                        Brgy. {evt.barangay}
                      </span>
                      <span className="text-slate-400">{evt.startTime}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CURRENT SELECTED EVENT BANNER */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-slate-900 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                {currentEvent.isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400 flex items-center space-x-1.5 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span>Currently Active Event</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Past Event in History
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  Issued By: <strong className="text-white">{currentEvent.adminName}</strong>
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-black text-white">
                {currentEvent.title}
              </h4>
              <p className="text-xs text-emerald-300 flex items-center font-mono">
                <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                Brgy. {currentEvent.barangay} • {currentEvent.targetArea} • Event Date: <strong className="text-white ml-1">{currentEvent.date}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                const matchedAct = activities.find((a) => a.id === currentEvent.id);
                onProceedUploadAccomplishment(matchedAct);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 transform hover:scale-105 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>Upload Accomplishment</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* DETAILED CONTENT: QR CODE & INSTRUCTIONS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* LEFT: QR CODE DISPLAY (Span 5) */}
            <div className="md:col-span-5 space-y-4">
              {activeQrCodeUrl ? (
                <OfficialQrPassCard
                  qrCodeUrl={activeQrCodeUrl}
                  payloadUrl={currentEvent.rawPayload}
                  title={currentEvent.title}
                  subtitle={`Linis Dingalan • Brgy. ${currentEvent.barangay}`}
                  trackingCode={`LD-ACT-${currentEvent.id.slice(-6)}`}
                  departmentOrCluster="PESO & MENRO Operations"
                  barangay={currentEvent.barangay}
                  eventDate={currentEvent.date}
                  timeSlot={`${currentEvent.startTime} - ${currentEvent.endTime}`}
                  isLiveEvent={currentEvent.isActive}
                  securityHash={`LD-AUTH-${currentEvent.id.slice(-4)}`}
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-slate-900 rounded-3xl border border-slate-800 text-xs text-slate-400">
                  <QrCode className="w-10 h-10 text-emerald-400 animate-pulse" />
                </div>
              )}
            </div>

            {/* RIGHT: DETAILED REMINDERS & PAALALA (Span 7) */}
            <div className="md:col-span-7 space-y-3">
              {/* Schedule & Hours */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 font-mono uppercase">
                  <Clock className="w-4 h-4" />
                  <span>Operation Hours & Duration:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">TIME:</span>
                    <span className="text-white font-bold">{currentEvent.startTime} – {currentEvent.endTime}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">TOTAL DURATION:</span>
                    <span className="text-emerald-300 font-bold">{currentEvent.totalHours || '4 Hours'}</span>
                  </div>
                </div>
              </div>

              {/* Tools Reminder */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 font-mono uppercase">
                  <Wrench className="w-4 h-4" />
                  <span>Required Tools & Equipment:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {currentEvent.tools}
                </p>
              </div>

              {/* Water & Tumbler Reminder */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 font-mono uppercase">
                  <Coffee className="w-4 h-4" />
                  <span>Hydration & Tumbler Reminder:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {currentEvent.waterReminder}
                </p>
              </div>

              {/* Attire Reminder */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 font-mono uppercase">
                  <Shirt className="w-4 h-4" />
                  <span>Recommended Attire:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {currentEvent.attire}
                </p>
              </div>

              {/* Additional Notes */}
              {currentEvent.notes && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 font-mono uppercase">
                    <Info className="w-4 h-4" />
                    <span>Additional Notes from PESO / MENRO:</span>
                  </div>
                  <p className="text-xs text-amber-200 font-sans leading-relaxed">
                    {currentEvent.notes}
                  </p>
                </div>
              )}

              {/* Assigned Personnel / Staff */}
              {((broadcast as any)?.assignedPersonnel?.length > 0 || (currentEvent as any)?.assignedPersonnel?.length > 0) && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 font-mono uppercase">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Assigned Personnel / Supervisors:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {((broadcast as any)?.assignedPersonnel || (currentEvent as any)?.assignedPersonnel || []).map((person: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold"
                      >
                        👤 {person}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Primary Submit Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              const matchedAct = activities.find((a) => a.id === currentEvent.id);
              onProceedUploadAccomplishment(matchedAct);
            }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <Camera className="w-5 h-5 text-slate-950" />
            <span>Upload Accomplishment Pictures for This Event</span>
          </button>
        </div>
      </div>
    </div>
  );
};
