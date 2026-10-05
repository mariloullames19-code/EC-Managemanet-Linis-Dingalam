import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Beneficiary, EventQrBroadcast } from '../types';
import { api } from '../services/api';
import { INITIAL_EVENT_BROADCAST } from '../data/seedData';
import QRCode from 'qrcode';
import { checkEventCutoff } from '../utils/watermarkEngine';
import { useDingalanClock, getDingalanNow } from '../utils/philippineClock';
import { SendAnonymousMessageModal } from './SendAnonymousMessageModal';
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
  Printer,
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
  users?: User[];
  activities?: any[];
  onClose?: () => void;
  onOpenRegisterModal?: () => void;
  onOpenUploadAccomplishment?: (beneficiary?: Beneficiary) => void;
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
  eventBroadcast: propEventBroadcast,
}) => {
  const clock = useDingalanClock();
  const phTime = clock.time;
  const [isUnfolded, setIsUnfolded] = useState<boolean>(true);
  const [isBroadcastHidden, setIsBroadcastHidden] = useState<boolean>(false);
  const [isAnonymousModalOpen, setIsAnonymousModalOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Dedicated active broadcast state, initialized synchronously from prop, localStorage, or seed fallback
  const [activeBroadcast, setActiveBroadcast] = useState<EventQrBroadcast | null>(() => {
    if (propEventBroadcast && propEventBroadcast.id) return propEventBroadcast;
    if (typeof window !== 'undefined') {
      try {
        const direct = localStorage.getItem('ld_latest_event_broadcast');
        if (direct) return JSON.parse(direct);
        const raw = localStorage.getItem('ld_event_broadcasts_v1');
        if (raw) {
          const list = JSON.parse(raw);
          if (list && list.length > 0) return list[0];
        }
      } catch {}
    }
    return null;
  });

  const eventBroadcast = activeBroadcast || propEventBroadcast || INITIAL_EVENT_BROADCAST;

  // Keep activeBroadcast synchronized with prop changes
  useEffect(() => {
    if (propEventBroadcast && propEventBroadcast.id) {
      setActiveBroadcast(propEventBroadcast);
      setIsUnfolded(true);
      setActiveView('event');
    }
  }, [propEventBroadcast]);

  // Real-time synchronization: listen to broadcast changes across all tabs and windows
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ld_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_BROADCAST' && event.data.broadcast) {
          setActiveBroadcast(event.data.broadcast);
          setIsUnfolded(true);
          setActiveView('event');
        }
      };
      return () => bc.close();
    }
  }, []);

  // Background fetch to ensure fresh broadcast is loaded if state is null
  useEffect(() => {
    if (!activeBroadcast) {
      api.getLatestEventBroadcast().then((bc) => {
        if (bc && bc.id) {
          setActiveBroadcast(bc);
        }
      }).catch(() => {});
    }
  }, [activeBroadcast]);

  // Switchable Active View: Defaults to 'event' (Paalala at Patnubay Box automatic na bubungad)
  const [activeView, setActiveView] = useState<'login' | 'event'>('event');

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

  // Event QR Code data URL state (with dynamic QR generator fallback)
  const [eventQrUrl, setEventQrUrl] = useState<string>('');

  useEffect(() => {
    if (!eventBroadcast) return;
    if (eventBroadcast.qrDataUrl) {
      setEventQrUrl(eventBroadcast.qrDataUrl);
      return;
    }
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://linis-dingalan.aurora.gov.ph';
    const payload = `${currentOrigin}/?action=upload&act_id=${eventBroadcast.activityId}&brgy=${encodeURIComponent(eventBroadcast.barangay)}&date=${encodeURIComponent(eventBroadcast.eventDate)}`;

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: { dark: '#022c22', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setEventQrUrl(url))
      .catch((err) => console.error('Error generating event QR fallback:', err));
  }, [eventBroadcast]);

  // Automatically open the Event Advisory with QR Code whenever a broadcast is sent or loaded
  useEffect(() => {
    if (eventBroadcast && eventBroadcast.id && !isBroadcastHidden) {
      setIsUnfolded(true);
      setActiveView('event');
    }
  }, [eventBroadcast]);

  // Live Countdown Timer State for Event Advisory
  const [eventTimeLeft, setEventTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isExpired: boolean;
    isPast24Hours: boolean;
    formatted: string;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false,
    isPast24Hours: false,
    formatted: '00h : 00m : 00s',
  });

  useEffect(() => {
    if (!eventBroadcast) return;

    const calculateCountdown = () => {
      const cutoff = checkEventCutoff(null, eventBroadcast);

      if (!cutoff.deadlineDate) {
        setEventTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isExpired: true,
          isPast24Hours: false,
          formatted: '00h : 00m : 00s',
        });
        return;
      }

      // Synchronized authoritative time in Dingalan, Aurora (PST UTC+8)
      const nowMs = getDingalanNow().getTime();
      const diffMs = cutoff.deadlineDate.getTime() - nowMs;
      if (diffMs <= 0) {
        const pastCutoffMs = Math.abs(diffMs);
        const isPast24Hours = pastCutoffMs >= 24 * 60 * 60 * 1000;
        setEventTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isExpired: true,
          isPast24Hours,
          formatted: '00h : 00m : 00s',
        });
      } else {
        const totalSecs = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;
        setEventTimeLeft({
          hours,
          minutes,
          seconds,
          totalSeconds: totalSecs,
          isExpired: false,
          isPast24Hours: false,
          formatted: `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`,
        });
      }
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [eventBroadcast]);

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

  // Check for scanned URL actions (e.g. from mobile phone camera scan) or saved registration
  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setPendingNotice(null);
    // Automatic na bubungad ang Paalala at QR Code card
    setIsUnfolded(true);
    setActiveView('event');

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const actId = params.get('act_id');
      const brgyParam = params.get('brgy');

      if (action === 'personal_qr' || action === 'register' || actId) {
        setIsUnfolded(true);
        setActiveView('event');

        if (brgyParam && DINGALAN_BARANGAYS.includes(brgyParam)) {
          setRegBarangay(brgyParam);
        }

        // Auto-load last registered beneficiary or generate personal QR
        try {
          const savedBeneStr = localStorage.getItem('LD_LAST_REGISTERED_BENE');
          let targetBene: Beneficiary | null = null;
          if (savedBeneStr) {
            targetBene = JSON.parse(savedBeneStr);
          } else {
            // Default active participant profile so Picture 2 opens instantly
            targetBene = {
              id: 'ben-001',
              beneCode: 'LD-BEN-2025-0107',
              firstName: 'Juan',
              lastName: 'Dela Cruz',
              nationalOrLocalId: 'LGU-DING-2025-0107',
              contactNumber: '0917-123-4567',
              barangay: (brgyParam as any) || 'Paltic',
              assignedCluster: 'Municipal Administrator',
              emergencyContactName: 'Family',
              emergencyContactPhone: '0917-123-4567',
              emergencyContactRelation: 'Spouse',
              photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              status: 'active',
              qrHash: 'qr-hash-verified-0107',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }

          if (targetBene) {
            setRegGeneratedBene(targetBene);
            const qrPayloadString = `${window.location.origin}/?action=upload&beneCode=${encodeURIComponent(targetBene.beneCode)}&id=${encodeURIComponent(targetBene.id)}&name=${encodeURIComponent(targetBene.firstName + ' ' + targetBene.lastName)}&department=${encodeURIComponent(targetBene.assignedCluster)}&barangay=${encodeURIComponent(targetBene.barangay)}&qrHash=${encodeURIComponent(targetBene.qrHash || 'qr-hash')}`;
            QRCode.toDataURL(qrPayloadString, {
              width: 320,
              margin: 2,
              color: { dark: '#022c22', light: '#ffffff' },
            }).then((url) => {
              setRegQrCodeDataUrl(url);
            });
          }
        } catch (e) {
          console.warn('Error reading saved beneficiary:', e);
        }
        return;
      }
    }

    // Default initial open view logic:
    setEmail('');
    setPassword('');
    setIsUnfolded(true);
    if (eventBroadcast) {
      setActiveView('event');
    } else {
      setActiveView('login');
    }
  }, [isOpen, eventBroadcast]);

  const handleAdminPortalClick = () => {
    setErrorMessage(null);
    setPendingNotice(null);
    if (activeView === 'login') {
      setActiveView('event');
      setIsUnfolded(true);
    } else {
      setActiveView('login');
      setIsUnfolded(true);
    }
    setTimeout(() => {
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

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
      try {
        localStorage.setItem('LD_LAST_REGISTERED_BENE', JSON.stringify(newBene));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      
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
    <div ref={modalScrollRef} className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-transparent font-sans text-slate-100 flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* NATIVE HTML5 HD 1080P SUNSET BACKGROUND VIDEO (CINEMATIC DINGALAN TWILIGHT) */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-transparent flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          aria-hidden="true"
          className="w-full h-full object-cover object-center filter contrast-[1.05] saturate-[1.12] brightness-[1.0] transform translate-z-0"
          style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }}
          src="/dingalan_sunset_background.mp4"
        >
          <source src="/dingalan_sunset_background.mp4" type="video/mp4" />
          <source src="/dingalan_tech_background.mp4" type="video/mp4" />
        </video>

        {/* Clear, natural ambient sunset glow - non-darkening */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION / STATUS BAR */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-14 xl:px-20 pt-4 sm:pt-6 pb-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/15 bg-slate-950/25 backdrop-blur-md">
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
          {/* Paalala & QR Code Button */}
          <button
            type="button"
            onClick={() => {
              setIsUnfolded(true);
              setActiveView('event');
              setTimeout(() => {
                modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
              }, 50);
            }}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 text-xs font-mono font-bold border px-4 py-2.5 sm:py-2 rounded-xl sm:rounded-full transition-all transform hover:scale-[1.01] sm:hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${
              isUnfolded && activeView === 'event'
                ? 'text-slate-950 bg-emerald-400 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.6)] font-extrabold'
                : 'text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900/90 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}
            title="Pindutin para makita ang Opisyal na Patnubay, Paalala at Event QR Code"
          >
            <Radio className="w-4 h-4 shrink-0 animate-pulse text-emerald-300" />
            <span className="tracking-wide">Paalala & QR Code</span>
          </button>

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

          {/* UPLOAD ATTENDANCE BUTTON (Automatic multi-picture upload / kahit ilang larawan) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenUploadAccomplishment) {
                onOpenUploadAccomplishment();
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 text-xs font-mono font-bold px-4 py-2.5 sm:py-2 rounded-full border border-cyan-400/90 bg-gradient-to-r from-teal-700/90 via-emerald-600/90 to-cyan-700/90 hover:from-teal-600 hover:to-cyan-600 text-white shadow-[0_0_22px_rgba(6,182,212,0.55)] transition-all transform hover:scale-[1.02] sm:hover:scale-105 active:scale-95 cursor-pointer"
            title="Pindutin para mag-upload ng Attendance Pictures (kahit ilang larawan / multiple photos)"
          >
            <Camera className="w-4 h-4 text-cyan-200 shrink-0" />
            <span className="tracking-wide font-extrabold uppercase">Upload Attendance</span>
            <Upload className="w-3.5 h-3.5 text-white shrink-0 ml-0.5" />
          </button>

          <div
            className="flex items-center space-x-2 text-xs font-mono text-emerald-300 bg-slate-900/90 border border-emerald-500/60 px-3.5 py-1.5 rounded-full shadow-[0_0_18px_rgba(16,185,129,0.35)] select-none shrink-0"
            title="Opisyal at Awtorisadong Oras sa Dingalan, Aurora (Philippine Standard Time UTC+8)"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
            <div className="flex items-center space-x-1.5 font-bold tracking-tight">
              <span className="text-emerald-300 font-extrabold">{clock.dayOfWeek}, {clock.month} {clock.dayNum}, {clock.year}</span>
              <span className="text-slate-500 font-mono">•</span>
              <span className="text-white font-mono">{clock.timeWithSeconds}</span>
            </div>
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
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-start lg:items-center">
          
          {/* --------------------------------------------------------------------- */}
          {/* LEFT SIDE: HERO TYPOGRAPHY & BRANDING (ORDER-2 ON MOBILE WHEN BUTTON OPENED) */}
          {/* --------------------------------------------------------------------- */}
          <div className={`lg:col-span-6 xl:col-span-6 text-left space-y-4 sm:space-y-6 w-full ${isUnfolded ? 'order-2 lg:order-1' : 'order-1'}`}>
            <div className="space-y-3">
              <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
                Linis Dingalan <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  EC Management
                </span>
              </h1>
              <p className="text-xs sm:text-base lg:text-lg text-slate-100 font-medium leading-relaxed max-w-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] text-justify">
                Innovation in Action Project of Municipal Environment and Natural Resources Office in Collaboration with Public Employment Service Office.
              </p>
              <div className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start space-x-2 px-3.5 py-2 rounded-xl sm:rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] sm:text-xs font-mono font-bold tracking-wide shadow-lg backdrop-blur-md text-center sm:text-left">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="leading-tight">PESO & MENRO INTEGRATED OPERATIONS PLATFORM</span>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-3xl bg-slate-950/45 hover:bg-slate-950/50 border border-slate-700/60 backdrop-blur-xl shadow-2xl space-y-3 max-w-xl transition-colors">
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans text-justify">
                Activity-based participants' inventory monitoring with photographic compliance and real-time GPS watermarking across 11 coastal and river Barangays with Offline First to Online Sync Feature.
              </p>
              <div className="flex items-center justify-between sm:justify-start space-x-4 pt-2 border-t border-slate-800 text-xs font-mono text-emerald-400">
                <span className="flex items-center space-x-2">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="font-semibold tracking-wide">11 Coastal Barangays Covered</span>
                </span>
              </div>
            </div>

            {/* Anonymous Citizen & Participant Reporting Box (Green Theme) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-950/50 hover:bg-slate-950/60 border border-emerald-500/40 backdrop-blur-xl shadow-xl space-y-2.5 max-w-xl transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-300 font-mono font-bold text-xs">
                  <EyeOff className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>KUMPIDENSIYAL NA MENSAHE SA ADMIN</span>
                </div>
                <span className="text-[10px] font-mono font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 uppercase">
                  100% Anonymous
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans text-justify">
                May nais iulat ukol sa gawain, basura, suhestiyon o katanungan? Pwedeng magpadala ng anonymous na mensahe. Ang Admin account lamang ang makakakita nito at hindi malalaman ng Admin ang inyong pangalan o pagkakakilanlan.
              </p>
              <button
                type="button"
                onClick={() => setIsAnonymousModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer hover:scale-[1.01] active:scale-95 border border-emerald-400/50"
              >
                <EyeOff className="w-4 h-4 text-emerald-200" />
                <span>Pindutin para Mag-send ng Anonymous Message</span>
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT SIDE: POP-UP LOGIN BOX / BROADCAST CARD                         */}
          {/* --------------------------------------------------------------------- */}
          <div className={`lg:col-span-6 xl:col-span-6 w-full max-w-xl xl:max-w-2xl mx-auto self-start ${isUnfolded ? 'order-1 lg:order-2 mb-2 lg:mb-0 block' : 'hidden'}`}>
            {isUnfolded && (
              activeView === 'event' && eventBroadcast ? (
                /* ========================================================================= */
                /* EVENT BROADCAST CARD: OFFICIAL PATNUBAY AT PAALALA NG ADMIN                */
                /* ========================================================================= */
                <div className="relative rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_50px_rgba(16,185,129,0.45),inset_0_0_25px_rgba(16,185,129,0.2)] bg-slate-950/55 hover:bg-slate-950/65 backdrop-blur-md p-5 sm:p-6 space-y-4 transition-all duration-500 hover:border-emerald-300 animate-scaleIn w-full">
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm truncate">
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate">Opisyal na Patnubay at Paalala ng Admin</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveView('login')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-mono font-bold transition-all cursor-pointer backdrop-blur-sm shadow-md hover:scale-105 active:scale-95"
                        title="Pumunta sa Admin Login Form"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        <span>Admin Login</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsUnfolded(false)}
                        className="p-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Itago / Isara"
                      >
                        <X className="w-4 h-4 text-slate-400 hover:text-emerald-400" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Location */}
                  <div className="space-y-1.5 text-left">
                    <h3 className="text-lg sm:text-2xl font-black text-white leading-tight drop-shadow-md">
                      {eventBroadcast.activityTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono">
                      <p className="text-emerald-300 font-semibold flex items-center gap-1.5 drop-shadow">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Brgy. {eventBroadcast.barangay} • {eventBroadcast.targetArea}</span>
                      </p>
                      <p className="text-cyan-300 font-medium flex items-center gap-1.5 drop-shadow">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{eventBroadcast.startTime} – {eventBroadcast.estimatedEndTime} ({eventBroadcast.totalHours})</span>
                      </p>
                    </div>
                  </div>

                  {/* Event QR Code Box & Attendance Upload */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-emerald-400/50 backdrop-blur-md shadow-lg flex flex-row items-center gap-3 sm:gap-4 animate-fadeIn">
                    <div className="p-1.5 bg-white rounded-xl shadow-md border-2 border-emerald-400/40 flex flex-col items-center shrink-0">
                      {eventQrUrl || eventBroadcast.qrDataUrl ? (
                        <img
                          src={eventQrUrl || eventBroadcast.qrDataUrl}
                          alt="Official Event Attendance QR Code"
                          className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                        />
                      ) : (
                        <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center bg-slate-100 rounded-lg">
                          <QrCode className="w-14 h-14 text-slate-800" />
                        </div>
                      )}
                      <span className="text-[8px] font-mono font-black text-slate-900 mt-0.5 uppercase tracking-tight">
                        SCAN ATTENDANCE
                      </span>
                    </div>

                    <div className="space-y-2 text-left flex-1 min-w-0">
                      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[10px] font-mono font-bold">
                        <QrCode className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>EVENT ATTENDANCE QR CODE</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-200 font-sans leading-snug">
                        I-scan gamit ang cellphone camera para mag-upload ng larawan at accomplishment attendance sa paglilinis.
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenUploadAccomplishment) {
                            onOpenUploadAccomplishment();
                          }
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-mono font-black text-xs flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.45)] transition-all cursor-pointer border border-emerald-300"
                      >
                        <Camera className="w-4 h-4 text-slate-950 shrink-0" />
                        <span className="uppercase font-extrabold">Upload Attendance Photo</span>
                        <Upload className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Specific Advisories Grid */}
                  <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs font-mono text-slate-300 text-left">
                    {eventBroadcast.requiredTools && (
                      <div className="flex items-start space-x-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Dapat Dalhing Kagamitan:</span>
                          <span className="text-white text-xs leading-relaxed block">{eventBroadcast.requiredTools}</span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.waterTumblerReminder && (
                      <div className="flex items-start space-x-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <Coffee className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Paalala sa Hydration / Tubig:</span>
                          <span className="text-white text-xs leading-relaxed block">{eventBroadcast.waterTumblerReminder}</span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.recommendedAttire && (
                      <div className="flex items-start space-x-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
                        <Shirt className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider mb-0.5">Dapat Kasuotan (Attire):</span>
                          <span className="text-white text-xs leading-relaxed block">{eventBroadcast.recommendedAttire}</span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.additionalNotes && (
                      <div className="p-2.5 rounded-xl bg-slate-950/40 border border-emerald-500/25 text-xs font-sans text-slate-200 italic leading-relaxed">
                        <strong className="text-emerald-300 not-italic font-semibold">Karagdagang Paalala ng LGU Admin:</strong> {eventBroadcast.additionalNotes}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 pt-2 text-right border-t border-white/10">
                    Ipinadala ni: <strong className="text-emerald-400">{eventBroadcast.sentByAdminName || 'Admin Officer'}</strong>
                  </div>
                </div>
              ) : (
                /* ULTRA-SMOOTH POP-UP GREEN DIAGONAL CARD (SEMI-TRANSPARENT FROSTED GLASS) */
                <div
                  className="relative rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_60px_rgba(16,185,129,0.5),inset_0_0_25px_rgba(16,185,129,0.2)] bg-slate-950/40 hover:bg-slate-950/45 backdrop-blur-md overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-all duration-700 ease-out transform scale-100 opacity-100 translate-y-0"
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

                  {/* LEFT SIDE FORM PANEL */}
                  <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5 relative z-10 animate-fadeIn">
                    {/* Top Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold w-fit">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>ADMIN PORTAL</span>
                      </div>

                      {eventBroadcast && (
                        <button
                          type="button"
                          onClick={() => setActiveView('event')}
                          className="text-[11px] font-mono text-emerald-300 hover:text-white flex items-center space-x-1 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Paalala & QR</span>
                        </button>
                      )}
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
                        <div className="flex items-center border-b-2 border-slate-400/60 hover:border-emerald-400 focus-within:border-emerald-300 transition-colors py-2">
                          <UserIcon className="w-5 h-5 text-emerald-300 mr-2.5 shrink-0" />
                          <input
                            type="text"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Username"
                            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: 'transparent' }}
                            className="w-full bg-transparent text-white placeholder-slate-300 text-base font-medium font-sans focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Underlined Password Field */}
                      <div className="space-y-1 text-left">
                        <div className="flex items-center border-b-2 border-slate-400/60 hover:border-emerald-400 focus-within:border-emerald-300 transition-colors py-2">
                          <Lock className="w-5 h-5 text-emerald-300 mr-2.5 shrink-0" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: 'transparent' }}
                            className="w-full bg-transparent text-white placeholder-slate-300 text-base font-medium font-sans focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer ml-2"
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

                      {eventBroadcast && (
                        <div className="pt-2 text-center border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setActiveView('event')}
                            className="w-full py-2 px-3 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Bumalik sa Paalala ng Admin & QR Code</span>
                          </button>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* RIGHT SIDE DIAGONAL GREEN PANEL (TRANSLUCENT FROSTED GLASS) */}
                  <div className="md:col-span-5 relative hidden md:flex flex-col justify-center items-center p-6 text-center text-white overflow-hidden min-h-[360px]">
                    {/* Diagonal Green Panel Background */}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-emerald-500/75 via-emerald-600/60 to-teal-900/65 backdrop-blur-sm shadow-[inset_0_0_30px_rgba(0,0,0,0.2)]"
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
                </div>
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

      {/* ========================================================================= */}
      {/* SEND ANONYMOUS MESSAGE MODAL (AVAILABLE PUBLICLY ON LOGIN PAGE)            */}
      {/* ========================================================================= */}
      {isAnonymousModalOpen && (
        <SendAnonymousMessageModal
          isOpen={isAnonymousModalOpen}
          onClose={() => setIsAnonymousModalOpen(false)}
          referencedActivityTitle={eventBroadcast?.activityTitle}
          referencedLocation={
            eventBroadcast
              ? `Brgy. ${eventBroadcast.barangay} • ${eventBroadcast.targetArea}`
              : undefined
          }
        />
      )}
    </div>
  );
};
