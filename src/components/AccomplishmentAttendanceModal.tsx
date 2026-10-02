import React, { useState } from 'react';
import { AttendanceRecord, User } from '../types';
import {
  Camera,
  Images,
  MapPin,
  Clock,
  UserCheck,
  Download,
  Search,
  CheckCircle2,
  X,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Printer,
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
  const [activePhotoLightbox, setActivePhotoLightbox] = useState<{
    record: AttendanceRecord;
    photoUrl: string;
    photoIndex: number;
    totalPhotos: number;
  } | null>(null);

  if (!isOpen) return null;

  // Filter records
  const filteredAttendances = attendances.filter((att) => {
    const matchesSearch =
      att.beneficiaryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.beneficiaryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.activityTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.locationDescription.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBarangay =
      selectedBarangay === 'all' || att.locationDescription.toLowerCase().includes(selectedBarangay.toLowerCase());

    return matchesSearch && matchesBarangay;
  });

  // Calculate total accomplishment photos
  const totalPhotosCount = attendances.reduce((acc, curr) => {
    const count = curr.accomplishmentPhotos && curr.accomplishmentPhotos.length > 0
      ? curr.accomplishmentPhotos.length
      : (curr.photoWatermarkedUrl ? 1 : 0);
    return acc + count;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.2)] overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] shrink-0">
              <Images className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-emerald-400">
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
                Mga patunay at accomplishment photos ng mga naglinis sa komunidad ng Dingalan
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Print Record</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Hanapin ang attendee, code, o event..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">Barangay:</span>
            <select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:border-emerald-400 focus:outline-none font-mono"
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

        {/* Attendance Cards List with Accomplishment Photos */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredAttendances.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-slate-300 font-bold text-base">Walang nakitang accomplishment record</p>
              <p className="text-slate-500 text-xs">
                I-scan ng user account ang QR code ng Digital ID upang mag-upload ng mga patunay na larawan.
              </p>
            </div>
          ) : (
            filteredAttendances.map((att) => {
              const photos = att.accomplishmentPhotos && att.accomplishmentPhotos.length > 0
                ? att.accomplishmentPhotos
                : (att.photoWatermarkedUrl ? [att.photoWatermarkedUrl] : []);

              return (
                <div
                  key={att.id}
                  className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-lg space-y-4"
                >
                  {/* Top Attendee & Event Metadata */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-mono font-black text-sm shrink-0">
                        {att.beneficiaryName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-black text-white">{att.beneficiaryName}</h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {att.beneficiaryCode}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-emerald-400 flex items-center mt-0.5">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {att.activityTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
                      <span className="flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{att.localPhTime}</span>
                      </span>
                      <span className="flex items-center space-x-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="truncate max-w-[200px]">{att.locationDescription}</span>
                      </span>
                      <span className="flex items-center space-x-1 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/40 text-emerald-300 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Naka-Attend</span>
                      </span>
                    </div>
                  </div>

                  {/* Accomplishment Proof Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wide">
                          Accomplishment Pictures ({photos.length} na Larawan):
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Verified by: <strong className="text-white">{att.verifiedByOfficerName}</strong>
                      </span>
                    </div>

                    {/* Photos Thumbnail Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {photos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() =>
                            setActivePhotoLightbox({
                              record: att,
                              photoUrl: photo,
                              photoIndex: pIdx,
                              totalPhotos: photos.length,
                            })
                          }
                          className="group relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-700 hover:border-emerald-400 transition-all cursor-pointer shadow-md hover:scale-105"
                        >
                          <img
                            src={photo}
                            alt={`Accomplishment ${pIdx + 1} ni ${att.beneficiaryName}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[10px] font-mono text-white font-bold flex items-center">
                              <ExternalLink className="w-3 h-3 mr-1 text-emerald-300" />
                              Palakihin #{pIdx + 1}
                            </span>
                          </div>
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-emerald-300 font-bold border border-emerald-500/30">
                            #{pIdx + 1}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Accomplishment Notes / Description if present */}
                    {(att.accomplishmentNotes || att.notes) && (
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-xs text-slate-300">
                        <span className="font-bold text-emerald-400 font-mono">Ulat ng Paglilinis: </span>
                        {att.accomplishmentNotes || att.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Digital Environmental Compliance • Linis Dingalan Attendance System</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Isara (Close)
          </button>
        </div>
      </div>

      {/* Full-Screen Photo Lightbox */}
      {activePhotoLightbox && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fadeIn">
          <button
            onClick={() => setActivePhotoLightbox(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
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
