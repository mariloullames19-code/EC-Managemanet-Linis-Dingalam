import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Beneficiary } from '../types';
import { api } from '../services/api';
import QRCode from 'qrcode';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  ArrowRight,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  Sparkles,
  Building2,
  FolderOpen,
  ChevronLeft,
  Minimize2,
  QrCode,
  Camera,
  Upload,
  Radio,
  Wrench,
  Coffee,
  Shirt,
  MapPin,
  Phone,
  Users,
  Download,
  RefreshCw,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import systemWallpaper from '../assets/images/dingalan_system_wallpaper.jpg';

const DINGALAN_BACKGROUND_URL = systemWallpaper || 'https://i.ibb.co/YBstSFGf/1b06179e-22f5-43a2-9755-40255190d134-1.jpg';

const DINGALAN_BARANGAYS = [
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
  'Municipal Assessor\'s',
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

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (role: UserRole | User) => void;
  currentUser: User;
  onClose?: () => void;
  onOpenRegisterModal?: () => void;
  onOpenUploadAccomplishment?: () => void;
  onOpenScanQrModal?: () => void;
  onRegisterSuccess?: (bene: Beneficiary) => void;
  eventBroadcast?: any;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLogin,
  onClose,
  onOpenRegisterModal,
  onOpenUploadAccomplishment,
  onOpenScanQrModal,
  onRegisterSuccess,
  eventBroadcast,
}) => {
  const [phTime, setPhTime] = useState<string>('');
  const [isUnfolded, setIsUnfolded] = useState<boolean>(false);
  const [isBroadcastHidden, setIsBroadcastHidden] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Switchable Active View: 'login' | 'register' | 'event'
  const [activeView, setActiveView] = useState<'login' | 'register' | 'event'>('login');

  // Registration Form States
  const [regFullName, setRegFullName] = useState<string>('');
  const [regAge, setRegAge] = useState<string>('');
  const [regGender, setRegGender] = useState<string>('Male (Lalaki)');
  const [regPhoneNumber, setRegPhoneNumber] = useState<string>('');
  const [regDepartment, setRegDepartment] = useState<string>(DEPARTMENT_OFFICES[0]);
  const [regBarangay, setRegBarangay] = useState<string>('Paltic');
  const [regAddress, setRegAddress] = useState<string>('');
  
  const [regGeneratedBene, setRegGeneratedBene] = useState<Beneficiary | null>(null);
  const [regQrCodeDataUrl, setRegQrCodeDataUrl] = useState<string>('');
  const [isRegisterLoading, setIsRegisterLoading] = useState<boolean>(false);

  // Precision 5-second video loop controller & guaranteed autoplay
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen]);

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= 5.0) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  // Login State
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  // Clear fields on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setPendingNotice(null);
      setEmail('');
      setPassword('');
      setActiveView('login');
      setRegFullName('');
      setRegAge('');
      setRegGender('Male (Lalaki)');
      setRegPhoneNumber('');
      setRegDepartment(DEPARTMENT_OFFICES[0]);
      setRegBarangay('Paltic');
      setRegAddress('');
      setRegGeneratedBene(null);
      setRegQrCodeDataUrl('');
    }
  }, [isOpen]);

  const handleAdminPortalClick = () => {
    setErrorMessage(null);
    setPendingNotice(null);
    if (!isUnfolded) {
      setIsUnfolded(true);
      setActiveView('login');
    } else {
      if (activeView === 'login') {
        setIsUnfolded(false);
      } else {
        setActiveView('login');
      }
    }
  };

  const handleRegisterPortalClick = () => {
    setErrorMessage(null);
    setPendingNotice(null);
    if (!isUnfolded) {
      setIsUnfolded(true);
      setActiveView('register');
    } else {
      if (activeView === 'register') {
        setIsUnfolded(false);
      } else {
        setActiveView('register');
      }
    }
  };

  const handleEventPortalClick = () => {
    setErrorMessage(null);
    setPendingNotice(null);
    if (!isUnfolded) {
      setIsUnfolded(true);
      setActiveView('event');
    } else {
      if (activeView === 'event') {
        setIsUnfolded(false);
      } else {
        setActiveView('event');
      }
    }
  };

  // Real-time PST clock timer
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setPhTime(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now) + ' PST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  // Submit Login Form
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPendingNotice(null);

    const cleanInput = email.trim();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMessage('Pakiusap ilagay ang iyong Email o Username.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      // 1. Direct role shortcuts
      const lower = cleanInput.toLowerCase();
      if (
        (lower === 'superadmin' || lower === 'pesodingalan2025' || lower === 'johnmark') &&
        (cleanPass.toLowerCase() === 'pesoadmin' || cleanPass.toLowerCase() === 'password123' || !cleanPass)
      ) {
        onLogin('superadmin');
        return;
      }

      if (
        (lower === 'admin' || lower === 'administrator') &&
        (cleanPass.toLowerCase() === 'admin123' || cleanPass.toLowerCase() === 'password123' || !cleanPass)
      ) {
        onLogin('admin');
        return;
      }

      // 2. Check registered accounts via ApiService
      const authRes = api.authenticate(cleanInput, cleanPass);
      if (authRes.success && authRes.user) {
        onLogin(authRes.user);
        return;
      }

      if (authRes.status === 'pending') {
        setPendingNotice(
          authRes.message ||
          'Kasalukuyang nakabinbin (Pending Review) ang iyong account. Mangyaring maghintay kay ENGR. JOHN MARK N. ORLASAN para ma-approve at ma-activate ang iyong access.'
        );
        return;
      }

      if (authRes.status === 'rejected') {
        setErrorMessage('Ang account na ito ay tinanggihan ng administrator. Mangyaring makipag-ugnayan kay ENGR. JOHN MARK N. ORLASAN.');
        return;
      }

      // Fallback for field officers
      if (lower.includes('menro')) {
        onLogin('menro_officer');
        return;
      }

      setErrorMessage(
        authRes.message || 'Maling credentials. Siguraduhing tama ang iyong Username/Email o mag-rehistro ng bagong account.'
      );
    }, 250);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nameTrim = regFullName.trim();
    if (!nameTrim) {
      setErrorMessage('Pakiusap ilagay ang iyong FULL NAME.');
      return;
    }

    const numAge = parseInt(regAge, 10);
    if (!regAge || isNaN(numAge) || numAge < 18 || numAge > 85) {
      setErrorMessage('Pakiusap ilagay ang wastong AGE (18 hanggang 85 taong gulang).');
      return;
    }

    if (!regDepartment) {
      setErrorMessage('Pakiusap pumili ng iyong DEPARTMENT OFFICE.');
      return;
    }

    if (!regPhoneNumber.trim()) {
      setErrorMessage('Pakiusap ilagay ang iyong PHONE NUMBER.');
      return;
    }

    setIsRegisterLoading(true);

    try {
      // DUPLICATE FULL NAME CHECK
      const existingBenes = await api.getBeneficiaries();
      const isDuplicateName = existingBenes.some((bene) => {
        const existingFullName = `${bene.firstName} ${bene.lastName}`.trim().toLowerCase();
        return existingFullName === nameTrim.toLowerCase();
      });

      if (isDuplicateName) {
        setErrorMessage(`HINDI MAKAKAPAG-GENERATE NG QR CODE! Ang pangalan na "${nameTrim}" ay NAKAREHISTRO NA sa sistema. Pakiusap gumamit ng ibang buong pangalan.`);
        setIsRegisterLoading(false);
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
        nationalOrLocalId: `LGU-DING-${regDepartment.substring(0, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        contactNumber: regPhoneNumber.trim() || '0917-000-0000',
        barangay: regBarangay as any,
        assignedCluster: regDepartment,
        emergencyContactName: `${lastName} Family`,
        emergencyContactPhone: regPhoneNumber.trim() || '0917-000-0000',
        emergencyContactRelation: 'Relative',
        photoUrl: `https://images.unsplash.com/photo-${1534528741775 + (Math.floor(Math.random() * 50))}?w=400&auto=format&fit=crop&q=80`,
        status: 'active',
        qrHash,
      };

      const newBene = await api.createBeneficiary(benePayload);

      // Generate QR Code canvas as a scannable URL that links directly to the app
      const qrPayloadString = `${window.location.origin}/?action=upload&beneCode=${encodeURIComponent(newBene.beneCode)}&id=${encodeURIComponent(newBene.id)}&name=${encodeURIComponent(newBene.firstName + ' ' + newBene.lastName)}&gender=${encodeURIComponent(regGender)}&phoneNumber=${encodeURIComponent(regPhoneNumber)}&department=${encodeURIComponent(newBene.assignedCluster)}&address=${encodeURIComponent(regAddress || 'Brgy. ' + newBene.barangay)}&barangay=${encodeURIComponent(newBene.barangay)}&qrHash=${encodeURIComponent(newBene.qrHash)}`;

      const qrUrl = await QRCode.toDataURL(qrPayloadString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#022c22',
          light: '#ffffff',
        },
      });

      setRegQrCodeDataUrl(qrUrl);
      setRegGeneratedBene(newBene);
      
      if (onRegisterSuccess) {
        onRegisterSuccess(newBene);
      }
    } catch (err) {
      console.error('Error generating QR:', err);
      setErrorMessage('Nagkaroon ng error sa pag-generate ng QR code. Subukan muli.');
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const handleResetRegistration = () => {
    setRegGeneratedBene(null);
    setRegQrCodeDataUrl('');
    setRegFullName('');
    setRegAge('');
    setRegAddress('');
    setRegPhoneNumber('');
  };

  return (
    <div ref={modalScrollRef} className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-slate-950 font-sans text-slate-100 flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* NATIVE HTML5 HD 1080P BACKGROUND VIDEO (5-SECOND PRECISION LOOP) */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-slate-950 flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          aria-hidden="true"
          className="w-full h-full object-cover object-center filter contrast-[1.08] saturate-[1.05] brightness-[1.02] transform translate-z-0"
          style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }}
          src="/dingalan_tech_background.mp4"
        >
          <source src="/dingalan_tech_background.mp4" type="video/mp4" />
        </video>

        {/* Minimal Vignette Tint for 100% Video Crispness & Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-slate-950/20 pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION / STATUS BAR */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-14 xl:px-20 pt-4 sm:pt-6 pb-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
        {/* Official eC access Logo & National Branding */}
        <div className="flex items-center justify-between sm:justify-start space-x-3.5 sm:space-x-4 w-full sm:w-auto">
          <div className="flex items-center space-x-3 sm:space-x-3.5 shrink-0">
            <svg
              viewBox="0 0 205 64"
              className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="login-c-letter-shimmer" x1="-100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#00c875" />
                  <stop offset="35%" stopColor="#00c875" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="65%" stopColor="#a7f3d0" />
                  <stop offset="100%" stopColor="#00c875" />
                  <animate attributeName="x1" from="-120%" to="180%" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="x2" from="-20%" to="280%" dur="2.8s" repeatCount="indefinite" />
                </linearGradient>

                <linearGradient id="login-access-letter-shimmer" x1="-100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#00c875" />
                  <stop offset="35%" stopColor="#00c875" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="65%" stopColor="#a7f3d0" />
                  <stop offset="100%" stopColor="#00c875" />
                  <animate attributeName="x1" from="-120%" to="180%" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="x2" from="-20%" to="280%" dur="2.8s" repeatCount="indefinite" />
                </linearGradient>

                <linearGradient id="login-e-letter-shimmer" x1="-100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#19255a" />
                  <stop offset="35%" stopColor="#19255a" />
                  <stop offset="50%" stopColor="#93c5fd" />
                  <stop offset="65%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#19255a" />
                  <animate attributeName="x1" from="-120%" to="180%" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="x2" from="-20%" to="280%" dur="2.8s" repeatCount="indefinite" />
                </linearGradient>
              </defs>

              <path
                d="M34 60 C18 60 5 47 5 31 C5 15 18 2 34 2 C47 2 57 10 61 22 L47 26 C45 18 40 14 34 14 C24 14 17 22 17 31 C17 41 24 48 34 48 C40 48 45 44 47 37 L61 41 C57 52 47 60 34 60 Z"
                fill="#181818"
                transform="translate(2, 2.5)"
                opacity="0.75"
              />
              <path
                d="M34 60 C18 60 5 47 5 31 C5 15 18 2 34 2 C47 2 57 10 61 22 L47 26 C45 18 40 14 34 14 C24 14 17 22 17 31 C17 41 24 48 34 48 C40 48 45 44 47 37 L61 41 C57 52 47 60 34 60 Z"
                fill="url(#login-c-letter-shimmer)"
              />
              <path
                d="M32 20 C24 20 18.5 25.5 18.5 33 C18.5 40.5 24 46 32 46 C37.5 46 41.5 43 43.5 39.5 L37.5 36.5 C36.5 38 34.5 39.5 32 39.5 C28.5 39.5 25.5 37 25.5 34 L45 34 C45.2 33 45.2 32 45.2 31 C45.2 24.5 39.5 20 32 20 Z"
                fill="#ffffff"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <path
                d="M32 21 C25 21 20 26 20 33 C20 40 25 45 32 45 C37 45 40.5 42.5 42.5 39 L37.5 36.5 C36.5 38 34.5 39 32 39 C29 39 26.5 37 26.5 34.5 L44 34.5 C44.1 33.6 44.1 32.8 44.1 32 C44.1 25.5 39 21 32 21 Z M26.5 30.5 C27 27.5 29.2 25.5 32 25.5 C35 25.5 37.5 27.5 37.8 30.5 L26.5 30.5 Z"
                fill="url(#login-e-letter-shimmer)"
              />
              <text
                x="68"
                y="46"
                fill="#1f1f1f"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="38"
                letterSpacing="-1.8"
                opacity="0.8"
                dx="2"
                dy="2.5"
              >
                access
              </text>
              <text
                x="68"
                y="46"
                fill="url(#login-access-letter-shimmer)"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="900"
                fontSize="38"
                letterSpacing="-1.8"
              >
                access
              </text>
            </svg>

            <div className="h-8 sm:h-10 w-px bg-slate-700/80" />

            <div className="text-left space-y-0.5">
              <span className="text-[9px] sm:text-xs font-mono font-extrabold text-emerald-400 tracking-wider uppercase block">
                REPUBLIC OF THE PHILIPPINES
              </span>
              <h1 className="text-xs sm:text-base md:text-lg font-black text-white tracking-tight leading-tight drop-shadow">
                Municipality of Dingalan, Aurora
              </h1>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Isara o Pumunta sa System Overview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Header Action Buttons: Neatly Full-Width and Justified on Mobile, Row on Desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Admin Login Icon Button */}
          <button
            type="button"
            onClick={handleAdminPortalClick}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 text-xs font-mono font-bold border px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-full transition-all transform hover:scale-[1.01] sm:hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
              isUnfolded && activeView === 'login'
                ? 'text-slate-950 bg-white border-white shadow-[0_0_25px_rgba(255,255,255,0.4)]'
                : 'text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border-emerald-400/60 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
            }`}
            title="Pindutin para lumabas ang Admin Login Portal"
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${isUnfolded && activeView === 'login' ? 'text-slate-950' : 'text-white'}`} />
            <span className="tracking-wide">Admin Login Portal</span>
            <LogIn className={`w-4 h-4 shrink-0 ${isUnfolded && activeView === 'login' ? 'text-slate-950' : 'text-emerald-200'}`} />
          </button>

          {/* Registration Button */}
          <button
            type="button"
            onClick={handleRegisterPortalClick}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 text-xs font-mono font-bold border px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-full transition-all transform hover:scale-[1.01] sm:hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
              isUnfolded && activeView === 'register'
                ? 'text-slate-950 bg-white border-white shadow-[0_0_25px_rgba(255,255,255,0.4)]'
                : 'text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 border-cyan-300/80 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
            }`}
            title="Mag-rehistro ng Personal Details at Mag-generate ng QR Code"
          >
            <QrCode className="w-4 h-4 shrink-0 text-slate-950" />
            <span className="tracking-wide">Registration / Generate QR</span>
          </button>

          {/* EVENT Button (Only displays on Mobile Devices when an Event Broadcast is Active; Hidden on Computer) */}
          {eventBroadcast && (
            <button
              type="button"
              onClick={handleEventPortalClick}
              className={`sm:hidden w-full flex items-center justify-center space-x-2 text-xs font-mono font-bold border px-4 py-2.5 rounded-xl transition-all transform hover:scale-[1.01] active:scale-95 cursor-pointer shadow-sm ${
                isUnfolded && activeView === 'event'
                  ? 'text-slate-950 bg-white border-white shadow-[0_0_25px_rgba(255,255,255,0.4)]'
                  : 'text-emerald-100 bg-gradient-to-r from-teal-800/80 via-emerald-700/80 to-teal-900/80 hover:from-teal-700 hover:to-emerald-600 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              }`}
              title="Pindutin para lumabas ang Event Advisory sa itaas ng Linis Dingalan"
            >
              <Radio className={`w-4 h-4 shrink-0 ${isUnfolded && activeView === 'event' ? 'text-slate-950' : 'text-emerald-300 animate-pulse'}`} />
              <span className="tracking-wide font-extrabold uppercase">EVENT</span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${isUnfolded && activeView === 'event' ? 'bg-slate-950' : 'bg-emerald-400 animate-ping'}`} />
            </button>
          )}

          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-emerald-300 bg-slate-900/80 border border-emerald-500/40 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{phTime || 'Loading PST...'}</span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex p-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Isara o Pumunta sa System Overview"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CENTER HERO CONTAINER (MOVED HIGHER FOR CLEANER VISUAL BALANCE) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-20 pt-3 sm:pt-6 lg:pt-8 pb-8 sm:pb-12 mt-1 sm:mt-2 mb-auto">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start">
          
          {/* --------------------------------------------------------------------- */}
          {/* LEFT SIDE: HERO TYPOGRAPHY & BRANDING (PERMANENTLY ANCHORED AT TOP-LEFT) */}
          {/* --------------------------------------------------------------------- */}
          <div className="lg:col-span-6 xl:col-span-6 text-left space-y-4 sm:space-y-6 w-full order-1">
            <div className="space-y-3">
              <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
                Linis Dingalan <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  EC Management
                </span>
              </h1>
              <p className="text-xs sm:text-base lg:text-lg text-slate-200 font-medium leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] text-justify">
                Innovation in Action Project of Municipal Environment and Natural Resources Office in Collaboration with Public Employment Service Office.
              </p>
              <div className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start space-x-2 px-3.5 py-2 rounded-xl sm:rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-mono font-bold tracking-wide shadow-lg backdrop-blur-md text-center sm:text-left">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="leading-tight">PESO & MENRO INTEGRATED OPERATIONS PLATFORM</span>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-3xl bg-slate-950/60 border border-slate-700/80 backdrop-blur-xl shadow-2xl space-y-3 max-w-xl">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans text-justify">
                Activity-based participants' inventory monitoring with photographic compliance and real-time GPS watermarking across 11 coastal and river Barangays with Offline First to Online Sync Feature.
              </p>
              <div className="flex items-center justify-between sm:justify-start space-x-4 pt-2 border-t border-slate-800 text-xs font-mono text-emerald-400">
                <span className="flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="font-semibold tracking-wide">11 Coastal Barangays Covered</span>
                </span>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT SIDE: POP-UP LOGIN BOX / BROADCAST CARD (ALWAYS ORDER-2) */}
          {/* --------------------------------------------------------------------- */}
          <div className={`lg:col-span-6 xl:col-span-6 w-full max-w-xl xl:max-w-2xl mx-auto self-start order-2 ${!isUnfolded ? 'hidden lg:block' : ''}`}>
            {isUnfolded ? (
              activeView === 'event' && eventBroadcast ? (
                /* ========================================================================= */
                /* EVENT BROADCAST CARD (POPPED UP ABOVE LINIS DINGALAN ON MOBILE)          */
                /* ========================================================================= */
                <div className="relative rounded-3xl border-2 border-emerald-500/70 shadow-[0_0_50px_rgba(16,185,129,0.4),inset_0_0_25px_rgba(16,185,129,0.15)] bg-slate-950/50 hover:bg-slate-950/55 backdrop-blur-md p-5 sm:p-8 space-y-5 sm:space-y-6 transition-all duration-500 hover:shadow-[0_0_55px_rgba(16,185,129,0.45)] hover:border-emerald-400 animate-scaleIn w-full">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3.5 gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 backdrop-blur-sm truncate">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate">Opisyal na Patnubay at Paalala ng Admin</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {/* Hide Button */}
                      <button
                        type="button"
                        onClick={() => setIsUnfolded(false)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/60 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-all cursor-pointer backdrop-blur-sm shadow-sm hover:scale-105 active:scale-95 shrink-0"
                        title="I-hide / Itago ang paalala"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400 shrink-0" />
                        <span>Itago / Hide</span>
                      </button>

                      {/* Close Button X */}
                      <button
                        type="button"
                        onClick={() => setIsUnfolded(false)}
                        className="p-1.5 rounded-xl bg-slate-900/60 hover:bg-emerald-950/80 border border-emerald-500/50 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-105 shrink-0"
                        title="Isara ang Event Advisory"
                      >
                        <X className="w-4 h-4 text-emerald-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="space-y-2 min-w-0 flex-1 text-left">
                      <h3 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                        {eventBroadcast.activityTitle}
                      </h3>
                      <p className="text-xs sm:text-sm text-emerald-300 font-mono font-semibold flex items-center gap-1.5 drop-shadow">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                        <span>Brgy. {eventBroadcast.barangay} • {eventBroadcast.targetArea}</span>
                      </p>
                      <p className="text-xs sm:text-sm text-slate-300 font-mono flex items-center gap-1.5 drop-shadow">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                        <span>{eventBroadcast.startTime} – {eventBroadcast.estimatedEndTime} ({eventBroadcast.totalHours})</span>
                      </p>
                    </div>
                  </div>

                  {/* Specific Advisories Grid with Modern Semi-Transparent Glass Styling & Justified Text */}
                  <div className="space-y-3 sm:space-y-3.5 pt-3 sm:pt-4 border-t border-white/10 text-xs font-mono text-slate-300 text-left">
                    {eventBroadcast.requiredTools && (
                      <div className="flex items-start space-x-3 bg-slate-950/40 hover:bg-slate-950/50 p-3 sm:p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors">
                        <Wrench className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Dapat Dalhing Kagamitan:</span>
                          <span className="text-white text-xs leading-relaxed text-justify block">{eventBroadcast.requiredTools}</span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.waterTumblerReminder && (
                      <div className="flex items-start space-x-3 bg-slate-950/40 hover:bg-slate-950/50 p-3 sm:p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors">
                        <Coffee className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Paalala sa Hydration / Tubig:</span>
                          <span className="text-white text-xs leading-relaxed text-justify block">{eventBroadcast.waterTumblerReminder}</span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.recommendedAttire && (
                      <div className="flex items-start space-x-3 bg-slate-950/40 hover:bg-slate-950/50 p-3 sm:p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors">
                        <Shirt className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Dapat Kasuotan (Attire):</span>
                          <span className="text-white text-xs leading-relaxed text-justify block">{eventBroadcast.recommendedAttire}</span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.additionalNotes && (
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/40 hover:bg-slate-950/50 border border-emerald-500/25 text-xs font-sans text-slate-200 italic leading-relaxed backdrop-blur-sm shadow-inner transition-colors text-justify">
                        <strong className="text-emerald-300 not-italic font-semibold">Karagdagang Paalala ng LGU Admin:</strong> {eventBroadcast.additionalNotes}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 pt-2 text-right border-t border-white/10">
                    Ipinadala ni: <strong className="text-emerald-400">{eventBroadcast.sentByAdminName}</strong>
                  </div>
                </div>
              ) : (
                /* ULTRA-SMOOTH POP-UP GREEN DIAGONAL CARD (SEMI-TRANSPARENT FROSTED GLASS) */
                <div
                  className="relative rounded-3xl border-2 border-emerald-500/70 shadow-[0_0_50px_rgba(16,185,129,0.4),inset_0_0_25px_rgba(16,185,129,0.15)] bg-slate-950/50 hover:bg-slate-950/55 backdrop-blur-md overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-all duration-700 ease-out transform scale-100 opacity-100 translate-y-0"
                  style={{
                    perspective: '1200px',
                    transformStyle: 'preserve-3d',
                    animation: 'smoothPopup 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                >
                  {/* Pop-Up Close Icon (X) on Top Right */}
                  <button
                    type="button"
                    onClick={() => setIsUnfolded(false)}
                    className="absolute top-4 right-4 z-30 p-2 rounded-full bg-slate-900/60 hover:bg-emerald-950/80 border border-emerald-500/50 text-slate-300 hover:text-white transition-all duration-300 cursor-pointer shadow-lg hover:scale-110 backdrop-blur-sm"
                    title="Isara ang Login Box"
                  >
                    <X className="w-5 h-5 text-emerald-400" />
                  </button>

                {activeView === 'register' ? (
                  /* ========================================================================= */
                  /* INTEGRATED FULL-WIDTH REGISTRATION FORM / QR CODE DISPLAY                */
                  /* ========================================================================= */
                  <div className="col-span-12 p-6 sm:p-8 flex flex-col space-y-5 relative z-10 animate-fadeIn">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 backdrop-blur-sm">
                          <QrCode className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="text-left">
                          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                            Register & Generate Personal QR Code
                          </h2>
                          <p className="text-[11px] sm:text-xs text-slate-300">
                            Pang-isahang Personal QR Code para sa Accomplishment Attendance
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Step 1: Input Form */}
                    {!regGeneratedBene ? (
                      <form onSubmit={handleRegisterSubmit} className="space-y-4 pt-2">
                        
                        {/* 1. Department / Office */}
                        <div className="space-y-1.5 text-left">
                          <label className="block text-xs font-mono font-bold text-slate-300">
                            Department / Office <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={regDepartment}
                            onChange={(e) => setRegDepartment(e.target.value)}
                            className="w-full bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-all backdrop-blur-sm cursor-pointer"
                          >
                            {DEPARTMENT_OFFICES.map((dept) => (
                              <option key={dept} value={dept} className="bg-slate-900 text-white">
                                {dept}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Full Name */}
                        <div className="space-y-1.5 text-left">
                          <label className="block text-xs font-mono font-bold text-slate-300">
                            Full Name (Buong Pangalan) <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="hal. Juan Dela Cruz"
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            className="w-full bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none transition-all font-sans backdrop-blur-sm"
                          />
                        </div>

                        {/* 3. Grid for Age, Gender, Phone Number */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          {/* Age */}
                          <div className="sm:col-span-3 space-y-1.5 text-left">
                            <label className="block text-xs font-mono font-bold text-slate-300">
                              Age <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="number"
                              required
                              placeholder="hal. 34"
                              value={regAge}
                              onChange={(e) => setRegAge(e.target.value)}
                              className="w-full bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none transition-all font-sans backdrop-blur-sm"
                            />
                          </div>

                          {/* Gender */}
                          <div className="sm:col-span-4 space-y-1.5 text-left">
                            <label className="block text-xs font-mono font-bold text-slate-300">
                              Gender <span className="text-rose-400">*</span>
                            </label>
                            <select
                              value={regGender}
                              onChange={(e) => setRegGender(e.target.value)}
                              className="w-full bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-all backdrop-blur-sm cursor-pointer"
                            >
                              <option value="Male (Lalaki)" className="bg-slate-900 text-white">Male (Lalaki)</option>
                              <option value="Female (Babae)" className="bg-slate-900 text-white">Female (Babae)</option>
                            </select>
                          </div>

                          {/* Phone Number */}
                          <div className="sm:col-span-5 space-y-1.5 text-left">
                            <label className="block text-xs font-mono font-bold text-slate-300">
                              Phone Number <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="0917-123-4567"
                              value={regPhoneNumber}
                              onChange={(e) => setRegPhoneNumber(e.target.value)}
                              className="w-full bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none transition-all font-sans backdrop-blur-sm"
                            />
                          </div>
                        </div>

                        {/* 4. Grid for Barangay and Street/Purok Address */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Barangay */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-xs font-mono font-bold text-slate-300">
                              Barangay in Dingalan <span className="text-rose-400">*</span>
                            </label>
                            <select
                              value={regBarangay}
                              onChange={(e) => setRegBarangay(e.target.value)}
                              className="w-full bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition-all backdrop-blur-sm cursor-pointer"
                            >
                              {DINGALAN_BARANGAYS.map((brgy) => (
                                <option key={brgy} value={brgy} className="bg-slate-900 text-white">
                                  Brgy. {brgy}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Street Address */}
                          <div className="space-y-1.5 text-left">
                            <label className="block text-xs font-mono font-bold text-slate-300">
                              Street / Purok Address <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="hal. Purok 3, Feeder Port Area"
                              value={regAddress}
                              onChange={(e) => setRegAddress(e.target.value)}
                              className="w-full bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/80 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none transition-all font-sans backdrop-blur-sm"
                            />
                          </div>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isRegisterLoading}
                          className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.45)] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                        >
                          {isRegisterLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                              <span>Nino-generate ang QR Code...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-4 h-4 text-slate-950" />
                              <span>Generate Attendance QR Code</span>
                            </>
                          )}
                        </button>
                        
                        {/* Redirection link to Login */}
                        <div className="space-y-1.5 text-center text-xs font-mono text-slate-300 pt-1">
                          <div>
                            May account ka na?{' '}
                            <button
                              type="button"
                              onClick={() => setActiveView('login')}
                              className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer ml-0.5 transition-colors"
                            >
                              Mag-login Dito
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      /* ========================================================================= */
                      /* SUCCESS DISPLAY WITH THE GENERATED QR CODE FRAME                         */
                      /* ========================================================================= */
                      <div className="flex flex-col items-center text-center space-y-4 pt-2 animate-scaleIn">
                        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>NAGENERATED NA ANG IYONG PERSONAL QR CODE!</span>
                        </div>

                        {/* QR Code Canvas Frame */}
                        <div className="p-4 bg-white/95 rounded-3xl shadow-2xl border-4 border-emerald-500/30 flex flex-col items-center backdrop-blur-sm">
                          <img src={regQrCodeDataUrl} alt="Personal QR Code" className="w-52 h-52 object-contain" />
                          <div className="mt-2 text-center">
                            <p className="font-mono text-xs font-extrabold text-slate-900 tracking-wider">
                              {regGeneratedBene.beneCode}
                            </p>
                            <p className="text-[11px] text-slate-600 font-bold font-sans">
                              {regGeneratedBene.firstName} {regGeneratedBene.lastName}
                            </p>
                          </div>
                        </div>

                        {/* Details Summary */}
                        <div className="w-full bg-slate-950/50 border border-slate-800/80 backdrop-blur-sm rounded-2xl p-4 text-left text-xs space-y-2 font-mono">
                          <div className="flex justify-between border-b border-slate-800 pb-1.5">
                            <span className="text-slate-400">Department:</span>
                            <span className="text-emerald-400 font-bold truncate max-w-[240px]">
                              {regGeneratedBene.assignedCluster}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-slate-900 pb-1.5">
                            <span className="text-slate-400">Pangalan:</span>
                            <span className="text-white font-extrabold">
                              {regGeneratedBene.firstName} {regGeneratedBene.lastName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Barangay:</span>
                            <span className="text-slate-200">Brgy. {regGeneratedBene.barangay}, Dingalan</span>
                          </div>
                        </div>

                        {/* Download & Action Buttons */}
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <a
                            href={regQrCodeDataUrl}
                            download={`Personal_QR_${regGeneratedBene.firstName}_${regGeneratedBene.lastName}.png`}
                            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                          >
                            <Download className="w-4 h-4 text-slate-950" />
                            <span>I-download ang Image</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenScanQrModal) {
                                onOpenScanQrModal();
                              }
                              setIsUnfolded(false);
                            }}
                            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2"
                          >
                            <Camera className="w-4 h-4 text-slate-400" />
                            <span>Mag-Scan at Mag-upload</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetRegistration}
                          className="text-xs text-slate-400 hover:text-cyan-400 underline pt-1 font-mono cursor-pointer"
                        >
                          Gumawa ng panibagong QR Code
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ========================================================================= */
                  /* STEP 1: CLASSIC LOGIN FORM (7 COLS PANEL + 5 COLS PANEL)                 */
                  /* ========================================================================= */
                  <>
                    {/* LEFT SIDE FORM PANEL */}
                    <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5 relative z-10 animate-fadeIn">
                      {/* Top Badge (NO I-tiklop button inside card) */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold w-fit">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>ADMIN PORTAL</span>
                        </div>
                      </div>

                      {/* Error Banner */}
                      {errorMessage && (
                        <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-semibold flex items-start space-x-2 animate-fadeIn">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      {/* Pending Notice Banner */}
                      {pendingNotice && (
                        <div className="p-3 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs space-y-1 animate-fadeIn">
                          <div className="flex items-center space-x-2 font-bold text-amber-300 font-mono">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>ACCOUNT PENDING</span>
                          </div>
                          <p className="leading-tight">{pendingNotice}</p>
                        </div>
                      )}

                      {/* Form Heading */}
                      <div className="text-left space-y-1">
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                          Login
                        </h2>
                      </div>

                      {/* Form Fields */}
                      <form onSubmit={handleLoginSubmit} className="space-y-6">
                        {/* Underlined Username/Email Field */}
                        <div className="space-y-1 text-left">
                          <div className="flex items-center border-b-2 border-slate-700 hover:border-emerald-500/80 focus-within:border-emerald-400 transition-colors py-2">
                            <UserIcon className="w-5 h-5 text-slate-300 mr-2.5 shrink-0" />
                            <input
                              type="text"
                              autoComplete="username"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Username"
                              className="w-full bg-transparent text-white placeholder-slate-400 text-sm font-sans focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Underlined Password Field */}
                        <div className="space-y-1 text-left">
                          <div className="flex items-center border-b-2 border-slate-700 hover:border-emerald-500/80 focus-within:border-emerald-400 transition-colors py-2">
                            <Lock className="w-5 h-5 text-slate-300 mr-2.5 shrink-0" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="current-password"
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Password"
                              className="w-full bg-transparent text-white placeholder-slate-400 text-sm font-sans focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer ml-2"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Pill-Shaped Green Gradient Login Button */}
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full py-3.5 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-base tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.6)] border border-emerald-400/50 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isLoading ? (
                            <span className="flex items-center space-x-2">
                              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Logging in...</span>
                            </span>
                          ) : (
                            <span>Login</span>
                          )}
                        </button>

                        {/* Bottom Redirects & Links */}
                        <div className="space-y-1.5 text-center text-xs font-mono text-slate-300 pt-1">
                          <div>
                            Don't have an account?{' '}
                            <button
                              type="button"
                              onClick={() => setActiveView('register')}
                              className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer ml-0.5 transition-colors"
                            >
                              Sign Up / Personal QR
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* RIGHT SIDE DIAGONAL GREEN PANEL (TRANSLUCENT FROSTED GLASS) */}
                    <div className="md:col-span-5 relative hidden md:flex flex-col justify-center items-center p-6 text-center text-white overflow-hidden min-h-[360px]">
                      {/* Diagonal Green Panel Background */}
                      <div
                        className="absolute inset-0 bg-gradient-to-br from-emerald-500/60 via-emerald-600/50 to-teal-950/70 backdrop-blur-sm shadow-[inset_0_0_30px_rgba(0,0,0,0.3)]"
                        style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0 100%)' }}
                      />

                      {/* Right Side Overlay Content */}
                      <div className="relative z-10 pl-6 space-y-3">
                        <h2 className="text-2xl lg:text-3xl xl:text-4xl font-extrabold text-white tracking-tight uppercase drop-shadow-md leading-tight">
                          WELCOME BACK!
                        </h2>
                        <p className="text-xs sm:text-sm text-emerald-100 font-medium leading-relaxed max-w-xs drop-shadow">
                          Already a Member? Please Login.
                        </p>

                        <div className="pt-4 border-t border-emerald-400/30 text-[10px] font-mono text-emerald-200">
                          Linis Dingalan EC Management <br />
                          PESO & MENRO Operations
                        </div>
                      </div>
                    </div>
                  </>
                )}

                </div>
              )
            ) : (
              /* BROADCAST CARD IN RIGHT SIDE WITH GORGEOUS TRANSLUCENT GLASS DESIGN & HIDE TOGGLE */
              eventBroadcast && (
                isBroadcastHidden ? (
                  <div className="flex justify-end w-full animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => setIsBroadcastHidden(false)}
                      className="group flex items-center justify-center space-x-2.5 px-5 py-3 rounded-2xl bg-slate-950/40 hover:bg-slate-900/70 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 text-xs font-mono font-bold backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all cursor-pointer transform hover:scale-105 active:scale-95 w-full sm:w-auto"
                      title="Ipakita muli ang Opisyal na Paalala ng Admin"
                    >
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse group-hover:scale-110 transition-transform shrink-0" />
                      <span>Ipakita ang Paalala ng Admin</span>
                      <Eye className="w-4 h-4 text-emerald-400 group-hover:text-emerald-200 shrink-0" />
                    </button>
                  </div>
                ) : (
                  <div className="relative rounded-3xl border-2 border-emerald-500/60 shadow-[0_0_40px_rgba(16,185,129,0.3),inset_0_0_20px_rgba(16,185,129,0.12)] bg-slate-950/45 hover:bg-slate-950/55 backdrop-blur-md p-5 sm:p-8 space-y-5 sm:space-y-6 transition-all duration-500 hover:shadow-[0_0_55px_rgba(16,185,129,0.45)] hover:border-emerald-400 animate-scaleIn w-full">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3.5 gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span className="px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider sm:tracking-widest flex items-center gap-1.5 backdrop-blur-sm truncate">
                          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                          <span className="truncate">Opisyal na Patnubay at Paalala ng Admin</span>
                        </span>
                      </div>

                      {/* Hide Button */}
                      <button
                        type="button"
                        onClick={() => setIsBroadcastHidden(true)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/60 text-slate-300 hover:text-white text-xs font-mono font-semibold transition-all cursor-pointer backdrop-blur-sm shadow-sm hover:scale-105 active:scale-95 shrink-0"
                        title="I-hide / Itago ang paalala para mas makita ang background video"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400 shrink-0" />
                        <span>Itago / Hide</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-3 sm:gap-4">
                      <div className="space-y-2 min-w-0 flex-1 text-left">
                        <h3 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                          {eventBroadcast.activityTitle}
                        </h3>
                        <p className="text-xs sm:text-sm text-emerald-300 font-mono font-semibold flex items-center gap-1.5 drop-shadow">
                          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                          <span>Brgy. {eventBroadcast.barangay} • {eventBroadcast.targetArea}</span>
                        </p>
                        <p className="text-xs sm:text-sm text-slate-300 font-mono flex items-center gap-1.5 drop-shadow">
                          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0" />
                          <span>{eventBroadcast.startTime} – {eventBroadcast.estimatedEndTime} ({eventBroadcast.totalHours})</span>
                        </p>
                      </div>
                    </div>

                    {/* Specific Advisories Grid with Modern Semi-Transparent Glass Styling & Justified Text */}
                    <div className="space-y-3 sm:space-y-3.5 pt-3 sm:pt-4 border-t border-white/10 text-xs font-mono text-slate-300 text-left">
                      {eventBroadcast.requiredTools && (
                        <div className="flex items-start space-x-3 bg-slate-950/40 hover:bg-slate-950/50 p-3 sm:p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors">
                          <Wrench className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Dapat Dalhing Kagamitan:</span>
                            <span className="text-white text-xs leading-relaxed text-justify block">{eventBroadcast.requiredTools}</span>
                          </div>
                        </div>
                      )}

                      {eventBroadcast.waterTumblerReminder && (
                        <div className="flex items-start space-x-3 bg-slate-950/40 hover:bg-slate-950/50 p-3 sm:p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors">
                          <Coffee className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Paalala sa Hydration / Tubig:</span>
                            <span className="text-white text-xs leading-relaxed text-justify block">{eventBroadcast.waterTumblerReminder}</span>
                          </div>
                        </div>
                      )}

                      {eventBroadcast.recommendedAttire && (
                        <div className="flex items-start space-x-3 bg-slate-950/40 hover:bg-slate-950/50 p-3 sm:p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm transition-colors">
                          <Shirt className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider mb-0.5">Dapat Kasuotan (Attire):</span>
                            <span className="text-white text-xs leading-relaxed text-justify block">{eventBroadcast.recommendedAttire}</span>
                          </div>
                        </div>
                      )}

                      {eventBroadcast.additionalNotes && (
                        <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/40 hover:bg-slate-950/50 border border-emerald-500/25 text-xs font-sans text-slate-200 italic leading-relaxed backdrop-blur-sm shadow-inner transition-colors text-justify">
                          <strong className="text-emerald-300 not-italic font-semibold">Karagdagang Paalala ng LGU Admin:</strong> {eventBroadcast.additionalNotes}
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 pt-2 text-right border-t border-white/10">
                      Ipinadala ni: <strong className="text-emerald-400">{eventBroadcast.sentByAdminName}</strong>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM FOOTER BAR */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-14 xl:px-20 py-3 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-300 border-t border-white/10 bg-slate-950/30 backdrop-blur-sm gap-2">
        <div className="drop-shadow text-center sm:text-left text-[11px] sm:text-xs">
          Linis Dingalan EC Management Platform • PESO & MENRO Operations • Municipality of Dingalan, Aurora
        </div>
        <div className="flex flex-wrap justify-center items-center gap-2 sm:space-x-3 text-emerald-300 drop-shadow text-[10px] sm:text-[11px]">
          <span>Lead Approver: ENGR. JOHN MARK N. ORLASAN</span>
          <span className="hidden sm:inline">•</span>
          <span>Offline-First Synced</span>
        </div>
      </div>
    </div>
  );
};
