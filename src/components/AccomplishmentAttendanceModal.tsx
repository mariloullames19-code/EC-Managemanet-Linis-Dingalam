import React, { useState, useEffect } from 'react';
import { AttendanceRecord, User } from '../types';
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
  Filter,
} from 'lucide-react';

interface AccomplishmentAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendances: AttendanceRecord[];
  currentUser: User;
}

export const AccomplishmentAttendanceModal: React.FC<AccomplishmentAttendanceModalProps> = ({
  isOpen,
  onClose,
  attendances,
  currentUser,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-7xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.2)] overflow-hidden my-auto flex flex-col max-h-[94vh]">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-6 py-4.5 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] shrink-0">
              <Images className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
                  Admin Accomplishment Portal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {attendances.length} Attendees
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {totalPhotosCount} Pictures
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Accomplishment Attendance Records
              </h2>
              <p className="text-xs text-slate-400">
                Pindutin ang pangalan ng attendee sa table upang makita ang mga larawan ng accomplishment
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              title="I-print ang listahan ng records"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Print Record</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Isara ang modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FILTER & SEARCH BAR                                                       */}
        {/* ========================================================================= */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
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
        {/* ATTENDANCE RECORDS TABLE (TABLE VIEW AS REQUESTED)                        */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {filteredAttendances.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-slate-950/40 rounded-2xl border border-slate-800">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-bold text-base">Walang nakitang accomplishment record</p>
              <p className="text-slate-500 text-xs">
                Walang tugmang attendance records sa kasalukuyang search o filter.
              </p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40 shadow-inner">
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
                            <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 bg-slate-900/80 px-2 py-1 rounded-lg border border-cyan-500/30 inline-flex">
                              <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span>{att.localPhTime}</span>
                            </div>
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
              {/* Event & Timestamp Metadata */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>{selectedRecordForPhotos.activityTitle}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Oras Naipasa: <strong>{selectedRecordForPhotos.localPhTime}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-[11px] pt-1 border-t border-slate-900">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{selectedRecordForPhotos.locationDescription}</span>
                  </span>
                  <span>•</span>
                  <span>Verified by: <strong className="text-white">{selectedRecordForPhotos.verifiedByOfficerName}</strong></span>
                </div>
              </div>

              {/* Accomplishment Photos Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Images className="w-4 h-4 text-emerald-400" />
                    <span>Mga Sinend na Accomplishment Pictures ({getRecordPhotos(selectedRecordForPhotos).length} na Larawan):</span>
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

              {/* Ulat ng Paglilinis / Accomplishment Notes */}
              {(selectedRecordForPhotos.accomplishmentNotes || selectedRecordForPhotos.notes) && (
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 font-mono text-[11px] uppercase">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ulat ng Paglilinis / Accomplishment Notes:</span>
                  </div>
                  <p className="leading-relaxed">
                    {selectedRecordForPhotos.accomplishmentNotes || selectedRecordForPhotos.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Close Bar */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex justify-end">
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
      {/* FULL-SCREEN PHOTO LIGHTBOX (ZOOM)                                         */}
      {/* ========================================================================= */}
      {activePhotoLightbox && (
        <div className="fixed inset-0 z-70 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            type="button"
            onClick={() => setActivePhotoLightbox(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors cursor-pointer"
            title="Isara ang zoom"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl w-full space-y-4 text-center">
            <div className="relative inline-block max-h-[75vh] rounded-2xl overflow-hidden border-2 border-emerald-500/60 shadow-2xl bg-slate-950">
              <img
                src={activePhotoLightbox.photoUrl}
                alt="Accomplishment Full Proof"
                className="max-h-[75vh] w-auto mx-auto object-contain"
              />
            </div>

            <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-2xl max-w-2xl mx-auto text-left space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-white">
                    {activePhotoLightbox.record.beneficiaryName} ({activePhotoLightbox.record.beneficiaryCode})
                  </h4>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {activePhotoLightbox.record.activityTitle}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Larawan {activePhotoLightbox.photoIndex + 1} / {activePhotoLightbox.totalPhotos}
                </span>
              </div>
              <div className="text-xs text-slate-300 font-mono flex items-center justify-between pt-1 border-t border-slate-800">
                <span>{activePhotoLightbox.record.localPhTime}</span>
                <span>{activePhotoLightbox.record.locationDescription}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
