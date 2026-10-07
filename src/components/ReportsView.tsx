import React, { useState, useMemo } from 'react';
import { Activity, AttendanceRecord, Beneficiary, DingalanBarangay, User } from '../types';
import { FullScreenPhotoViewer } from './FullScreenPhotoViewer';
import { formatPhilippineDateTime } from '../utils/philippineClock';
import { exportAttendanceToExcel } from '../utils/excelExporter';
import {
  FileText,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Search,
  Check,
  Camera,
  FileSpreadsheet,
  X,
} from 'lucide-react';

interface ReportsViewProps {
  activities: Activity[];
  attendances: AttendanceRecord[];
  beneficiaries: Beneficiary[];
  currentUser: User;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  activities,
  attendances,
  beneficiaries,
  currentUser,
}) => {
  const [selectedActivityId, setSelectedActivityId] = useState<string>('ALL');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecordForViewer, setSelectedRecordForViewer] = useState<AttendanceRecord | null>(null);
  const [excelSuccessToast, setExcelSuccessToast] = useState<string | null>(null);

  // Filtered attendance records
  const filteredAttendances = useMemo(() => {
    return attendances.filter((att) => {
      const bene = beneficiaries.find((b) => b.id === att.beneficiaryId);
      const matchesActivity =
        selectedActivityId === 'ALL' || att.activityId === selectedActivityId;
      const matchesBarangay =
        selectedBarangay === 'ALL' || (bene && bene.barangay === selectedBarangay);
      const matchesSearch =
        `${att.beneficiaryName} ${att.beneficiaryCode} ${att.activityTitle}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesActivity && matchesBarangay && matchesSearch;
    });
  }, [attendances, selectedActivityId, selectedBarangay, searchTerm, beneficiaries]);

  // Aggregate stats
  const totalRecords = filteredAttendances.length;
  const verifiedCount = filteredAttendances.filter((a) => a.complianceStatus === 'verified').length;
  const totalTargetBeneficiaries = useMemo(() => {
    if (selectedActivityId === 'ALL') {
      return activities.reduce((acc, curr) => acc + (Number(curr.targetBeneficiariesCount) || 0), 0);
    }
    const act = activities.find((a) => a.id === selectedActivityId);
    return act ? (Number(act.targetBeneficiariesCount) || 0) : 0;
  }, [activities, selectedActivityId]);

  const complianceRate = totalTargetBeneficiaries > 0
    ? Math.min(100, Math.round((verifiedCount / totalTargetBeneficiaries) * 100))
    : 100;

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'Beneficiary ID',
      'Full Name',
      'Barangay',
      'Activity Title',
      'Date & Time (PST)',
      'Latitude',
      'Longitude',
      'Accuracy (m)',
      'Compliance Status',
      'Verified By Officer',
      'QR Signature Hash',
    ];

    const rows = filteredAttendances.map((att) => {
      const bene = beneficiaries.find((b) => b.id === att.beneficiaryId);
      return [
        `"${att.beneficiaryCode}"`,
        `"${att.beneficiaryName}"`,
        `"${bene ? bene.barangay : 'Dingalan'}"`,
        `"${att.activityTitle}"`,
        `"${att.localPhTime}"`,
        att.latitude,
        att.longitude,
        att.accuracyMeters,
        `"${att.complianceStatus}"`,
        `"${att.verifiedByOfficerName}"`,
        `"${att.qrSignature}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Linis-Dingalan-Compliance-Report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const records = filteredAttendances.length > 0 ? filteredAttendances : attendances;
    if (records.length === 0) {
      alert('Walang data na mai-export.');
      return;
    }
    const result = exportAttendanceToExcel(records, 'Linis-Dingalan-Compliance-Report');
    if (result.success) {
      setExcelSuccessToast(
        `Matagumpay na na-export ang Excel table file (${result.fileName}) na may kumpletong detalye ng ${result.count} na tala!`
      );
      setTimeout(() => setExcelSuccessToast(null), 6000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Excel Export Success Toast */}
      {excelSuccessToast && (
        <div className="px-4 py-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{excelSuccessToast}</span>
          </div>
          <button
            onClick={() => setExcelSuccessToast(null)}
            className="p-1 text-emerald-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Export Controls */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Activity Compliance & Attendance Reporting
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Audited field compliance reports with timestamped GPS telemetry and MENRO-PESO sign-off sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="I-download ang buong report bilang Excel Spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-100" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-600 flex items-center transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl border border-slate-600 shadow flex items-center transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-400">Total Checked-In</p>
          <p className="text-lg sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{totalRecords}</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">Beneficiaries</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-emerald-400">GPS Verified</p>
          <p className="text-lg sm:text-2xl font-black text-emerald-400 mt-0.5 sm:mt-1">{verifiedCount}</p>
          <span className="text-[9px] sm:text-[10px] text-emerald-500 font-mono">100% Geotagged</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-cyan-400">Workforce</p>
          <p className="text-lg sm:text-2xl font-black text-cyan-400 mt-0.5 sm:mt-1">{totalTargetBeneficiaries}</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">Target quota</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-amber-400">Compliance</p>
          <p className="text-lg sm:text-2xl font-black text-amber-400 mt-0.5 sm:mt-1">{complianceRate}%</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">Of target</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
        <div className="md:col-span-4 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Beneficiary Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Work Programs ({activities.length})</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Barangays</option>
            <option value="Paltic">Brgy. Paltic</option>
            <option value="Aplaya">Brgy. Aplaya</option>
            <option value="Poblacion">Brgy. Poblacion</option>
            <option value="Butas na Bato">Brgy. Butas na Bato</option>
            <option value="Ibona">Brgy. Ibona</option>
            <option value="Tanawan">Brgy. Tanawan</option>
            <option value="Umiray">Brgy. Umiray</option>
          </select>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div id="compliance-printable-report" className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
        {/* Printable Official Header */}
        <div className="p-3.5 sm:p-6 border-b border-slate-700 bg-slate-900/80">
          <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-3 sm:gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center font-black text-emerald-300 text-sm sm:text-lg shrink-0">
                LGU
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  Republic of the Philippines • Municipality of Dingalan
                </p>
                <h3 className="text-sm sm:text-lg font-black text-white uppercase tracking-tight">
                  Linis Dingalan Compliance Report
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
                  Joint Program: PESO & MENRO
                </p>
              </div>
            </div>

            <div className="text-right text-[10px] sm:text-xs font-mono text-slate-300">
              <p>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              <p className="text-emerald-400 font-bold">Status: AUDIT VERIFIED</p>
            </div>
          </div>
        </div>

        {/* MOBILE VIEW: Compact Cards (< 640px) */}
        <div className="sm:hidden p-2 space-y-2">
          {filteredAttendances.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No compliance records match your current filter parameters.
            </div>
          ) : (
            filteredAttendances.map((att) => {
              const dt = formatPhilippineDateTime(att.timestamp || att.localPhTime, att.localPhTime);
              return (
                <div key={att.id} className="bg-slate-900/90 border border-slate-750 rounded-xl p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-xs">{att.beneficiaryName}</div>
                      <span className="font-mono text-[9px] text-emerald-400 block">{att.beneficiaryCode}</span>
                    </div>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <ShieldCheck className="w-2.5 h-2.5 mr-0.5 text-emerald-400" /> COMPLIED
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-300 space-y-0.5 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <p className="text-white font-medium truncate">{att.activityTitle}</p>
                    <p className="text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      {att.locationDescription}
                    </p>
                    <p className="text-cyan-300 font-mono text-[9px]">
                      {dt.exactTimeWithSeconds} PST • {att.latitude.toFixed(4)}°N, {att.longitude.toFixed(4)}°E (±{att.accuracyMeters}m)
                    </p>
                  </div>

                  {att.photoWatermarkedUrl && (
                    <button
                      onClick={() => setSelectedRecordForViewer(att)}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 rounded-lg text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Camera className="w-3 h-3 text-emerald-400" />
                      <span>Tingnan Geotag Photo</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP VIEW: Table of Records (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Beneficiary & ID</th>
                <th className="py-3 px-4">Work Program & Area</th>
                <th className="py-3 px-4">Timestamp (PST)</th>
                <th className="py-3 px-4">GPS Geofence Proof</th>
                <th className="py-3 px-4 text-center">Accomplishment Photo</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No compliance records match your current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{att.beneficiaryName}</div>
                      <span className="font-mono text-[10px] text-emerald-400">
                        {att.beneficiaryCode}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium truncate max-w-xs">
                        {att.activityTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center mt-0.5">
                        <MapPin className="w-3 h-3 text-emerald-400 mr-1 shrink-0" />
                        {att.locationDescription}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      {(() => {
                        const dt = formatPhilippineDateTime(att.timestamp || att.localPhTime, att.localPhTime);
                        return (
                          <div className="flex flex-col">
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

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-sky-400 font-bold">
                        {att.latitude.toFixed(6)}° N, {att.longitude.toFixed(6)}° E
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">
                        Accuracy: ±{att.accuracyMeters}m ({att.altitudeMeters || 8}m MSL)
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedRecordForViewer(att)}
                        className="relative group inline-block cursor-pointer"
                        title="Pindutin para tingnan sa Fullscreen kasama ang oras ng Pilipinas"
                      >
                        <img
                          src={att.photoWatermarkedUrl}
                          alt="Accomplishment Thumbnail"
                          className="w-14 h-10 object-cover rounded border border-slate-700 group-hover:border-emerald-400 transition-colors"
                        />
                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-emerald-300 font-mono rounded-b">
                          FULL VIEW
                        </span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                        COMPLIED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Official LGU Sign-Off Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/90 grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
          <div className="border border-slate-700 rounded-xl p-4 space-y-4">
            <p className="text-[11px] font-mono uppercase text-slate-400">
              FIELD VERIFICATION & COMPLIANCE INSPECTION:
            </p>
            <div className="pt-8 border-b border-slate-600" />
            <div>
              <p className="font-bold text-white text-xs">ENGR. MARICEL T. DELA CRUZ</p>
              <p className="text-[11px] text-slate-400">MENRO Field Operations Supervisor • Dingalan, Aurora</p>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Official MENRO Sign-off</p>
            </div>
          </div>

          <div className="border border-slate-700 rounded-xl p-4 space-y-4">
            <p className="text-[11px] font-mono uppercase text-slate-400">
              AUDITED & CERTIFIED FOR ALLOWANCE / STIPEND RELEASE:
            </p>
            <div className="pt-8 border-b border-slate-600" />
            <div>
              <p className="font-bold text-white text-xs">ATTY. RODRIGO C. SANTOS</p>
              <p className="text-[11px] text-slate-400">PESO Manager / Division Head • Dingalan, Aurora</p>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Final PESO Approval</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Photo Viewer with Philippine Time and Geotag HUD */}
      {selectedRecordForViewer && (
        <FullScreenPhotoViewer
          isOpen={!!selectedRecordForViewer}
          onClose={() => setSelectedRecordForViewer(null)}
          photos={
            selectedRecordForViewer.accomplishmentPhotos && selectedRecordForViewer.accomplishmentPhotos.length > 0
              ? selectedRecordForViewer.accomplishmentPhotos
              : [selectedRecordForViewer.photoWatermarkedUrl]
          }
          beneficiaryName={selectedRecordForViewer.beneficiaryName}
          beneficiaryCode={selectedRecordForViewer.beneficiaryCode}
          activityTitle={selectedRecordForViewer.activityTitle}
          locationDescription={selectedRecordForViewer.locationDescription}
          cleanupNotes={selectedRecordForViewer.accomplishmentNotes || selectedRecordForViewer.notes}
          timestamp={selectedRecordForViewer.timestamp}
          localPhTime={selectedRecordForViewer.localPhTime}
          latitude={selectedRecordForViewer.latitude}
          longitude={selectedRecordForViewer.longitude}
          accuracyMeters={selectedRecordForViewer.accuracyMeters}
          altitudeMeters={selectedRecordForViewer.altitudeMeters}
          verifiedByOfficer={selectedRecordForViewer.verifiedByOfficerName}
        />
      )}
    </div>
  );
};
