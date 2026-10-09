import React, { useState } from 'react';
import { Activity, ActivityAssignment, Beneficiary, DingalanBarangay, User } from '../types';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  CheckCircle,
  AlertCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';

interface ActivityManagementProps {
  activities: Activity[];
  assignments: ActivityAssignment[];
  beneficiaries: Beneficiary[];
  currentUser: User;
  onCreateActivity: (data: Partial<Activity>) => Promise<void>;
  onAssignBeneficiary: (activityId: string, beneficiaryId: string) => Promise<void>;
  onSelectActivityForAttendance?: (activity: Activity) => void;
  onOpenGenerateQrModal?: () => void;
  onDeleteActivity?: (activityId: string) => Promise<void>;
  onClearAllActivities?: () => Promise<void>;
}

const DINGALAN_BARANGAYS: DingalanBarangay[] = [
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

export const ActivityManagement: React.FC<ActivityManagementProps> = ({
  activities,
  assignments,
  beneficiaries,
  currentUser,
  onCreateActivity,
  onAssignBeneficiary,
  onSelectActivityForAttendance,
  onOpenGenerateQrModal,
  onDeleteActivity,
  onClearAllActivities,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignModalActivity, setAssignModalActivity] = useState<Activity | null>(null);
  const [selectedBeneIds, setSelectedBeneIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Delete states
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [newActivity, setNewActivity] = useState<{
    title: string;
    programType: 'TUPAD' | 'CASH_FOR_WORK' | 'COASTAL_CLEANUP' | 'MANGROVE_REHAB' | 'DRAINAGE_DECLOGGING';
    description: string;
    date: string;
    callTime: string;
    targetArea: string;
    barangay: DingalanBarangay;
    targetBeneficiariesCount: number | string;
    notes: string;
  }>({
    title: '',
    programType: 'COASTAL_CLEANUP',
    description: '',
    date: new Date().toISOString().split('T')[0],
    callTime: '06:00',
    targetArea: 'Dingalan Feeder Port Rock Wall',
    barangay: 'Paltic',
    targetBeneficiariesCount: '20',
    notes: '',
  });

  const filteredActivities = activities.filter((a) => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onCreateActivity(newActivity);
      setIsCreateModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create work program');
    }
  };

  const handleOpenAssignModal = (activity: Activity) => {
    setAssignModalActivity(activity);
    // Find already assigned beneficiaries
    const alreadyAssigned = assignments
      .filter((asg) => asg.activityId === activity.id)
      .map((asg) => asg.beneficiaryId);
    setSelectedBeneIds(alreadyAssigned);
  };

  const handleToggleBeneSelection = (beneId: string) => {
    if (selectedBeneIds.includes(beneId)) {
      setSelectedBeneIds(selectedBeneIds.filter((id) => id !== beneId));
    } else {
      setSelectedBeneIds([...selectedBeneIds, beneId]);
    }
  };

  const handleBatchAssignCluster = (clusterName: string) => {
    const clusterBeneIds = beneficiaries
      .filter((b) => b.assignedCluster.toLowerCase().includes(clusterName.toLowerCase()) || b.barangay === assignModalActivity?.barangay)
      .map((b) => b.id);
    const combined = Array.from(new Set([...selectedBeneIds, ...clusterBeneIds]));
    setSelectedBeneIds(combined);
  };

  const handleSaveAssignments = async () => {
    if (!assignModalActivity) return;
    setIsAssigning(true);
    try {
      for (const beneId of selectedBeneIds) {
        const isAssigned = assignments.some(
          (asg) => asg.activityId === assignModalActivity.id && asg.beneficiaryId === beneId
        );
        if (!isAssigned) {
          await onAssignBeneficiary(assignModalActivity.id, beneId);
        }
      }
      setAssignModalActivity(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update assignments');
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusBadge = (status: Activity['status']) => {
    switch (status) {
      case 'ongoing':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <Play className="w-3 h-3 mr-1 fill-amber-400 text-amber-400" /> ONGOING
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            <Clock className="w-3 h-3 mr-1 text-cyan-400" /> SCHEDULED
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" /> COMPLETED
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-400" /> CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 sm:p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Work Programs & Activity-Based Area Assignment
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Activity-specific compliance monitoring for PESO Cash-for-Work & MENRO coastal defense initiatives.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 bg-slate-900/80 p-0.5 sm:p-1 rounded-xl border border-slate-700 text-[11px] sm:text-xs">
            {['ALL', 'ongoing', 'scheduled', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2 sm:px-3 py-1 rounded-lg capitalize font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {onOpenGenerateQrModal && (
            <button
              onClick={onOpenGenerateQrModal}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-r from-[#00e599] via-[#00d9b4] to-[#00d4ff] hover:from-[#00f2a5] hover:to-[#22e1ff] text-slate-950 font-mono font-bold text-xs shadow-[0_0_15px_rgba(0,229,153,0.35)] flex items-center space-x-1 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
              title="Generate Cleanup Event QR Code & Paalala"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>Generate Event QR</span>
            </button>
          )}

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Program
          </button>

          {onClearAllActivities && activities.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmDeleteAllOpen(true)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-400 font-mono font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
              title="Permanenteng burahin ang lahat ng nakatalang Work Programs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Burahin Lahat ({activities.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Activity Cards Grid */}
      {filteredActivities.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Walang Nakatalang Work Program</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Kasalukuyang walang active o nakatakdang work program. Pindutin ang "+ New Program" upang magdagdag ng bagong schedule.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow inline-flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lumikha ng Bagong Program</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {filteredActivities.map((act) => {
            const actAssignments = assignments.filter((asg) => asg.activityId === act.id);
            const attendedCount = actAssignments.filter((asg) => asg.status === 'attended').length;
            const assignedCount = actAssignments.length;
            const progressPercent = assignedCount > 0 ? Math.round((attendedCount / assignedCount) * 100) : 0;

            return (
              <div
                key={act.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl flex flex-col justify-between hover:border-slate-600 transition-all group relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                      {act.programType.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {getStatusBadge(act.status)}
                      {onDeleteActivity && (
                        <button
                          type="button"
                          onClick={() => setActivityToDelete(act)}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 hover:border-rose-500 transition-all cursor-pointer"
                          title="Burahin ang box na ito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                    {act.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-2">
                    {act.description}
                  </p>

                  {/* Logistics Info */}
                  <div className="mt-3 sm:mt-4 space-y-1 text-xs text-slate-300 bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
                      <span className="font-semibold truncate">{act.targetArea}</span>
                      <span className="text-slate-400 ml-1 shrink-0">(Brgy. {act.barangay})</span>
                    </div>
                    <div className="flex flex-wrap items-center text-slate-300 gap-y-1">
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400 mr-1 shrink-0" />
                        <span>{act.date}</span>
                      </span>
                      <span className="flex items-center ml-2.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 mr-1 shrink-0" />
                        <span>{act.callTime} AM</span>
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      Supervisor: <span className="text-slate-200 font-medium">{act.supervisorName}</span>
                    </div>
                  </div>

                  {/* Beneficiary Assignment & Compliance Progress */}
                  <div className="mt-3 sm:mt-4 space-y-1">
                    <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold">
                      <span className="text-slate-300 flex items-center">
                        <Users className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                        Assigned Workforce:
                      </span>
                      <span className="font-mono text-emerald-300">
                        {attendedCount} / {assignedCount || act.targetBeneficiariesCount} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 sm:h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, progressPercent)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-3.5 sm:mt-5 pt-2.5 sm:pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenAssignModal(act)}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-700/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors border border-slate-600 flex items-center shrink-0 cursor-pointer"
                    >
                      <Users className="w-3 h-3 mr-1 text-slate-400" />
                      Assign ({assignedCount})
                    </button>

                    {onDeleteActivity && (
                      <button
                        type="button"
                        onClick={() => setActivityToDelete(act)}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-semibold rounded-lg transition-colors border border-rose-500/30 flex items-center shrink-0 cursor-pointer"
                        title="Burahin ang box na ito"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        <span>Burahin</span>
                      </button>
                    )}
                  </div>

                  {onSelectActivityForAttendance && (
                    <button
                      onClick={() => onSelectActivityForAttendance(act)}
                      className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-xs font-bold text-white rounded-lg transition-colors flex items-center shadow cursor-pointer shrink-0"
                    >
                      <span>Open Terminal</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Activity Confirmation Modal */}
      {activityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-500/60 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(244,63,94,0.25)] p-4 sm:p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400 block">
                    Kumpirmasyon ng Pagbura
                  </span>
                  <h3 className="text-base font-black text-white">
                    Burahin ang Program Box?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <p className="font-bold text-white text-sm">{activityToDelete.title}</p>
              <p className="text-[11px] text-emerald-300">Brgy. {activityToDelete.barangay} • {activityToDelete.targetArea}</p>
              <p className="text-[11px] text-slate-400">{activityToDelete.date} • {activityToDelete.callTime} AM</p>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Sigurado ka bang nais mong permanenteng burahin ang box ng work program na ito?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActivityToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteActivity || !activityToDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteActivity(activityToDelete.id);
                    setActivityToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Box'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Activities Confirmation Modal */}
      {isConfirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-500/60 rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(244,63,94,0.3)] p-4 sm:p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-400 block">
                    Permanenteng Pagbura ng Lahat
                  </span>
                  <h3 className="text-base font-black text-white">
                    Burahin ang Lahat ng Boxes?
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 leading-relaxed space-y-1">
              <p>Sigurado ka bang nais mong permanenteng burahin ang lahat ng <strong>{activities.length}</strong> work program boxes sa sistema?</p>
              <p className="text-[11px] text-rose-300/80">Lahat ng aktibidad, schedule, at area assignments ay mawawala sa listahan.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onClearAllActivities) return;
                  setIsDeleting(true);
                  try {
                    await onClearAllActivities();
                    setIsConfirmDeleteAllOpen(false);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting All...' : 'Yes, Permanently Delete All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Beneficiaries Modal */}
      {assignModalActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Assign Beneficiaries to Work Program
                </h3>
                <p className="text-xs text-emerald-400 mt-0.5">
                  {assignModalActivity.title} ({assignModalActivity.targetArea})
                </p>
              </div>
              <button
                onClick={() => setAssignModalActivity(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick Batch Cluster Assign */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-300">
                  Quick Assign by Work Cluster:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBatchAssignCluster('Coastal Watch')}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px]"
                  >
                    + Coastal Watch
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchAssignCluster('Mangrove')}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px]"
                  >
                    + Mangrove Cluster
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBatchAssignCluster(assignModalActivity.barangay)}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-bold"
                  >
                    + All Brgy. {assignModalActivity.barangay}
                  </button>
                </div>
              </div>

              {/* Selection Summary */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  Selected: <strong className="text-emerald-400 font-mono">{selectedBeneIds.length}</strong> beneficiaries
                </span>
                <span className="text-[11px]">
                  Target capacity: {assignModalActivity.targetBeneficiariesCount}
                </span>
              </div>

              {/* Beneficiary List with Checkboxes */}
              <div className="max-h-80 overflow-y-auto space-y-2 border border-slate-800 p-2 rounded-xl bg-slate-950/60">
                {beneficiaries.map((b) => {
                  const isSelected = selectedBeneIds.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleToggleBeneSelection(b.id)}
                      className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-xs">
                            {b.firstName} {b.lastName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {b.beneCode} • Brgy. {b.barangay} ({b.assignedCluster})
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {b.contactNumber}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setAssignModalActivity(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignments}
                  disabled={isAssigning}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg"
                >
                  {isAssigning ? 'Saving Assignments...' : 'Commit Assignments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Activity Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Work Program Activity</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Activity Title *
                </label>
                <input
                  type="text"
                  required
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Dingalan Feeder Port Coastal Cleanliness Operation"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Program Classification *
                  </label>
                  <select
                    value={newActivity.programType}
                    onChange={(e) => setNewActivity({ ...newActivity, programType: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="COASTAL_CLEANUP">Coastal Cleanup</option>
                    <option value="MANGROVE_REHAB">Mangrove Rehabilitation</option>
                    <option value="DRAINAGE_DECLOGGING">Drainage Declogging</option>
                    <option value="TUPAD">TUPAD / Cash-for-Work</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Target Beneficiaries Count *
                  </label>
                  <input
                    type="text"
                    required
                    value={newActivity.targetBeneficiariesCount}
                    onChange={(e) => setNewActivity({ ...newActivity, targetBeneficiariesCount: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Barangay *
                  </label>
                  <select
                    value={newActivity.barangay}
                    onChange={(e) => setNewActivity({ ...newActivity, barangay: e.target.value as DingalanBarangay })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {DINGALAN_BARANGAYS.map((b) => (
                      <option key={b} value={b}>
                        Brgy. {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Target Work Area / Zone *
                  </label>
                  <input
                    type="text"
                    required
                    value={newActivity.targetArea}
                    onChange={(e) => setNewActivity({ ...newActivity, targetArea: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. Paltic Rock Sea Wall & Port Berth"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Activity Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newActivity.date}
                    onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Call Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newActivity.callTime}
                    onChange={(e) => setNewActivity({ ...newActivity, callTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Description / Operational Guidelines
                </label>
                <textarea
                  rows={2}
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="e.g. Shoreline clearing following high-tide debris accumulation..."
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
