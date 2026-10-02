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
} from 'lucide-react';

interface ActivityManagementProps {
  activities: Activity[];
  assignments: ActivityAssignment[];
  beneficiaries: Beneficiary[];
  currentUser: User;
  onCreateActivity: (data: Partial<Activity>) => Promise<void>;
  onAssignBeneficiary: (activityId: string, beneficiaryId: string) => Promise<void>;
  onSelectActivityForAttendance?: (activity: Activity) => void;
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
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignModalActivity, setAssignModalActivity] = useState<Activity | null>(null);
  const [selectedBeneIds, setSelectedBeneIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Form State
  const [newActivity, setNewActivity] = useState({
    title: '',
    programType: 'COASTAL_CLEANUP' as const,
    description: '',
    date: new Date().toISOString().split('T')[0],
    callTime: '06:00',
    targetArea: 'Dingalan Feeder Port Rock Wall',
    barangay: 'Paltic' as DingalanBarangay,
    targetBeneficiariesCount: 20,
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
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Calendar className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Work Programs & Activity-Based Area Assignment
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Activity-specific compliance monitoring for PESO Cash-for-Work & MENRO coastal defense initiatives.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-xs">
            {['ALL', 'ongoing', 'scheduled', 'completed'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${
                  filterStatus === st
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Work Program
          </button>
        </div>
      </div>

      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredActivities.map((act) => {
          const actAssignments = assignments.filter((asg) => asg.activityId === act.id);
          const attendedCount = actAssignments.filter((asg) => asg.status === 'attended').length;
          const assignedCount = actAssignments.length;
          const progressPercent = assignedCount > 0 ? Math.round((attendedCount / assignedCount) * 100) : 0;

          return (
            <div
              key={act.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-600 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                    {act.programType.replace('_', ' ')}
                  </span>
                  {getStatusBadge(act.status)}
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2">
                  {act.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {act.description}
                </p>

                {/* Logistics Info */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center text-slate-200">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0" />
                    <span className="font-semibold">{act.targetArea}</span>
                    <span className="text-slate-400 ml-1">(Brgy. {act.barangay})</span>
                  </div>
                  <div className="flex items-center text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400 mr-2 shrink-0" />
                    <span>Date: {act.date}</span>
                    <Clock className="w-3.5 h-3.5 text-cyan-400 ml-3 mr-1 shrink-0" />
                    <span>Call Time: {act.callTime} AM</span>
                  </div>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    Supervisor: <span className="text-slate-200 font-medium">{act.supervisorName}</span>
                  </div>
                </div>

                {/* Beneficiary Assignment & Compliance Progress */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300 flex items-center">
                      <Users className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                      Assigned Workforce:
                    </span>
                    <span className="font-mono text-emerald-300">
                      {attendedCount} / {assignedCount || act.targetBeneficiariesCount} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, progressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenAssignModal(act)}
                  className="px-3 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg transition-colors border border-slate-600 flex items-center"
                >
                  <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Assign ({assignedCount})
                </button>

                {onSelectActivityForAttendance && (
                  <button
                    onClick={() => onSelectActivityForAttendance(act)}
                    className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-xs font-bold text-white rounded-lg transition-colors flex items-center shadow"
                  >
                    Open Field QR Terminal
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={newActivity.targetBeneficiariesCount}
                    onChange={(e) => setNewActivity({ ...newActivity, targetBeneficiariesCount: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
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
