import React, { useState, useRef } from 'react';
import { Beneficiary, DingalanBarangay } from '../types';
import { api } from '../services/api';
import {
  QrCode,
  UserCheck,
  Building2,
  User as UserIcon,
  MapPin,
  Calendar,
  Sparkles,
  Download,
  Camera,
  Upload,
  CheckCircle2,
  X,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Clock,
  Phone,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { generateStyledLguQrDataUrl } from '../utils/qrPassGenerator';
import { OfficialQrPassCard } from './OfficialQrPassCard';

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

const DEPARTMENT_OFFICES = [
  'Municipal Administrator',
  'Feeder Port Manager',
  'Municipal Agriculturist',
  'Municipal Environment and Natural Resources Office / Municipal Environment and Natural Resources Officer',
  'Municipal Budget Officer',
  "Municipal Assessor's",
  'Municipal Tourism Officer / Tourism Officer',
  'Municipal Health Officer',
  'Municipal Social Welfare and Development Officer',
  'Municipal Treasurer',
  'Municipal Engineer',
  'Municipal Disaster Risk Reduction and Management Office',
  'Public Employment Service Officer',
  'Municipal Cooperative Development Officer',
  'Municipal Planning and Development Coordinator',
  'Municipal Civil Registrar',
  'Municipal Accountant',
];

interface GeneratePersonalQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess: (bene: Beneficiary) => void;
  onScanPersonalQr: (bene: Beneficiary) => void;
}

export const GeneratePersonalQrModal: React.FC<GeneratePersonalQrModalProps> = ({
  isOpen,
  onClose,
  onRegisterSuccess,
  onScanPersonalQr,
}) => {
  const [fullName, setFullName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<string>('Male');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [department, setDepartment] = useState<string>(DEPARTMENT_OFFICES[0]);
  const [barangay, setBarangay] = useState<DingalanBarangay>('Paltic');
  const [address, setAddress] = useState<string>('');
  
  const [generatedBene, setGeneratedBene] = useState<Beneficiary | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerateQrCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameTrim = fullName.trim();
    if (!nameTrim) {
      setErrorMessage('Pakiusap ilagay ang iyong FULL NAME.');
      return;
    }

    const numAge = parseInt(age, 10);
    if (!age || isNaN(numAge) || numAge < 18 || numAge > 85) {
      setErrorMessage('Pakiusap ilagay ang wastong AGE (18 hanggang 85 taong gulang).');
      return;
    }

    if (!department) {
      setErrorMessage('Pakiusap pumili ng iyong DEPARTMENT OFFICE.');
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage('Pakiusap ilagay ang iyong PHONE NUMBER.');
      return;
    }

    setIsLoading(true);

    try {
      // DUPLICATE FULL NAME CHECK: Prevent generating QR Code if Full Name already exists
      const existingBenes = await api.getBeneficiaries();
      const isDuplicateName = existingBenes.some((bene) => {
        const existingFullName = `${bene.firstName} ${bene.lastName}`.trim().toLowerCase();
        return existingFullName === nameTrim.toLowerCase();
      });

      if (isDuplicateName) {
        setErrorMessage(`HINDI MAKAKAPAG-GENERATE NG QR CODE! Ang pangalan na "${nameTrim}" ay NAKAREHISTRO NA sa sistema. Pakiusap gumamit ng ibang buong pangalan.`);
        setIsLoading(false);
        return;
      }

      const nameParts = nameTrim.split(' ');
      const firstName = nameParts[0] || 'Participant';
      const lastName = nameParts.slice(1).join(' ') || 'Dingalan';
      const beneCode = `LD-BEN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const qrHash = Math.random().toString(36).substring(2, 12);

      const benePayload: Partial<Beneficiary> = {
        beneCode,
        firstName,
        lastName,
        nationalOrLocalId: `LGU-DING-${department.substring(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        contactNumber: phoneNumber.trim() || '0917-000-0000',
        barangay,
        assignedCluster: department,
        emergencyContactName: `${lastName} Family`,
        emergencyContactPhone: phoneNumber.trim() || '0917-000-0000',
        emergencyContactRelation: 'Relative',
        photoUrl: `https://images.unsplash.com/photo-${1534528741775 + (Math.floor(Math.random() * 50))}?w=400&auto=format&fit=crop&q=80`,
        status: 'active',
        qrHash,
      };

      const newBene = await api.createBeneficiary(benePayload);

      // Generate QR Code canvas as a scannable URL that links directly to the app
      const qrPayloadString = `${window.location.origin}/?action=upload&beneCode=${encodeURIComponent(newBene.beneCode)}&id=${encodeURIComponent(newBene.id)}&name=${encodeURIComponent(newBene.firstName + ' ' + newBene.lastName)}&gender=${encodeURIComponent(gender)}&phoneNumber=${encodeURIComponent(phoneNumber)}&department=${encodeURIComponent(newBene.assignedCluster)}&address=${encodeURIComponent(address || 'Brgy. ' + newBene.barangay)}&barangay=${encodeURIComponent(newBene.barangay)}&qrHash=${encodeURIComponent(newBene.qrHash)}`;

      const qrUrl = await generateStyledLguQrDataUrl(qrPayloadString, {
        width: 480,
        title: 'LINIS DINGALAN',
        code: newBene.beneCode,
        includeCenterBadge: true,
      });

      setQrCodeDataUrl(qrUrl);
      setGeneratedBene(newBene);
      onRegisterSuccess(newBene);
    } catch (err) {
      console.error('Error generating QR:', err);
      setErrorMessage('Nagkaroon ng error sa pag-generate ng QR code. Subukan muli.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setGeneratedBene(null);
    setQrCodeDataUrl('');
    setFullName('');
    setAge('');
    setAddress('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden my-auto">
        {/* Header Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Register & Generate Personal QR Code
              </h2>
              <p className="text-xs text-slate-400">
                Pang-isahang Personal QR Code para sa Accomplishment Attendance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!generatedBene ? (
            /* ========================================================================= */
            /* STEP 1: REGISTRATION FORM FIELDS                                          */
            /* ========================================================================= */
            <form onSubmit={handleGenerateQrCode} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* Department Office */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Department / Office <span className="text-rose-400">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                >
                  {DEPARTMENT_OFFICES.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Full Name (Buong Pangalan) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="hal. Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                />
              </div>

              {/* Age, Gender & Phone Number Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    Age <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="85"
                    required
                    placeholder="hal. 34"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Gender <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                  >
                    <option value="Male">Male (Lalaki)</option>
                    <option value="Female">Female (Babae)</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0917-123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Barangay & Street / Purok Address Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Barangay in Dingalan <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value as DingalanBarangay)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                  >
                    {DINGALAN_BARANGAYS.map((bgy) => (
                      <option key={bgy} value={bgy}>
                        Brgy. {bgy}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Street / Purok Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="hal. Purok 3, Feeder Port Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Nino-generate ang QR Code...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Generate Attendance QR Code</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ========================================================================= */
            /* STEP 2: GENERATED PERSONAL QR CODE DISPLAY                                */
            /* ========================================================================= */
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>NAGENERATED NA ANG OPISYAL NA PERSONAL QR CODE!</span>
              </div>

              {/* Ultra Modern Official QR Pass Card */}
              <OfficialQrPassCard
                qrCodeUrl={qrCodeDataUrl}
                payloadUrl={`${window.location.origin}/?action=upload&beneCode=${encodeURIComponent(generatedBene.beneCode)}&id=${encodeURIComponent(generatedBene.id)}&name=${encodeURIComponent(generatedBene.firstName + ' ' + generatedBene.lastName)}&gender=${encodeURIComponent(gender)}&phoneNumber=${encodeURIComponent(phoneNumber)}&department=${encodeURIComponent(generatedBene.assignedCluster)}&address=${encodeURIComponent(address || 'Brgy. ' + generatedBene.barangay)}&barangay=${encodeURIComponent(generatedBene.barangay)}&qrHash=${encodeURIComponent(generatedBene.qrHash)}`}
                title="PERSONAL ATTENDANCE PASS"
                subtitle="Official Beneficiary Linis Dingalan Pass"
                trackingCode={generatedBene.beneCode}
                beneficiaryName={`${generatedBene.firstName} ${generatedBene.lastName}`}
                departmentOrCluster={generatedBene.assignedCluster}
                barangay={generatedBene.barangay}
                securityHash={generatedBene.qrHash || `LD-SEC-${generatedBene.beneCode.slice(-4)}`}
                onScanAction={() => {
                  onScanPersonalQr(generatedBene);
                  onClose();
                }}
                scanActionLabel="Gamitin ang QR Para Magpasa ng Accomplishment"
              />

              <div className="w-full pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Gumawa ng Isa Pang QR Code</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
