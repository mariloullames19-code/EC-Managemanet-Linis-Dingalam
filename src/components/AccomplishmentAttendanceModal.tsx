import React, { useState, useEffect } from 'react';
import { AttendanceRecord, User } from '../types';
import { FullScreenPhotoViewer } from './FullScreenPhotoViewer';
import { SendAnonymousMessageModal } from './SendAnonymousMessageModal';
import { formatPhilippineDateTime } from '../utils/philippineClock';
import { exportAttendanceToExcel } from '../utils/excelExporter';
import {
  Camera,
  Images,
  MapPin,
  Clock,
  UserCheck,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Printer,
  Eye,
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  Trash2,
  AlertTriangle,
  EyeOff,
} from 'lucide-react';

interface AccomplishmentAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendances: AttendanceRecord[];
  currentUser: User;
  onDeleteAll?: () => Promise<void> | void;
  onAutoPruneStale?: () => Promise<void> | void;
}

export const AccomplishmentAttendanceModal: React.FC<AccomplishmentAttendanceModalProps> = ({
  isOpen,
  onClose,
  attendances,
  currentUser,
  onDeleteAll,
  onAutoPruneStale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 20;

  // Selected Attendee Record to display photos
  const [selectedRecordForPhotos, setSelectedRecordForPhotos] = useState<AttendanceRecord | null>(null);

  // Full-screen photo lightbox
  const [activePhotoLightbox, setActivePhotoLightbox] = useState<{
    record: AttendanceRecord;
    photoUrl: string;
    photoIndex: number;
    totalPhotos: number;
  } | null>(null);

  // Delete All State
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isAnonymousSendOpen, setIsAnonymousSendOpen] = useState<boolean>(false);
  const [exportSuccessToast, setExportSuccessToast] = useState<string | null>(null);

  // Trigger auto-prune of records older than 1 month (30 days) when modal is opened
  useEffect(() => {
    if (isOpen && onAutoPruneStale) {
      onAutoPruneStale();
    }
  }, [isOpen]);

  // Automatic Excel Table Export for Print Record
  const handlePrintRecordAsExcel = () => {
    const recordsToExport = filteredAttendances.length > 0 ? filteredAttendances : attendances;
    if (recordsToExport.length === 0) {
      alert('Walang nakitang accomplishment attendance records na mai-export.');
      return;
    }

    const result = exportAttendanceToExcel(
      recordsToExport,
      'Linis-Dingalan-Accomplishment-Attendance-Records'
    );

    if (result.success) {
      setExportSuccessToast(
        `Matagumpay na na-print at na-download ang Excel table file (${result.fileName}) na may kumpletong detalye ng ${result.count} na nakapag-upload ng larawan!`
      );
      setTimeout(() => setExportSuccessToast(null), 6000);
    }
  };

  const handleExecuteDeleteAll = async () => {
    if (!onDeleteAll) return;
    setIsDeleting(true);
    try {
      await onDeleteAll();
      setIsConfirmDeleteOpen(false);
      setSelectedRecordForPhotos(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBarangay]);

  if (!isOpen) return null;

  // Filter records
  const filteredAttendances = attendances.filter((att) => {
    const matchesSearch =
      att.beneficiaryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.beneficiaryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.activityTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.locationDescription.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBarangay =
      selectedBarangay === 'all' ||
      att.locationDescription.toLowerCase().includes(selectedBarangay.toLowerCase());

    return matchesSearch && matchesBarangay;
  });

  // Pagination calculation: exactly 20 items per page; items 21+ appear on next page
  const totalPages = Math.ceil(filteredAttendances.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredAttendances.length);
  const currentAttendances = filteredAttendances.slice(startIndex, endIndex);

  // Calculate total accomplishment photos across all records
  const totalPhotosCount = attendances.reduce((acc, curr) => {
    const count =
      curr.accomplishmentPhotos && curr.accomplishmentPhotos.length > 0
        ? curr.accomplishmentPhotos.length
        : curr.photoWatermarkedUrl
        ? 1
        : 0;
    return acc + count;
  }, 0);

  const getRecordPhotos = (att: AttendanceRecord): string[] => {
    return att.accomplishmentPhotos && att.accomplishmentPhotos.length > 0
      ? att.accomplishmentPhotos
      : att.photoWatermarkedUrl
      ? [att.photoWatermarkedUrl]
      : [];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-7xl bg-slate-900 border-2 border-emerald-500/50 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.2)] overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-4.5 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-3.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] shrink-0">
              <Images className="w-4 h-4 sm:w-6 sm:h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                  Admin Accomplishment Portal
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {attendances.length} Attendees
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {totalPhotosCount} Pictures
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 hidden sm:inline-flex items-center gap-1 shadow-sm">
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Awtomatikong nabubura matapos ang 1 buwan</span>
                </span>
              </div>
              <h2 className="text-sm sm:text-2xl font-black text-white tracking-tight mt-0.5 leading-tight">
                Accomplishment Attendance Records
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Pindutin ang pangalan ng attendee upang makita ang mga larawan
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-end sm:self-center">
            {/* Delete All Button as requested */}
            {onDeleteAll && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                disabled={attendances.length === 0 || isDeleting}
                className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/70 text-rose-200 hover:text-white font-mono text-[11px] sm:text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                title="Permanenteng burahin ang lahat ng Accomplishment Attendance records"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Burahin Lahat</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintRecordAsExcel}
              className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 font-mono text-[11px] sm:text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 shrink-0"
              title="I-print at i-download ang buong records sa Excel table file (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
              <span>Print Record (Excel)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Isara ang modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Toast / Banner for Excel Print & Export Success */}
        {exportSuccessToast && (
          <div className="px-4 sm:px-6 py-2.5 bg-emerald-950 border-b border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{exportSuccessToast}</span>
            </div>
            <button
              onClick={() => setExportSuccessToast(null)}
              className="p-1 text-emerald-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FILTER & SEARCH BAR                                                       */}
        {/* ========================================================================= */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hanapin ang attendee, code, o event..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">Barangay:</span>
            <select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-xl text-xs text-slate-200 focus:outline-none font-mono cursor-pointer"
            >
              <option value="all">Lahat ng Barangay (All)</option>
              <option value="Paltic">Paltic</option>
              <option value="Poblacion">Poblacion</option>
              <option value="Ibona">Ibona</option>
              <option value="Aplaya">Aplaya</option>
              <option value="Umiray">Umiray</option>
              <option value="Tanawan">Tanawan</option>
              <option value="Butas Na Bato">Butas Na Bato</option>
              <option value="Cabog">Cabog</option>
              <option value="Caragsacan">Caragsacan</option>
              <option value="Davil-Davilan">Davil-Davilan</option>
              <option value="Dikapanikian">Dikapanikian</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ATTENDANCE RECORDS (MOBILE CARDS + DESKTOP TABLE)                         */}
        {/* ========================================================================= */}
        <div className="p-2.5 sm:p-6 overflow-y-auto flex-1">
          {filteredAttendances.length === 0 ? (
            <div className="text-center py-12 sm:py-16 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
              <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-bold text-sm sm:text-base">Walang nakitang accomplishment record</p>
              <p className="text-slate-500 text-xs">
                Walang tugmang attendance records sa kasalukuyang search o filter.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Compact Cards (< 640px) */}
              <div className="sm:hidden space-y-2">
                {currentAttendances.map((att, index) => {
                  const photos = getRecordPhotos(att);
                  const dt = formatPhilippineDateTime(att.timestamp || att.localPhTime, att.localPhTime);
                  const rowNumber = startIndex + index + 1;

                  return (
                    <div
                      key={att.id || `${att.beneficiaryCode}-${index}`}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForPhotos(att)}
                          className="flex items-center space-x-2 text-left group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-mono font-black text-xs shrink-0">
                            #{rowNumber}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs leading-tight group-hover:text-emerald-300">
                              {att.beneficiaryName}
                            </div>
                            <span className="font-mono text-[9px] text-emerald-400 block mt-0.5">
                              {att.beneficiaryCode}
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedRecordForPhotos(att)}
                          className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[10px] inline-flex items-center gap-1 shrink-0"
                        >
                          <Camera className="w-3 h-3 text-emerald-400" />
                          <span>{photos.length} Photo{photos.length > 1 ? 's' : ''}</span>
                        </button>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 space-y-1 text-[10px]">
                        <div className="flex items-center gap-1 text-slate-300 truncate">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{att.locationDescription}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300 truncate">
                          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate font-semibold text-white">{att.activityTitle}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[9px] font-mono text-cyan-300">
                          <span>{dt.exactTimeWithSeconds} PST</span>
                          <span className="text-slate-400">{dt.monthTagalog} {dt.dayNum}, {dt.yearNum}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>VERIFIED</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedRecordForPhotos(att)}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 text-slate-950 font-mono font-black text-[10px] inline-flex items-center gap-1 shadow transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Tingnan Larawan</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Table (>= 640px) */}
              <div className="hidden sm:block border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40 shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-950/90 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 border-b border-slate-800">
                        <th className="py-3 px-3.5 text-center w-12">#</th>
                        <th className="py-3 px-4 min-w-[200px]">Pangalan ng Attendee (Click to View Photos)</th>
                        <th className="py-3 px-4 min-w-[180px]">Barangay at Lokasyon</th>
                        <th className="py-3 px-4 min-w-[220px]">Gawain / Cleanup Activity</th>
                        <th className="py-3 px-4 min-w-[170px]">Oras Naipasa (PST)</th>
                        <th className="py-3 px-3 text-center min-w-[100px]">Larawan</th>
                        <th className="py-3 px-3 text-center min-w-[120px]">Katayuan</th>
                        <th className="py-3 px-3.5 text-center min-w-[130px]">Aksyon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {currentAttendances.map((att, index) => {
                        const photos = getRecordPhotos(att);
                        const rowNumber = startIndex + index + 1;

                        return (
                          <tr
                            key={att.id || `${att.beneficiaryCode}-${index}`}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            {/* Row Number */}
                            <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-500">
                              {rowNumber}
                            </td>

                            {/* Attendee Name - Clickable as requested */}
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => setSelectedRecordForPhotos(att)}
                                className="text-left group/btn flex items-center space-x-2.5 transition-all cursor-pointer"
                                title="Pindutin ang pangalan upang lumabas ang larawan"
                              >
                                <div className="w-8 h-8 rounded-lg bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-mono font-black text-xs shrink-0 group-hover/btn:scale-110 group-hover/btn:border-emerald-400 transition-all">
                                  {att.beneficiaryName.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-extrabold text-white text-sm group-hover/btn:text-emerald-300 group-hover/btn:underline decoration-emerald-400 underline-offset-2 flex items-center gap-1.5">
                                    {att.beneficiaryName}
                                    <Camera className="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block mt-0.5">
                                    {att.beneficiaryCode}
                                  </span>
                                </div>
                              </button>
                            </td>

                            {/* Location & Barangay */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              <div className="flex items-center gap-1.5 text-xs text-slate-200">
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate max-w-[200px]" title={att.locationDescription}>
                                  {att.locationDescription}
                                </span>
                              </div>
                            </td>

                            {/* Activity Title */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 text-slate-200">
                                <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span className="font-semibold text-xs leading-snug truncate max-w-[240px]" title={att.activityTitle}>
                                  {att.activityTitle}
                                </span>
                              </div>
                            </td>

                            {/* Time Submitted */}
                            <td className="py-3 px-4 font-mono text-slate-300">
                              {(() => {
                                const dt = formatPhilippineDateTime(att.timestamp || att.localPhTime, att.localPhTime);
                                return (
                                  <div className="flex flex-col text-[11px] text-cyan-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                                    <span className="font-bold text-white flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                                      <span>{dt.exactTimeWithSeconds} PST</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {dt.dayOfWeekTagalog}, {dt.monthTagalog} {dt.dayNum}, {dt.yearNum}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Photos Count Badge */}
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedRecordForPhotos(att)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer"
                                title="Tingnan ang mga larawan"
                              >
                                <Camera className="w-3 h-3 text-emerald-400" />
                                <span>{photos.length} Photo{photos.length > 1 ? 's' : ''}</span>
                              </button>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>VERIFIED</span>
                              </span>
                            </td>

                            {/* Action Button */}
                            <td className="py-3 px-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedRecordForPhotos(att)}
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-mono font-black text-[11px] inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                                title="Ipakita ang accomplishment pictures"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-950" />
                                <span>Tingnan</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* PAGINATION CONTROLS (20 ITEMS PER PAGE, 21+ ON NEXT PAGE AS REQUESTED)    */}
          {/* ========================================================================= */}
          {filteredAttendances.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
              <div className="text-slate-400">
                Ipinapakita ang <strong className="text-white">{startIndex + 1}</strong> hanggang{' '}
                <strong className="text-white">{endIndex}</strong> sa kabuuang{' '}
                <strong className="text-emerald-400">{filteredAttendances.length}</strong> na tala (20 bawat pahina)
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Nakaraan (Prev)</span>
                </button>

                {/* Page Number Indicators */}
                <div className="flex items-center space-x-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === pageNumber
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-bold flex items-center space-x-1 transition-all cursor-pointer"
                >
                  <span>Susunod (Next 21+)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER INFO BAR                                                           */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Digital Environmental Compliance • Linis Dingalan Attendance System</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Isara (Close)
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACCOMPLISHMENT PHOTOS VIEWER MODAL (OPENS ONLY WHEN NAME IS CLICKED)      */}
      {/* ========================================================================= */}
      {selectedRecordForPhotos && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-slate-900 border-2 border-emerald-500/70 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(16,185,129,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
                  <Camera className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                    Accomplishment Photo Proof
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    {selectedRecordForPhotos.beneficiaryName}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {selectedRecordForPhotos.beneficiaryCode}
                    </span>
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecordForPhotos(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Isara ang larawan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details & Photos Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-left">
              {/* Event & Submitted Data Summary (Matches 4-field structure from upload modal) */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-3 font-mono text-xs shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Field 1: Attendee Name & Badge */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                      1. Pangalan ng Attendee (Full Name):
                    </span>
                    <div className="text-white font-black text-sm flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{selectedRecordForPhotos.beneficiaryName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {selectedRecordForPhotos.beneficiaryCode}
                      </span>
                    </div>
                  </div>

                  {/* Field 2: Cleaned Area */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                      2. Lugar kung Saang Area Nakapaglinis:
                    </span>
                    <div className="text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="leading-snug">{selectedRecordForPhotos.locationDescription}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gawain: <strong className="text-white">{selectedRecordForPhotos.activityTitle}</strong></span>
                  </div>
                  {(() => {
                    const dt = formatPhilippineDateTime(
                      selectedRecordForPhotos.timestamp || selectedRecordForPhotos.localPhTime,
                      selectedRecordForPhotos.localPhTime
                    );
                    return (
                      <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/70 px-3 py-1.5 rounded-lg border border-cyan-500/40 font-mono text-[11px] font-bold shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                        <span>
                          <strong>Na-upload:</strong> {dt.dayOfWeekTagalog}, {dt.monthTagalog} {dt.dayNum}, {dt.yearNum} ganap na <strong className="text-white underline">{dt.exactTimeWithSeconds} PST</strong>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Accomplishment Photos Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Images className="w-4 h-4 text-emerald-400" />
                    <span>3. Mga Sinend na Accomplishment Pictures ({getRecordPhotos(selectedRecordForPhotos).length} na Larawan):</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">Pindutin ang picture para palakihin (fullscreen)</span>
                </div>

                {getRecordPhotos(selectedRecordForPhotos).length === 0 ? (
                  <div className="p-8 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-slate-500 text-xs font-mono">
                    Walang nakakabit na larawan sa record na ito.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {getRecordPhotos(selectedRecordForPhotos).map((photoUrl, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() =>
                          setActivePhotoLightbox({
                            record: selectedRecordForPhotos,
                            photoUrl,
                            photoIndex: pIdx,
                            totalPhotos: getRecordPhotos(selectedRecordForPhotos).length,
                          })
                        }
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 hover:border-emerald-400 transition-all cursor-pointer shadow-md hover:scale-[1.02]"
                      >
                        <img
                          src={photoUrl}
                          alt={`Accomplishment ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                          <span className="text-[11px] font-mono text-white font-bold flex items-center">
                            <ExternalLink className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                            Palakihin Larawan #{pIdx + 1}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-slate-950/80 text-[10px] font-mono text-emerald-300 font-bold border border-emerald-500/40">
                          #{pIdx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Field 4: Ulat sa Ginawang Paglilinis / Accomplishment Notes */}
              {(selectedRecordForPhotos.accomplishmentNotes || selectedRecordForPhotos.notes) && (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 font-mono text-[11px] uppercase">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>4. Ulat sa Ginawang Paglilinis (Cleanup Accomplishment Notes):</span>
                  </div>
                  <p className="leading-relaxed text-white/90 pl-5 font-sans">
                    {selectedRecordForPhotos.accomplishmentNotes || selectedRecordForPhotos.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Close Bar with Anonymous Report Button */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsAnonymousSendOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
                title="Mag-send ng Anonymous Report o Feedback sa Admin ukol sa larawang ito"
              >
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Mag-send ng Anonymous Message sa Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecordForPhotos(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer"
              >
                Isara ang Larawan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL-SCREEN PHOTO LIGHTBOX WITH PHILIPPINE TIME & GEOTAG OVERLAY          */}
      {/* ========================================================================= */}
      {activePhotoLightbox && (
        <FullScreenPhotoViewer
          isOpen={!!activePhotoLightbox}
          onClose={() => setActivePhotoLightbox(null)}
          photos={getRecordPhotos(activePhotoLightbox.record)}
          initialIndex={activePhotoLightbox.photoIndex}
          beneficiaryName={activePhotoLightbox.record.beneficiaryName}
          beneficiaryCode={activePhotoLightbox.record.beneficiaryCode}
          activityTitle={activePhotoLightbox.record.activityTitle}
          locationDescription={activePhotoLightbox.record.locationDescription}
          cleanupNotes={activePhotoLightbox.record.accomplishmentNotes || activePhotoLightbox.record.notes}
          timestamp={activePhotoLightbox.record.timestamp}
          localPhTime={activePhotoLightbox.record.localPhTime}
          latitude={activePhotoLightbox.record.latitude}
          longitude={activePhotoLightbox.record.longitude}
          accuracyMeters={activePhotoLightbox.record.accuracyMeters}
          altitudeMeters={activePhotoLightbox.record.altitudeMeters}
          verifiedByOfficer={activePhotoLightbox.record.verifiedByOfficerName}
        />
      )}
      {/* ========================================================================= */}
      {/* CONFIRM PERMANENT DELETE ALL MODAL                                        */}
      {/* ========================================================================= */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-500/70 rounded-3xl p-6 text-center space-y-4 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_40px_rgba(244,63,94,0.3)] animate-scaleIn">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2 text-left">
              <h3 className="text-lg font-black text-white text-center">
                Permanenteng Pagbura ng Lahat ng Records
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed text-center">
                Sigurado ka bang nais mong permanenteng burahin ang lahat ng <strong>{attendances.length}</strong> accomplishment attendance records at ang mga larawan nito?
              </p>
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-[11px] font-mono text-rose-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Babala: Hindi na maibabalik ang datos (Permanent)</span>
                </p>
                <p className="text-slate-300 text-[10px] leading-normal font-sans">
                  Permanenteng mawawala ang lahat ng accomplishment photo proofs, geolocation logs, at attendance history mula sa server at database.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleExecuteDeleteAll}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Anonymous Message Modal */}
      {isAnonymousSendOpen && selectedRecordForPhotos && (
        <SendAnonymousMessageModal
          isOpen={isAnonymousSendOpen}
          onClose={() => setIsAnonymousSendOpen(false)}
          referencedPhotoUrl={getRecordPhotos(selectedRecordForPhotos)[0]}
          referencedActivityTitle={selectedRecordForPhotos.activityTitle}
          referencedLocation={selectedRecordForPhotos.locationDescription}
        />
      )}
    </div>
  );
};
