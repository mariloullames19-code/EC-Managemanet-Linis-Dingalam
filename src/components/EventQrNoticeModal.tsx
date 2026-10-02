import React, { useState, useEffect } from 'react';
import { EventQrBroadcast, Activity } from '../types';
import QRCode from 'qrcode';
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
            const url = await QRCode.toDataURL(payload, {
              width: 320,
              margin: 1,
              color: { dark: '#022c22', light: '#ffffff' },
              errorCorrectionLevel: 'H',
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

  const currentEvent = historyEvents.find((e) => e.id === selectedEventId) || historyEvents[0] || {
    id: 'default',
    title: 'Linis Dingalan Environmental Compliance Program',
    barangay: 'Paltic',
    targetArea: 'Dingalan Feeder Port & Coastal Shore',
    date: new Date().toISOString().split('T')[0],
    startTime: '06:00 AM',
    endTime: '10:00 AM',
    totalHours: '4 na Oras',
    status: 'ongoing' as const,
    isActive: true,
    adminName: 'Admin Officer',
    tools: 'Walis tingting, dustpan, sako/trash bags, sipit/trash tongs, guwantes',
    waterReminder: 'Magdala ng sariling tumbler para sa hydration',
    attire: 'Linis Dingalan t-shirt o outdoor attire, rubber shoes/bota, cap/sombrero',
    notes: 'Magtipon sa Barangay Covered Court bago mag-alas 6:00 ng umaga.',
  };

  const activeQrCodeUrl = currentEvent.qrDataUrl || generatedQrMap[currentEvent.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/60 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.25)] overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
              <QrCode className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                Opisyal na Abiso mula sa Admin (PESO / MENRO)
              </span>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Event QR Code & Kasaysayan ng mga Paalala sa Paglilinis
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* ========================================================================= */}
          {/* HISTORY NG MGA EVENT NA PAALALA (WITH GREEN CIRCLE ICON ON ACTIVE EVENTS) */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide flex items-center space-x-2">
                <History className="w-4 h-4 text-emerald-400" />
                <span>Kasaysayan ng mga Event Paalala ({historyEvents.length} Naitala):</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                Pumili sa ibaba upang buksan ang QR at mga paalala
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
                            <span>AKTIBO (Active)</span>
                          </div>
                        ) : evt.status === 'completed' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono text-[10px] font-bold">
                            Tapos Na (Completed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                            Nakatakda (Scheduled)
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
                    <span>Kasulukuyang Aktibong Event</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    Naunang Event sa History
                  </span>
                )}
                <span className="text-xs font-mono text-slate-400">
                  Galing kay: <strong className="text-white">{currentEvent.adminName}</strong>
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-black text-white">
                {currentEvent.title}
              </h4>
              <p className="text-xs text-emerald-300 flex items-center font-mono">
                <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                Brgy. {currentEvent.barangay} • {currentEvent.targetArea}
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
              <span>Mag-Upload ng Accomplishment</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* DETAILED CONTENT: QR CODE & INSTRUCTIONS */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* LEFT: QR CODE DISPLAY (Span 5) */}
            <div className="md:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 text-center space-y-3 shadow-md">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider block">
                OFFICIAL ATTENDANCE QR CODE
              </span>

              {activeQrCodeUrl ? (
                <div className="p-3 bg-white rounded-2xl shadow-xl inline-block mx-auto border-2 border-emerald-400/50">
                  <img
                    src={activeQrCodeUrl}
                    alt={`Event QR - ${currentEvent.title}`}
                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-slate-900 rounded-2xl mx-auto text-xs text-slate-400">
                  <QrCode className="w-10 h-10 text-emerald-400" />
                </div>
              )}

              <p className="text-[11px] text-slate-300 font-mono">
                Gamitin ang QR code na ito para sa pag-check-in at pag-upload ng accomplishment photos ng inyong paglilinis.
              </p>

              {activeQrCodeUrl && (
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <a
                    href={activeQrCodeUrl}
                    download={`Linis-Dingalan-QR-${currentEvent.barangay}-${currentEvent.date}.png`}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>I-save ang QR</span>
                  </a>
                </div>
              )}
            </div>

            {/* RIGHT: DETAILED REMINDERS & PAALALA (Span 7) */}
            <div className="md:col-span-7 space-y-3">
              {/* Schedule & Hours */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 font-mono uppercase">
                  <Clock className="w-4 h-4" />
                  <span>Oras ng Paglilinis & Tagal:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">ORAS:</span>
                    <span className="text-white font-bold">{currentEvent.startTime} – {currentEvent.endTime}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">KABUUANG ORAS:</span>
                    <span className="text-emerald-300 font-bold">{currentEvent.totalHours || '4 na Oras'}</span>
                  </div>
                </div>
              </div>

              {/* Tools Reminder */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 font-mono uppercase">
                  <Wrench className="w-4 h-4" />
                  <span>Mga Dapat Dalhin na Kagamitan / Tools:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {currentEvent.tools}
                </p>
              </div>

              {/* Water & Tumbler Reminder */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 font-mono uppercase">
                  <Coffee className="w-4 h-4" />
                  <span>Paalala sa Tubig & Tumbler:</span>
                </div>
                <p className="text-xs text-slate-200 font-sans leading-relaxed">
                  {currentEvent.waterReminder}
                </p>
              </div>

              {/* Attire Reminder */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-teal-400 font-mono uppercase">
                  <Shirt className="w-4 h-4" />
                  <span>Dapat na Kasuotan (Attire):</span>
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
                    <span>Karagdagang Paalala mula sa PESO / MENRO:</span>
                  </div>
                  <p className="text-xs text-amber-200 font-sans leading-relaxed">
                    {currentEvent.notes}
                  </p>
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
            <span>Mag-Upload ng Accomplishment Pictures para sa Event na Ito</span>
          </button>
        </div>
      </div>
    </div>
  );
};
