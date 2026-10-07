import React, { useState, useMemo } from 'react';
import { Beneficiary, DingalanBarangay, User } from '../types';
import { DigitalIdCardModal } from './DigitalIdCardModal';
import {
  Users,
  Search,
  Filter,
  Plus,
  QrCode,
  Trash2,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Phone,
  ShieldAlert,
  Download,
} from 'lucide-react';

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

interface BeneficiaryMasterlistProps {
  beneficiaries: Beneficiary[];
  currentUser: User;
  onAddBeneficiary: (data: Partial<Beneficiary>) => Promise<void>;
  onDeleteBeneficiary: (id: string) => Promise<void>;
  onDirectScanTest?: (bene: Beneficiary) => void;
}

export const BeneficiaryMasterlist: React.FC<BeneficiaryMasterlistProps> = ({
  beneficiaries,
  currentUser,
  onAddBeneficiary,
  onDeleteBeneficiary,
  onDirectScanTest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('ALL');
  const [activeModalBene, setActiveModalBene] = useState<Beneficiary | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    nationalOrLocalId: '',
    contactNumber: '',
    barangay: 'Paltic' as DingalanBarangay,
    assignedCluster: 'Dingalan Feeder Port & Coastal Watch',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: 'Spouse',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      const matchesSearch =
        `${b.firstName} ${b.lastName} ${b.beneCode} ${b.nationalOrLocalId}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesBarangay =
        selectedBarangay === 'ALL' || b.barangay === selectedBarangay;
      return matchesSearch && matchesBarangay;
    });
  }, [beneficiaries, searchTerm, selectedBarangay]);

  // Real-time duplicate check
  const duplicateIdWarning = useMemo(() => {
    if (!formState.nationalOrLocalId.trim()) return null;
    const found = beneficiaries.find(
      (b) =>
        b.nationalOrLocalId.trim().toLowerCase() ===
        formState.nationalOrLocalId.trim().toLowerCase()
    );
    if (found) {
      return `Warning: ID '${formState.nationalOrLocalId}' is already assigned to ${found.firstName} ${found.lastName} (${found.beneCode}) in Brgy. ${found.barangay}.`;
    }
    return null;
  }, [formState.nationalOrLocalId, beneficiaries]);

  const duplicateNameWarning = useMemo(() => {
    if (!formState.firstName.trim() || !formState.lastName.trim()) return null;
    const found = beneficiaries.find(
      (b) =>
        b.firstName.trim().toLowerCase() ===
          formState.firstName.trim().toLowerCase() &&
        b.lastName.trim().toLowerCase() ===
          formState.lastName.trim().toLowerCase() &&
        b.barangay === formState.barangay
    );
    if (found) {
      return `Warning: Duplicate detected! Beneficiary named '${formState.firstName} ${formState.lastName}' already exists in Brgy. ${formState.barangay}.`;
    }
    return null;
  }, [formState.firstName, formState.lastName, formState.barangay, beneficiaries]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (duplicateIdWarning) {
      setFormError(duplicateIdWarning);
      return;
    }
    if (duplicateNameWarning) {
      setFormError(duplicateNameWarning);
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddBeneficiary(formState);
      setIsAddModalOpen(false);
      setFormState({
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        nationalOrLocalId: '',
        contactNumber: '',
        barangay: 'Paltic',
        assignedCluster: 'Dingalan Feeder Port & Coastal Watch',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: 'Spouse',
      });
    } catch (err: any) {
      setFormError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (currentUser.role !== 'superadmin') {
      alert('Access Restricted: Only Superadmin (PESO Manager) can delete masterlist records. MENRO Officers have read-only and field-compliance permissions.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete beneficiary "${name}"? This action is logged in the PESO Audit Trail.`)) {
      try {
        await onDeleteBeneficiary(id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete');
      }
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              </div>
              <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                Beneficiary Masterlist & Digital IDs
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
              Active workforce roster across 11 Dingalan barangays. Encodes universal cryptographic QR tokens for on-site scanning.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto px-3 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Register Beneficiary
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-3 sm:mt-5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-slate-700/60">
          <div className="sm:col-span-8 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Beneficiary Name, ID, or PhilSys Code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 sm:py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="sm:col-span-4 flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedBarangay}
              onChange={(e) => setSelectedBarangay(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-2.5 py-1.5 sm:py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Dingalan Barangays ({beneficiaries.length})</option>
              {DINGALAN_BARANGAYS.map((b) => {
                const count = beneficiaries.filter((x) => x.barangay === b).length;
                return (
                  <option key={b} value={b}>
                    Brgy. {b} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Beneficiaries Container */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
        {/* MOBILE VIEW: Compact Card List (< 640px) */}
        <div className="sm:hidden divide-y divide-slate-750 p-2 space-y-2">
          {filteredBeneficiaries.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Walang tugmang beneficiary sa filter o search.
            </div>
          ) : (
            filteredBeneficiaries.map((bene) => (
              <div
                key={bene.id}
                className="bg-slate-900/80 border border-slate-750 rounded-xl p-2.5 space-y-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={bene.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt={bene.firstName}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div>
                      <div className="font-bold text-white text-xs leading-tight">
                        {bene.firstName} {bene.middleName ? `${bene.middleName[0]}.` : ''} {bene.lastName} {bene.suffix || ''}
                      </div>
                      <span className="font-mono text-[9px] text-emerald-400 block mt-0.5">
                        {bene.beneCode}
                      </span>
                    </div>
                  </div>

                  {/* Compact Status Pill */}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[9px]">ID CODE</span>
                    <span className="text-slate-200 truncate block">{bene.nationalOrLocalId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">BARANGAY</span>
                    <span className="text-emerald-300 font-bold flex items-center gap-0.5 truncate">
                      <MapPin className="w-2.5 h-2.5 shrink-0" /> {bene.barangay}
                    </span>
                  </div>
                </div>

                {/* Compact Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">
                    {bene.contactNumber}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => setActiveModalBene(bene)}
                      title="Digital ID Card"
                      className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center space-x-1 transition-all"
                    >
                      <QrCode className="w-3 h-3" />
                      <span>ID QR</span>
                    </button>

                    {currentUser.role === 'superadmin' ? (
                      <button
                        onClick={() => handleDelete(bene.id, `${bene.firstName} ${bene.lastName}`)}
                        title="Delete record"
                        className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP VIEW: Full Table (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60 text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Beneficiary</th>
                <th className="py-3 px-4">Local / PhilSys ID</th>
                <th className="py-3 px-4">Barangay & Cluster</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs">
              {filteredBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No beneficiaries match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredBeneficiaries.map((bene) => (
                  <tr
                    key={bene.id}
                    className="hover:bg-slate-700/30 transition-colors group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={bene.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={bene.firstName}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-white text-xs">
                            {bene.firstName} {bene.middleName ? `${bene.middleName[0]}.` : ''} {bene.lastName} {bene.suffix || ''}
                          </div>
                          <span className="font-mono text-[10px] text-emerald-400">
                            {bene.beneCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-300">
                      {bene.nationalOrLocalId}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center text-slate-200 font-semibold text-xs">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 mr-1 shrink-0" />
                        Brgy. {bene.barangay}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {bene.assignedCluster}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center text-slate-300 text-xs">
                        <Phone className="w-3 h-3 text-slate-400 mr-1" />
                        {bene.contactNumber}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ICE: {bene.emergencyContactName} ({bene.emergencyContactPhone})
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setActiveModalBene(bene)}
                          title="Generate & View Printable Digital ID Card"
                          className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {currentUser.role === 'superadmin' ? (
                          <button
                            onClick={() => handleDelete(bene.id, `${bene.firstName} ${bene.lastName}`)}
                            title="Permanently Delete (Superadmin PESO Manager Only)"
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            title="RBAC Protected: Only PESO Manager can delete records"
                            className="p-1.5 bg-slate-800 text-slate-600 rounded-lg cursor-not-allowed opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital ID Card Modal */}
      {activeModalBene && (
        <DigitalIdCardModal
          beneficiary={activeModalBene}
          onClose={() => setActiveModalBene(null)}
          onDirectScanTest={onDirectScanTest}
        />
      )}

      {/* Manual Registration Modal with Duplicate Prevention */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Register New Community Beneficiary
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Warnings & Validation Banners */}
              {duplicateIdWarning && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-200 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{duplicateIdWarning}</span>
                </div>
              )}

              {duplicateNameWarning && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{duplicateNameWarning}</span>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-200 text-xs">
                  {formError}
                </div>
              )}

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.firstName}
                    onChange={(e) => setFormState({ ...formState, firstName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Danilo"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formState.middleName}
                    onChange={(e) => setFormState({ ...formState, middleName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Perez"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.lastName}
                    onChange={(e) => setFormState({ ...formState, lastName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Bautista"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Suffix
                  </label>
                  <input
                    type="text"
                    value={formState.suffix}
                    onChange={(e) => setFormState({ ...formState, suffix: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="Jr. / Sr."
                  />
                </div>
              </div>

              {/* ID & Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    PhilSys / Dingalan Resident ID * (Must be Unique)
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.nationalOrLocalId}
                    onChange={(e) => setFormState({ ...formState, nationalOrLocalId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                    placeholder="PHILSYS-DING-9029"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Contact Number (Mobile) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.contactNumber}
                    onChange={(e) => setFormState({ ...formState, contactNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="0917-000-0000"
                  />
                </div>
              </div>

              {/* Barangay & Cluster */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Barangay *
                  </label>
                  <select
                    value={formState.barangay}
                    onChange={(e) => setFormState({ ...formState, barangay: e.target.value as DingalanBarangay })}
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
                    Assigned Cluster / Work Zone *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.assignedCluster}
                    onChange={(e) => setFormState({ ...formState, assignedCluster: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. Dingalan Feeder Port & Coastal Watch"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Emergency Contact Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formState.emergencyContactName}
                      onChange={(e) => setFormState({ ...formState, emergencyContactName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="Elena Bautista"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Relation *</label>
                    <input
                      type="text"
                      required
                      value={formState.emergencyContactRelation}
                      onChange={(e) => setFormState({ ...formState, emergencyContactRelation: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="Spouse / Parent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Emergency Phone *</label>
                    <input
                      type="text"
                      required
                      value={formState.emergencyContactPhone}
                      onChange={(e) => setFormState({ ...formState, emergencyContactPhone: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      placeholder="0917-000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!duplicateIdWarning || !!duplicateNameWarning}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg"
                >
                  {isSubmitting ? 'Registering...' : 'Register & Generate QR Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
