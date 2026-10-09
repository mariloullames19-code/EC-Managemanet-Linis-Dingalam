import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole, Beneficiary, EventQrBroadcast } from '../types';
import { api } from '../services/api';
import { INITIAL_EVENT_BROADCAST } from '../data/seedData';
import QRCode from 'qrcode';
import { checkEventCutoff } from '../utils/watermarkEngine';
import { useDingalanClock, getDingalanNow, checkIsBroadcastActive } from '../utils/philippineClock';
import { generateStyledLguQrDataUrl } from '../utils/qrPassGenerator';
import { SendAnonymousMessageModal } from './SendAnonymousMessageModal';
import dingalanBgImg from '../assets/images/dingalan_lighthouse_natural_drone_1791512687510.jpg';
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
  activities: propActivities = [],
  eventBroadcast: propEventBroadcast,
}) => {
  const clock = useDingalanClock();
  const phTime = clock.time;
  const [isUnfolded, setIsUnfolded] = useState<boolean>(true);
  const [isBroadcastHidden, setIsBroadcastHidden] = useState<boolean>(false);
  const [isAnonymousModalOpen, setIsAnonymousModalOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Switchable Active View: Defaults to 'event' (Paalala at Patnubay Box automatic na bubungad sa initial load)
  const [activeView, setActiveView] = useState<'login' | 'event' | 'overview'>('event');

  // On computer/desktop screens (>= 1024px), ensure activeView stays on 'event' or 'login'
  // because the Mensahe button is hidden on computer and the system overview is already visible on the left
  useEffect(() => {
    const handleCheckDesktop = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        if (activeView === 'overview') {
          setActiveView('event');
        }
      }
    };
    handleCheckDesktop();
    window.addEventListener('resize', handleCheckDesktop);
    return () => window.removeEventListener('resize', handleCheckDesktop);
  }, [activeView]);

  // Fallback state for activities if not passed in props
  const [localActivities, setLocalActivities] = useState<any[]>(propActivities);
  const allActivities = propActivities && propActivities.length > 0 ? propActivities : localActivities;

  // Most recent completed/past activity or broadcast for the Advisory display
  const lastCompletedEvent = useMemo(() => {
    const acts = Array.isArray(allActivities) && allActivities.length > 0 ? allActivities : [];
    if (acts.length > 0) {
      const sorted = [...acts].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      if (sorted[0]) return sorted[0];
    }
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('ld_event_broadcasts_v1');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const b = list[0];
            return {
              title: b.activityTitle || b.title,
              date: b.eventDate || b.date,
              barangay: b.barangay,
            };
          }
        }
      }
    } catch {}
    return null;
  }, [allActivities]);

  // Filter strictly scheduled and ongoing activities from the Programs list (excluding completed/cancelled)
  const scheduledActivities = useMemo(() => {
    return (allActivities || []).filter((act) => act.status === 'scheduled' || act.status === 'ongoing');
  }, [allActivities]);

  useEffect(() => {
    if (propActivities && propActivities.length > 0) {
      setLocalActivities(propActivities);
    } else {
      api.getActivities().then((res) => {
        if (res && res.activities && res.activities.length > 0) {
          setLocalActivities(res.activities);
        }
      }).catch(() => {});
    }
  }, [propActivities]);

  // Selected scheduled activity id (if user chooses to view a specific scheduled program)
  const [selectedScheduledActivityId, setSelectedScheduledActivityId] = useState<string | null>(null);

  // Helper to parse activity schedule in Dingalan PST
  const parseActivitySchedule = (act: any) => {
    try {
      const isCurrentlyActive = checkIsBroadcastActive(convertActivityToBroadcast(act));
      return {
        startUtcMs: 0,
        endUtcMs: 0,
        hasArrived: true,
        isCurrentlyActive,
        isPastEnd: !isCurrentlyActive,
        datePart: act?.date || '',
        timePart: act?.callTime || '',
      };
    } catch {
      return {
        startUtcMs: 0,
        endUtcMs: 0,
        hasArrived: false,
        isCurrentlyActive: false,
        isPastEnd: true,
        datePart: act?.date || '',
        timePart: act?.callTime || '',
      };
    }
  };

  // Convert an Activity to a full EventQrBroadcast object with complete reminders
  const convertActivityToBroadcast = (act: any): EventQrBroadcast => {
    const formattedCallTime = act.callTime
      ? (act.callTime.includes('AM') || act.callTime.includes('PM') ? act.callTime : `${act.callTime} AM`)
      : '06:00 AM';

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://linis-dingalan.aurora.gov.ph';
    const payload = `${origin}/?action=upload&act_id=${act.id}&brgy=${encodeURIComponent(act.barangay || 'Paltic')}&date=${encodeURIComponent(act.date || '')}`;

    return {
      id: `bc-auto-${act.id}`,
      activityId: act.id,
      activityTitle: act.title,
      targetArea: act.targetArea || 'Dingalan Feeder Port & Rock Wall',
      barangay: act.barangay || 'Paltic',
      qrPayload: payload,
      eventDate: act.date || new Date().toISOString().split('T')[0],
      startTime: formattedCallTime,
      estimatedEndTime: act.estimatedEndTime || (formattedCallTime.includes('PM') ? '05:00 PM' : '11:00 AM'),
      totalHours: '4 Oras (4 Hours)',
      requiredTools: act.requiredTools || 'Guwantes (Gloves), Sako para sa Basura, Walis Tingting, Pandakot at Tongs / Pang-ipit',
      waterTumblerReminder: act.waterReminder || 'Magdala ng sariling reusable tumbler na may inuming tubig. Mahigpit na ipinagbabawal ang single-use plastic bottles alinsunod sa Dingalan MENRO Ordinance.',
      recommendedAttire: act.recommendedAttire || 'Boots o Rubber Shoes, Sumbrero / Cap laban sa araw, at MENRO/PESO Reflectorized Vest o komportableng damit pansaka.',
      additionalNotes: act.description || `Opisyal na itinakdang gawain para sa ${act.title} sa ${act.targetArea || 'Dingalan'}. Mag-scan ng QR code at mag-upload ng patunay na larawan bago matapos ang oras.`,
      sentAt: new Date().toISOString(),
      sentByAdminName: act.supervisorName || 'Admin Officer (Operations Administrator)',
    };
  };

  // Dedicated active broadcast state, initialized synchronously from prop, localStorage, or seed fallback
  const [activeBroadcast, setActiveBroadcast] = useState<EventQrBroadcast | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('ld_broadcasts_cleared') === 'true') {
      return null;
    }
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

  // Track the last activated activity ID to avoid unnecessary state thrashing
  const lastActiveActivityIdRef = useRef<string | null>(null);

  // Automatic Schedule Arrival Engine:
  // Updates broadcast data when scheduled activity arrives WITHOUT disrupting active login view
  useEffect(() => {
    if (!scheduledActivities || scheduledActivities.length === 0) return;

    // Check if user manually clicked a specific scheduled activity
    if (selectedScheduledActivityId) {
      const found = scheduledActivities.find((a) => a.id === selectedScheduledActivityId);
      if (found && found.id !== lastActiveActivityIdRef.current) {
        lastActiveActivityIdRef.current = found.id;
        if (typeof window !== 'undefined') localStorage.removeItem('ld_broadcasts_cleared');
        setActiveBroadcast(convertActivityToBroadcast(found));
      }
      return;
    }

    // Otherwise, find the activity whose scheduled date & time has arrived right now
    const arrivedActiveActivities = scheduledActivities.filter((act) => {
      const schedule = parseActivitySchedule(act);
      return (schedule.hasArrived && !schedule.isPastEnd) || act.status === 'ongoing';
    });

    if (arrivedActiveActivities.length > 0) {
      const currentActive = arrivedActiveActivities[0];
      if (currentActive.id !== lastActiveActivityIdRef.current) {
        lastActiveActivityIdRef.current = currentActive.id;
        if (typeof window !== 'undefined') localStorage.removeItem('ld_broadcasts_cleared');
        setActiveBroadcast(convertActivityToBroadcast(currentActive));
      }
      return;
    }

    // Fallback: Check if there is an upcoming scheduled activity for today (only if not explicitly cleared by admin)
    const isCleared = typeof window !== 'undefined' && localStorage.getItem('ld_broadcasts_cleared') === 'true';
    if (!isCleared) {
      const upcomingTodayActivities = scheduledActivities.filter((act) => {
        const schedule = parseActivitySchedule(act);
        return !schedule.isPastEnd;
      });

      if (upcomingTodayActivities.length > 0 && !activeBroadcast) {
        lastActiveActivityIdRef.current = upcomingTodayActivities[0].id;
        setActiveBroadcast(convertActivityToBroadcast(upcomingTodayActivities[0]));
      }
    }
  }, [scheduledActivities, selectedScheduledActivityId]);

  const isBroadcastCleared = typeof window !== 'undefined' && localStorage.getItem('ld_broadcasts_cleared') === 'true';
  const rawBroadcast = isBroadcastCleared ? null : (activeBroadcast || propEventBroadcast);
  const eventBroadcast = (rawBroadcast && checkIsBroadcastActive(rawBroadcast)) ? rawBroadcast : null;

  // Real-time ticker: automatically clears active broadcast as soon as PST time passes estimatedEndTime
  useEffect(() => {
    const checkExpiration = () => {
      if (activeBroadcast && !checkIsBroadcastActive(activeBroadcast)) {
        setActiveBroadcast(null);
        setSelectedScheduledActivityId(null);
      }
    };
    checkExpiration();
    const interval = setInterval(checkExpiration, 1000);
    return () => clearInterval(interval);
  }, [activeBroadcast]);

  // Keep activeBroadcast synchronized with prop changes
  useEffect(() => {
    if (propEventBroadcast && propEventBroadcast.id) {
      setActiveBroadcast(propEventBroadcast);
    } else if (propEventBroadcast === null) {
      setActiveBroadcast(null);
      setSelectedScheduledActivityId(null);
    }
  }, [propEventBroadcast]);

  // Real-time synchronization: listen to broadcast changes across all tabs and windows
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ld_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_BROADCAST' && event.data.broadcast) {
          if (typeof window !== 'undefined') localStorage.removeItem('ld_broadcasts_cleared');
          setActiveBroadcast(event.data.broadcast);
          setIsUnfolded(true);
          setActiveView('event');
        } else if (event.data?.type === 'CLEAR_BROADCASTS') {
          setActiveBroadcast(null);
          setSelectedScheduledActivityId(null);
        }
      };
      return () => bc.close();
    }
  }, []);

  // Background fetch to ensure fresh broadcast is loaded if state is null and not cleared
  useEffect(() => {
    const isCleared = typeof window !== 'undefined' && localStorage.getItem('ld_broadcasts_cleared') === 'true';
    if (!activeBroadcast && !isCleared) {
      api.getLatestEventBroadcast().then((bc) => {
        if (bc && bc.id) {
          setActiveBroadcast(bc);
        }
      }).catch(() => {});
    }
  }, [activeBroadcast]);

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

    generateStyledLguQrDataUrl(payload, {
      width: 480,
      title: 'LINIS DINGALAN',
      includeCenterBadge: true,
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

  // Full 1080p HD Cyber Dingalan Lighthouse Background Video controller & guaranteed autoplay
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen]);

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
            generateStyledLguQrDataUrl(qrPayloadString, { width: 320 }).then((url) => {
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
  }, [isOpen]);

  const handleAdminPortalClick = () => {
    setErrorMessage(null);
    setPendingNotice(null);
    setActiveView('login');
    setIsUnfolded(true);
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

  // Direct One-Tap Login Handler for Quick Admin Access buttons
  const handleDirectLogin = (directEmail: string, directPass: string) => {
    setErrorMessage(null);
    setPendingNotice(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const lower = directEmail.toLowerCase();
      if (lower === 'superadmin') {
        onLogin('superadmin');
        return;
      }
      if (lower === 'admin') {
        onLogin('admin');
        return;
      }
      const authRes = api.authenticate(directEmail, directPass);
      if (authRes.success && authRes.user) {
        onLogin(authRes.user);
      }
    }, 200);
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

      const qrUrl = await generateStyledLguQrDataUrl(qrPayloadString, { width: 320 });

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
    <div
      ref={modalScrollRef}
      className="fixed inset-0 z-50 w-screen h-screen max-h-screen overflow-hidden bg-transparent font-sans text-slate-100 flex flex-col justify-between"
    >
      {/* ========================================================================= */}
      {/* STATIC HIGH-RESOLUTION DINGALAN LIGHTHOUSE BACKGROUND IMAGE (NO VIDEO)     */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-slate-950 flex items-center justify-center">
        <img
          src={dingalanBgImg}
          alt="Dingalan Background"
          className="absolute inset-0 w-full h-full object-cover object-center filter contrast-[1.08] saturate-[1.2] brightness-[1.02]"
          style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }}
        />

        {/* Ambient overlay - cinematic clarity with legible contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/30 pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION / STATUS BAR (COMPACT TO PREVENT SCREEN OVERFLOW)           */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full px-3 sm:px-6 lg:px-10 xl:px-14 py-2 sm:py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 border-b border-white/15 bg-slate-950/35 backdrop-blur-md shrink-0">
        {/* Official eC access Logo & National Branding */}
        <div className="flex items-center justify-between sm:justify-start space-x-3 sm:space-x-4 w-full sm:w-auto">
          <div className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0">
            <svg
              viewBox="0 0 205 64"
              className="h-8 sm:h-10 lg:h-11 w-auto drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]"
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

            <div className="h-6 sm:h-8 w-px bg-slate-700/80 hidden sm:block" />

            <div className="text-left space-y-0">
              <span className="text-[8px] sm:text-[9px] lg:text-[10px] font-mono font-extrabold text-emerald-400 tracking-wider uppercase block leading-tight">
                REPUBLIC OF THE PHILIPPINES
              </span>
              <h1 className="text-xs sm:text-sm lg:text-base font-black text-white tracking-tight leading-tight drop-shadow">
                Municipality of Dingalan, Aurora
              </h1>
              {/* Mobile Live Clock Pill */}
              <div className="flex sm:hidden items-center space-x-1.5 text-[10px] font-mono text-emerald-300 pt-0.5 select-none">
                <Clock className="w-3 h-3 text-emerald-400 shrink-0 animate-pulse" />
                <span className="font-bold">{clock.dayOfWeek}, {clock.month} {clock.dayNum} • {clock.timeWithSeconds}</span>
              </div>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Isara o Pumunta sa System Overview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Unified Fit-To-Screen Tab Bar with Animated Spring Indicator */}
          <div className="grid grid-cols-4 sm:flex sm:items-center lg:flex lg:items-center gap-1 p-1 rounded-xl sm:rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md w-full sm:w-auto relative select-none">
            {/* Notice & QR Code Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                setIsUnfolded(true);
                setActiveView('event');
                setTimeout(() => {
                  modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }, 50);
              }}
              className={`relative flex items-center justify-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl transition-colors duration-200 cursor-pointer shadow-sm ${
                isUnfolded && activeView === 'event'
                  ? 'text-slate-950 font-black'
                  : 'text-emerald-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Click to view Official Admin Guidelines, Advisory & Event QR Code"
            >
              {isUnfolded && activeView === 'event' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-lg sm:rounded-xl fluid-btn-emerald border border-emerald-300"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center space-x-1 sm:space-x-1.5">
                <Radio className={`w-3.5 h-3.5 shrink-0 ${isUnfolded && activeView === 'event' ? 'text-slate-950 animate-pulse' : 'text-emerald-300'}`} />
                <span className="truncate hidden xs:inline">Advisory & QR</span>
                <span className="truncate xs:hidden">Advisory</span>
              </span>
            </motion.button>

            {/* Admin Login Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleAdminPortalClick}
              className={`relative flex items-center justify-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl transition-colors duration-200 cursor-pointer shadow-sm ${
                isUnfolded && activeView === 'login'
                  ? 'text-slate-950 font-black'
                  : 'text-white hover:bg-slate-800/60'
              }`}
              title="Pindutin para lumabas ang Admin Login Portal"
            >
              {isUnfolded && activeView === 'login' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-lg sm:rounded-xl bg-white border border-white shadow-[0_0_16px_rgba(255,255,255,0.45)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center space-x-1 sm:space-x-1.5">
                <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isUnfolded && activeView === 'login' ? 'text-slate-950' : 'text-slate-200'}`} />
                <span className="truncate hidden xs:inline">Admin Login</span>
                <span className="truncate xs:hidden">Admin</span>
              </span>
            </motion.button>

            {/* System Overview / Mensahe Button (SHOWN ON MOBILE/TABLET ONLY, HIDDEN ON COMPUTER) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => {
                setIsUnfolded(true);
                setActiveView('overview');
                setTimeout(() => {
                  modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                }, 50);
              }}
              className={`relative flex lg:hidden items-center justify-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs font-mono font-bold px-1.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl transition-colors duration-200 cursor-pointer shadow-sm ${
                isUnfolded && activeView === 'overview'
                  ? 'text-slate-950 font-black'
                  : 'text-teal-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title="Tingnan ang System Overview at Magpadala ng Mensahe"
            >
              {isUnfolded && activeView === 'overview' && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 rounded-lg sm:rounded-xl bg-teal-400 border border-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.55)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center space-x-1 sm:space-x-1.5">
                <EyeOff className={`w-3.5 h-3.5 shrink-0 ${isUnfolded && activeView === 'overview' ? 'text-slate-950' : 'text-teal-300'}`} />
                <span className="truncate hidden xs:inline">Mensahe & Info</span>
                <span className="truncate xs:hidden">Mensahe</span>
              </span>
            </motion.button>

            {/* Upload Attendance Button with Fluid Color Flow */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => {
                if (onOpenUploadAccomplishment) {
                  onOpenUploadAccomplishment();
                }
              }}
              className="relative flex items-center justify-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs font-mono font-bold px-2 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl fluid-btn-emerald text-slate-950 shadow transition-all cursor-pointer overflow-hidden group select-none border border-emerald-300/60"
              title="Pindutin para mag-upload ng Attendance Pictures"
            >
              <span className="relative z-10 flex items-center space-x-1 sm:space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-950 shrink-0 group-hover:rotate-12 transition-transform duration-300" />
                <span className="truncate uppercase font-black text-slate-950">Upload</span>
              </span>
            </motion.button>
          </div>

          <div
            className="hidden sm:flex items-center space-x-2 text-[11px] lg:text-xs font-mono text-emerald-300 bg-slate-900/90 border border-emerald-500/60 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] select-none shrink-0"
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
              className="hidden sm:flex p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Isara o Pumunta sa System Overview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CENTER HERO CONTAINER (FITS 100% INTO WHOLE SCREEN MOBILE & DESKTOP) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-[1750px] mx-auto px-2 xs:px-3 sm:px-6 lg:px-10 xl:px-14 flex-1 min-h-0 flex items-center justify-center overflow-y-auto lg:overflow-hidden my-auto py-0.5 sm:py-2">
        <div className="w-full flex flex-col lg:grid lg:grid-cols-12 gap-2 sm:gap-5 lg:gap-6 xl:gap-8 items-center justify-center">
          
          {/* --------------------------------------------------------------------- */}
          {/* LEFT SIDE: HERO TYPOGRAPHY & BRANDING (SHOWN ON DESKTOP & OVERVIEW VIEW) */}
          {/* --------------------------------------------------------------------- */}
          <div className={`lg:col-span-6 xl:col-span-6 text-left space-y-2 sm:space-y-3 w-full ${activeView === 'overview' ? 'block' : 'hidden lg:block'}`}>
            <div className="space-y-1.5 sm:space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.1] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                Linis Dingalan <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  EC Management
                </span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-sm text-slate-100 font-medium leading-relaxed max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] text-left">
                Innovation in Action Project of Municipal Environment and Natural Resources Office in Collaboration with Public Employment Service Office.
              </p>
              <div className="w-full sm:w-auto inline-flex items-center justify-center sm:justify-start space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] sm:text-[10px] lg:text-[11px] font-mono font-bold tracking-wide shadow-md backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="leading-tight">PESO & MENRO INTEGRATED OPERATIONS PLATFORM</span>
              </div>
            </div>

            {/* Feature Card */}
            <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-2xl bg-slate-950/50 hover:bg-slate-950/60 border border-slate-700/60 backdrop-blur-xl shadow-xl space-y-1.5 max-w-xl transition-colors">
              <p className="text-[11px] sm:text-xs text-slate-200 leading-relaxed font-sans text-left">
                Activity-based participants' inventory monitoring with photographic compliance and real-time GPS watermarking across 11 coastal and river Barangays with Offline First to Online Sync Feature.
              </p>
              <div className="flex items-center justify-between sm:justify-start space-x-4 pt-1.5 border-t border-slate-800 text-[11px] font-mono text-emerald-400">
                <span className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span className="font-semibold tracking-wide">11 Coastal Barangays Covered</span>
                </span>
              </div>
            </div>

            {/* Anonymous Citizen & Participant Reporting Box */}
            <div className="p-2.5 sm:p-3 lg:p-3.5 rounded-2xl bg-slate-950/55 hover:bg-slate-950/65 border border-emerald-500/40 backdrop-blur-xl shadow-xl space-y-1.5 max-w-xl transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-emerald-300 font-mono font-bold text-[11px] sm:text-xs">
                  <EyeOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>CONFIDENTIAL MESSAGE TO ADMIN</span>
                </div>
                <span className="text-[8.5px] sm:text-[9.5px] font-mono font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 uppercase">
                  100% Anonymous
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-snug font-sans text-left">
                Want to report about work, waste, suggestions or inquiries? You can send an anonymous message. Only the Admin account can view this and your identity remains confidential.
              </p>
              <button
                type="button"
                onClick={() => setIsAnonymousModalOpen(true)}
                className="w-full py-2.5 px-3 rounded-xl fluid-btn-emerald text-slate-950 font-mono font-black text-[11px] sm:text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer hover:scale-[1.01] active:scale-95 border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-950" />
                <span>Send Anonymous Message</span>
              </button>
            </div>

            {/* Mobile quick switcher to Admin Login if in Overview mode */}
            <div className="flex sm:hidden items-center justify-between pt-1 px-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setActiveView('login')}
                className="text-white hover:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Go to Admin Login</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('event')}
                className="text-emerald-300 hover:text-white font-bold underline flex items-center gap-1 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>View Advisory</span>
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* RIGHT SIDE: POP-UP LOGIN BOX / BROADCAST CARD (FITS WHOLE SCREEN)     */}
          {/* --------------------------------------------------------------------- */}
          <div className={`lg:col-span-6 xl:col-span-6 w-full max-w-full lg:max-w-xl xl:max-w-2xl mx-auto self-center ${activeView === 'overview' ? 'hidden lg:block' : 'block'}`}>
            <AnimatePresence mode="wait">
              {isUnfolded && (
                <motion.div
                  key={activeView === 'login' ? 'login' : 'event'}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full"
                >
                  {(activeView === 'event' || activeView === 'overview') && eventBroadcast ? (
                /* ========================================================================= */
                /* EVENT BROADCAST CARD: FITS 100% ON MOBILE AND DESKTOP WITHOUT CUTOFFS     */
                /* ========================================================================= */
                <div className="relative rounded-2xl lg:rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.35),inset_0_0_15px_rgba(16,185,129,0.15)] bg-slate-950/85 hover:bg-slate-950/90 backdrop-blur-md p-2.5 xs:p-3 sm:p-4 lg:p-4 xl:p-5 space-y-1.5 sm:space-y-2.5 transition-all duration-300 hover:border-emerald-300 animate-scaleIn w-full">
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5 gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="px-2 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1 backdrop-blur-sm truncate">
                        <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
                        <span className="truncate">Admin Guidelines & Advisory</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[9px] font-mono text-emerald-300 font-bold hidden xs:inline">
                        {eventBroadcast.startTime} PST
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsUnfolded(false)}
                        className="p-1 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Close Notice"
                      >
                        <X className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-400" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Location */}
                  <div className="space-y-0.5 text-left">
                    <h3 className="text-xs xs:text-sm sm:text-base lg:text-lg xl:text-xl font-black text-white leading-tight drop-shadow-md">
                      {eventBroadcast.activityTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] sm:text-xs font-mono">
                      <p className="text-emerald-300 font-semibold flex items-center gap-1 drop-shadow">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">Brgy. {eventBroadcast.barangay} • {eventBroadcast.targetArea}</span>
                      </p>
                      <p className="text-cyan-300 font-medium flex items-center gap-1 drop-shadow">
                        <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{eventBroadcast.startTime} – {eventBroadcast.estimatedEndTime} ({eventBroadcast.totalHours})</span>
                      </p>
                    </div>
                  </div>

                  {/* Event QR Code Box & Attendance Upload */}
                  <div className="p-1.5 sm:p-2.5 rounded-xl bg-slate-950/70 border border-emerald-400/50 backdrop-blur-md shadow-md flex flex-row items-center gap-2 sm:gap-3.5 animate-fadeIn">
                    <div className="p-1 bg-white rounded-lg shadow-sm border border-emerald-400/40 flex flex-col items-center shrink-0">
                      {eventQrUrl || eventBroadcast.qrDataUrl ? (
                        <div className="relative inline-flex items-center justify-center">
                          <img
                            src={eventQrUrl || eventBroadcast.qrDataUrl}
                            alt="Official Event Attendance QR Code"
                            className="w-14 h-14 sm:w-20 sm:h-20 lg:w-22 lg:h-22 object-contain"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                            <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-white p-0.5 border border-emerald-600 shadow-sm flex items-center justify-center">
                              <div className="w-full h-full rounded-full bg-[#022c22] flex flex-col items-center justify-center text-center p-0.2 border border-amber-400">
                                <span className="text-[3.5px] sm:text-[5.5px] font-black text-emerald-300 leading-none">LGU</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-14 h-14 sm:w-20 sm:h-20 flex items-center justify-center bg-slate-100 rounded-md">
                          <QrCode className="w-10 h-10 text-slate-800" />
                        </div>
                      )}
                      <span className="text-[6.5px] sm:text-[7.5px] font-mono font-black text-slate-900 mt-0.5 uppercase tracking-tight">
                        SCAN ATTENDANCE
                      </span>
                    </div>

                    <div className="space-y-1 text-left flex-1 min-w-0 w-full">
                      <div className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[7.5px] sm:text-[9.5px] font-mono font-bold">
                        <QrCode className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                        <span>EVENT ATTENDANCE QR CODE</span>
                      </div>
                      <p className="text-[9px] sm:text-[11px] text-slate-200 font-sans leading-tight">
                        I-scan sa mobile camera o i-tap para mag-upload ng attendance:
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenUploadAccomplishment) {
                            onOpenUploadAccomplishment();
                          }
                        }}
                        className="w-full py-2 px-3 rounded-lg sm:rounded-xl fluid-btn-emerald text-slate-950 font-mono font-black text-[10px] sm:text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-emerald-300 active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                      >
                        <Camera className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                        <span className="uppercase font-black truncate tracking-wide">Upload Attendance Photo</span>
                        <Upload className="w-3 h-3 text-slate-950 shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* 3-Column Compact Reminder Grid (3 columns on both Mobile and Desktop to NEVER overflow vertically) */}
                  <div className="grid grid-cols-3 gap-1 sm:gap-1.5 text-[9.5px] sm:text-[11px] font-mono text-slate-300 text-left">
                    {eventBroadcast.requiredTools && (
                      <div className="bg-slate-950/60 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-white/10 backdrop-blur-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-1 text-slate-400 font-bold text-[7.5px] sm:text-[8.5px] uppercase tracking-wider mb-0.5">
                            <Wrench className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">Tools:</span>
                          </div>
                          <span className="text-white text-[8.5px] sm:text-[10.5px] leading-tight block line-clamp-3 hover:line-clamp-none">
                            {eventBroadcast.requiredTools}
                          </span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.waterTumblerReminder && (
                      <div className="bg-slate-950/60 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-white/10 backdrop-blur-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-1 text-slate-400 font-bold text-[7.5px] sm:text-[8.5px] uppercase tracking-wider mb-0.5">
                            <Coffee className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400 shrink-0" />
                            <span className="truncate">Hydration:</span>
                          </div>
                          <span className="text-white text-[8.5px] sm:text-[10.5px] leading-tight block line-clamp-3 hover:line-clamp-none">
                            {eventBroadcast.waterTumblerReminder}
                          </span>
                        </div>
                      </div>
                    )}

                    {eventBroadcast.recommendedAttire && (
                      <div className="bg-slate-950/60 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-white/10 backdrop-blur-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-1 text-slate-400 font-bold text-[7.5px] sm:text-[8.5px] uppercase tracking-wider mb-0.5">
                            <Shirt className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-400 shrink-0" />
                            <span className="truncate">Attire:</span>
                          </div>
                          <span className="text-white text-[8.5px] sm:text-[10.5px] leading-tight block line-clamp-3 hover:line-clamp-none">
                            {eventBroadcast.recommendedAttire}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional LGU Admin Notes */}
                  {eventBroadcast.additionalNotes && (
                    <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-950/45 border border-emerald-500/25 text-[9.5px] sm:text-[11px] font-sans text-slate-200 leading-snug text-left">
                      <strong className="text-emerald-300 font-semibold">Admin Notes:</strong> {eventBroadcast.additionalNotes}
                    </div>
                  )}

                  {/* Bottom Author Row */}
                  <div className="text-[8.5px] sm:text-[10px] font-mono text-slate-400 pt-1 text-right border-t border-white/10 flex items-center justify-between">
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{eventTimeLeft.formatted} remaining</span>
                    </span>
                    <span className="truncate">
                      Broadcasted by: <strong className="text-emerald-400">{eventBroadcast.sentByAdminName || 'Admin Officer'}</strong>
                    </span>
                  </div>
                </div>
              ) : activeView === 'event' ? (
                /* ========================================================================= */
                /* NO ACTIVE SCHEDULE: COMPACT PROFESSIONAL ADVISORY CARD                   */
                /* ========================================================================= */
                <div className="relative rounded-2xl lg:rounded-3xl border-2 border-slate-700/80 shadow-[0_0_40px_rgba(0,0,0,0.7),inset_0_0_20px_rgba(16,185,129,0.1)] bg-slate-950/80 hover:bg-slate-950/85 backdrop-blur-md p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 transition-all duration-300 hover:border-slate-600 animate-scaleIn w-full text-left">
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm truncate">
                        <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">Public Advisory • PESO & MENRO Operations</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsUnfolded(false)}
                        className="p-1 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Close Notice"
                      >
                        <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Official Notice Header */}
                  <div className="space-y-1 text-left">
                    <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[9px] font-mono font-bold text-slate-400">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>OFFICIAL STATUS: NO SCHEDULE RECORDED FOR TODAY</span>
                    </div>
                    <h3 className="text-sm sm:text-lg lg:text-xl font-black text-white leading-tight drop-shadow-md">
                      No Official Work Program Scheduled for Today
                    </h3>
                    <p className="text-[11px] sm:text-xs font-mono text-emerald-300 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Municipality of Dingalan, Aurora • Environmental Compliance Platform</span>
                    </p>
                  </div>

                  {/* Professional Notice Statement Box */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] sm:text-xs font-sans space-y-1.5 text-slate-200 leading-relaxed shadow-inner">
                    <p>
                      Please be advised that <strong>there are currently no active field operations, coastal cleanup drives, or official environmental compliance activities scheduled for today</strong>.
                    </p>
                    <p className="text-[10.5px] sm:text-[11px] text-slate-400 leading-snug">
                      All verified beneficiaries, field supervisors, and participating workers will automatically receive the official event QR code and operational guidelines here as soon as a new schedule is broadcasted by the PESO & MENRO Operations Administrator.
                    </p>
                  </div>

                  {/* Most Recent Program / Last Event Date Box */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-[11px] font-mono space-y-1 text-left shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                        Most Recent Program / Last Event Date:
                      </span>
                      <span className="text-[8.5px] text-slate-400 font-mono font-semibold bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-700">
                        Completed Record
                      </span>
                    </div>
                    <div className="text-white font-bold text-xs">
                      {lastCompletedEvent ? (
                        <span>
                          {lastCompletedEvent.title} — <span className="text-emerald-300 font-mono">{lastCompletedEvent.date}</span> (Brgy. {lastCompletedEvent.barangay})
                        </span>
                      ) : (
                        <span>
                          Dingalan Coastal Cleanliness & Environmental Compliance Operation — <span className="text-emerald-300 font-mono">October 06, 2026</span> (Brgy. Paltic)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Assistance & Office Hours Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] font-mono text-slate-300">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 space-y-0.5">
                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Office Operations:</span>
                      <span className="text-white text-[10.5px]">Monday to Friday: 8:00 AM – 5:00 PM PST</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 space-y-0.5">
                      <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider block">Operations Center:</span>
                      <span className="text-white text-[10.5px]">Barangay Poblacion, Dingalan, Aurora</span>
                    </div>
                  </div>

                  {/* Live Monitoring Badge */}
                  <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[9.5px] sm:text-[10px] font-mono text-slate-400">
                    <div className="flex items-center space-x-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live Scheduler Active • Automatically updates when a schedule is posted</span>
                    </div>
                    <span className="text-slate-500">Dingalan LGU</span>
                  </div>
                </div>
              ) : (
                /* ULTRA-SMOOTH POP-UP GREEN DIAGONAL CARD (SEMI-TRANSPARENT FROSTED GLASS) */
                <div
                  className="relative rounded-2xl lg:rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_50px_rgba(16,185,129,0.4),inset_0_0_20px_rgba(16,185,129,0.15)] bg-slate-950/50 hover:bg-slate-950/55 backdrop-blur-md overflow-hidden grid grid-cols-1 md:grid-cols-12 transition-all duration-500 ease-out transform scale-100 opacity-100 translate-y-0"
                  style={{
                    perspective: '1200px',
                    transformStyle: 'preserve-3d',
                    animation: 'smoothPopup 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  }}
                >
                  {/* Pop-Up Close Icon (X) on Top Right */}
                  <button
                    type="button"
                    onClick={() => setIsUnfolded(false)}
                    className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-slate-900/60 hover:bg-emerald-950/80 border border-emerald-500/50 text-slate-300 hover:text-white transition-all cursor-pointer shadow-md hover:scale-105 backdrop-blur-sm"
                    title="Isara ang Login Box"
                  >
                    <X className="w-4 h-4 text-emerald-400" />
                  </button>

                  {/* LEFT SIDE FORM PANEL */}
                  <div className="md:col-span-7 p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between space-y-3 sm:space-y-4 relative z-10 animate-fadeIn">
                    {/* Top Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10.5px] sm:text-xs font-mono font-bold w-fit">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ADMIN PORTAL</span>
                      </div>
                    </div>

                    {/* Error Banner */}
                    {errorMessage && (
                      <div className="p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-semibold flex items-start space-x-2 animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Pending Notice Banner */}
                    {pendingNotice && (
                      <div className="p-2.5 rounded-xl bg-amber-950/90 border border-amber-500/60 text-amber-200 text-xs space-y-1 animate-fadeIn">
                        <div className="flex items-center space-x-1.5 font-bold text-amber-300 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>ACCOUNT PENDING</span>
                        </div>
                        <p className="leading-tight text-[11px]">{pendingNotice}</p>
                      </div>
                    )}

                    {/* Form Heading */}
                    <div className="text-left space-y-0.5">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                        Login
                      </h2>
                    </div>

                    {/* Form Fields */}
                    <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
                      {/* Underlined Username/Email Field */}
                      <div className="space-y-0.5 text-left">
                        <div className="flex items-center border-b-2 border-slate-400/60 hover:border-emerald-400 focus-within:border-emerald-300 transition-colors py-1.5">
                          <UserIcon className="w-4 h-4 text-emerald-300 mr-2 shrink-0" />
                          <input
                            type="text"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Username"
                            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: 'transparent' }}
                            className="w-full bg-transparent text-white placeholder-slate-300 text-sm font-medium font-sans focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Underlined Password Field */}
                      <div className="space-y-0.5 text-left">
                        <div className="flex items-center border-b-2 border-slate-400/60 hover:border-emerald-400 focus-within:border-emerald-300 transition-colors py-1.5">
                          <Lock className="w-4 h-4 text-emerald-300 mr-2 shrink-0" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: 'transparent' }}
                            className="w-full bg-transparent text-white placeholder-slate-300 text-sm font-medium font-sans focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer ml-2"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>


                      {/* Main Login Submit Button */}
                      <div className="pt-2">
                        {isLoading ? (
                          <div className="w-full py-3 rounded-xl bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center space-x-2 shadow-inner">
                            <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            <span>Logging in to system...</span>
                          </div>
                        ) : (
                          <button
                            type="submit"
                            className="w-full py-2.5 px-3 rounded-xl fluid-btn-emerald text-xs sm:text-sm font-mono text-slate-950 font-black flex items-center justify-center space-x-2 transition-all duration-300 active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] border-2 border-emerald-300 hover:shadow-[0_0_25px_rgba(16,185,129,0.8)] hover:scale-[1.02] relative overflow-hidden group"
                          >
                            <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                            <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0 animate-pulse" />
                            <span className="relative z-10 tracking-wider">LOG IN TO SYSTEM</span>
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* RIGHT SIDE DIAGONAL GREEN PANEL */}
                  <div className="md:col-span-5 relative hidden md:flex flex-col justify-center items-center p-4 text-center text-white overflow-hidden min-h-[300px]">
                    {/* Diagonal Green Panel Background */}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-emerald-500/75 via-emerald-600/60 to-teal-900/65 backdrop-blur-sm shadow-[inset_0_0_30px_rgba(0,0,0,0.2)]"
                      style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0 100%)' }}
                    />

                    {/* Right Side Overlay Content */}
                    <div className="relative z-10 pl-4 space-y-2">
                      <h2 className="text-xl lg:text-2xl xl:text-3xl font-extrabold text-white tracking-tight uppercase drop-shadow-md leading-tight">
                        WELCOME BACK!
                      </h2>
                      <p className="text-xs text-emerald-100 font-medium leading-relaxed max-w-xs drop-shadow">
                        Already a Member? Please Login.
                      </p>

                      <div className="pt-2 border-t border-emerald-400/30 text-[9.5px] font-mono text-emerald-200">
                        Linis Dingalan EC Management <br />
                        PESO & MENRO Operations
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM FOOTER BAR (SLIM FIT TO NEVER GET PUSHED OFF THE SCREEN)            */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full px-3 sm:px-6 lg:px-10 xl:px-14 py-2 sm:py-2.5 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-300 border-t border-white/10 bg-slate-950/40 backdrop-blur-md gap-1.5 shrink-0">
        <div className="drop-shadow text-center sm:text-left">
          Linis Dingalan EC Management Platform • PESO & MENRO Operations • Municipality of Dingalan, Aurora
        </div>
        <div className="flex flex-wrap justify-center items-center gap-1.5 sm:space-x-2.5 text-emerald-300 drop-shadow text-[9.5px] sm:text-[10.5px]">
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

