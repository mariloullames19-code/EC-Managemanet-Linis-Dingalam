import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import {
  User,
  Beneficiary,
  Activity,
  ActivityAssignment,
  AttendanceRecord,
  AuditLog,
  StorageMetrics,
  UserRole,
} from './types';
import { Header } from './components/Header';
import { CinematicBentoHomepage } from './components/CinematicBentoHomepage';
import { FieldAttendancePortal } from './components/FieldAttendancePortal';
import { BeneficiaryMasterlist } from './components/BeneficiaryMasterlist';
import { ActivityManagement } from './components/ActivityManagement';
import { ReportsView } from './components/ReportsView';
import { AuditTrailView } from './components/AuditTrailView';
import { StoragePruningView } from './components/StoragePruningView';
import { ArchitectureDocsView } from './components/ArchitectureDocsView';
import { LoginModal } from './components/LoginModal';
import { DigitalIdCardModal } from './components/DigitalIdCardModal';
import { AccountApprovalsModal } from './components/AccountApprovalsModal';
import { AccomplishmentAttendanceModal } from './components/AccomplishmentAttendanceModal';
import { UploadAccomplishmentModal } from './components/UploadAccomplishmentModal';
import { ScanQrModal } from './components/ScanQrModal';
import { ManualAccomplishmentModal } from './components/ManualAccomplishmentModal';
import { GenerateQrEventModal } from './components/GenerateQrEventModal';
import { EventQrNoticeModal } from './components/EventQrNoticeModal';
import { GeneratePersonalQrModal } from './components/GeneratePersonalQrModal';
import { EventQrBroadcast } from './types';
import systemWallpaper from './assets/images/dingalan_system_wallpaper.jpg';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const DINGALAN_SYSTEM_BG = systemWallpaper || 'https://i.ibb.co/YBstSFGf/1b06179e-22f5-43a2-9755-40255190d134-1.jpg';

const isBroadcastActive = (broadcast: any): boolean => {
  if (!broadcast) return false;
  try {
    const datePart = broadcast.eventDate || new Date().toISOString().split('T')[0];
    let timePart = broadcast.estimatedEndTime || '12:00 PM';
    timePart = timePart.trim().toUpperCase();
    const match = timePart.match(/(\d+):(\d+)\s*(AM|PM)?/);
    let hours = 12;
    let minutes = 0;
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const ampm = match[3];
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
    }

    // Parse the event date and time using standard local browser date representation
    const [year, month, day] = datePart.split('-').map(Number);
    const endDateTime = new Date(year, month - 1, day, hours, minutes, 0);

    // Get current Asia/Manila clock time as a local Date object
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    const manilaNow = new Date(
      parseInt(partMap.year, 10),
      parseInt(partMap.month, 10) - 1,
      parseInt(partMap.day, 10),
      parseInt(partMap.hour, 10) === 24 ? 0 : parseInt(partMap.hour, 10),
      parseInt(partMap.minute, 10),
      parseInt(partMap.second, 10)
    );

    return manilaNow.getTime() < endDateTime.getTime();
  } catch (err) {
    console.error("Error checking broadcast active status:", err);
    return true;
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(api.getCurrentUser());
  const isAdminOrSuperAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
  const [activeTab, setActiveTab] = useState<string>('homepage');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [digitalIdModalBene, setDigitalIdModalBene] = useState<Beneficiary | null>(null);

  // User Accounts & Approvals State
  const [allUsers, setAllUsers] = useState<User[]>(api.getUsers());
  const [pendingUsers, setPendingUsers] = useState<User[]>(api.getPendingUsers());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isPersonalQrModalOpen, setIsPersonalQrModalOpen] = useState<boolean>(false);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState<boolean>(false);
  const [isAccomplishmentModalOpen, setIsAccomplishmentModalOpen] = useState<boolean>(false);
  const [isUploadAccomplishmentModalOpen, setIsUploadAccomplishmentModalOpen] = useState<boolean>(false);
  const [uploadBeneficiaryTarget, setUploadBeneficiaryTarget] = useState<Beneficiary | null>(null);
  const [isScanQrModalOpen, setIsScanQrModalOpen] = useState<boolean>(false);
  const [isManualAccomplishmentModalOpen, setIsManualAccomplishmentModalOpen] = useState<boolean>(false);
  const [isGenerateQrModalOpen, setIsGenerateQrModalOpen] = useState<boolean>(false);
  const [isEventQrNoticeModalOpen, setIsEventQrNoticeModalOpen] = useState<boolean>(false);
  const [latestEventBroadcast, setLatestEventBroadcast] = useState<EventQrBroadcast | null>(null);

  // Core Data State
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [assignments, setAssignments] = useState<ActivityAssignment[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);

  // Selected Activity / Beneficiary for direct field check-in testing
  const [targetActivity, setTargetActivity] = useState<Activity | null>(null);
  const [targetBeneficiary, setTargetBeneficiary] = useState<Beneficiary | null>(null);

  // Global Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load Initial Data
  const loadAllData = async () => {
    try {
      // Sync initial data to Firestore so collections populate in Firebase Console
      api.seedFirestoreIfEmpty().catch(() => {});

      const benes = await api.getBeneficiaries();
      setBeneficiaries(benes);

      const actData = await api.getActivities();
      setActivities(actData.activities);
      setAssignments(actData.assignments);

      const atts = await api.getAttendances();
      setAttendances(atts);

      const logsRes = await api.getAuditLogs();
      if (logsRes.success && logsRes.auditLogs) {
        setAuditLogs(logsRes.auditLogs);
      }

      const metrics = await api.getStorageMetrics();
      setStorageMetrics(metrics);

      const latestBroadcast = await api.getLatestEventBroadcast();
      if (latestBroadcast) {
        setLatestEventBroadcast(latestBroadcast);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Listen to mobile QR Code scans redirecting directly to the app URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'upload') {
      const id = urlParams.get('id') || '';
      const beneCode = urlParams.get('beneCode') || '';
      const name = urlParams.get('name') || '';
      const gender = urlParams.get('gender') || '';
      const phoneNumber = urlParams.get('phoneNumber') || '';
      const department = urlParams.get('department') || '';
      const address = urlParams.get('address') || '';
      const barangay = urlParams.get('barangay') || '';
      const qrHash = urlParams.get('qrHash') || '';

      if (name || beneCode || id) {
        let foundBene = beneficiaries.find(b => (id && b.id === id) || (beneCode && b.beneCode === beneCode));
        if (!foundBene) {
          const cleanName = name || 'Participant Dingalan';
          const firstName = cleanName.split(' ')[0] || 'Participant';
          const lastName = cleanName.split(' ').slice(1).join(' ') || 'Dingalan';
          foundBene = {
            id: id || `bene-${Date.now()}`,
            beneCode: beneCode || `LD-BEN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            firstName,
            lastName,
            nationalOrLocalId: `LGU-DING-${(department || '').substring(0, 4).toUpperCase() || 'GEN'}-${Math.floor(100 + Math.random() * 900)}`,
            contactNumber: phoneNumber || '0917-000-0000',
            barangay: (barangay as any) || 'Paltic',
            assignedCluster: department || 'General Operations',
            emergencyContactName: `${lastName} Family`,
            emergencyContactPhone: phoneNumber || '0917-000-0000',
            emergencyContactRelation: 'Relative',
            photoUrl: `https://images.unsplash.com/photo-1534528741775?w=400&auto=format&fit=crop&q=80`,
            status: 'active',
            qrHash: qrHash || 'qr-verified',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        // Set matching activity based on the beneficiary's barangay
        const currentBarangay = foundBene.barangay;
        const matchingAct =
          activities.find(
            (a) =>
              (a.status === 'ongoing' || a.status === 'scheduled') &&
              (a.barangay === currentBarangay || a.targetArea.toLowerCase().includes(currentBarangay.toLowerCase()))
          ) || activities.find((a) => a.status === 'ongoing') || activities[0] || null;

        if (matchingAct) {
          setTargetActivity(matchingAct);
        }

        setUploadBeneficiaryTarget(foundBene);
        setIsUploadAccomplishmentModalOpen(true);
        showToast(`Na-scan mula sa QR Code: Mag-upload ng patunay para kay ${foundBene.firstName} ${foundBene.lastName}.`, 'success');
        
        // Clean up URL parameters so it doesn't pop up again on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [beneficiaries, activities]);

  // Real-time synchronization #1: Firestore onSnapshot Listener
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(
        collection(db, 'attendances'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: AttendanceRecord[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as AttendanceRecord);
            });
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setAttendances((prev) => {
              if (prev.length > 0 && list.length > prev.length) {
                const newest = list[0];
                if (!prev.some((p) => p.id === newest.id)) {
                  showToast(`Bagong Accomplishment Attendance mula sa Mobile: ${newest.beneficiaryName}!`, 'success');
                }
              }
              return list;
            });
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot attendances warning:', error);
        }
      );
    } catch (err) {
      console.warn('Firestore subscription exception:', err);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Real-time synchronization #2: High-frequency Polling fallback (3.5s)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latest = await api.getAttendances();
        if (latest && latest.length > 0) {
          setAttendances((prev) => {
            if (latest.length > prev.length) {
              const newest = latest[0];
              if (!prev.some((p) => p.id === newest.id)) {
                showToast(`Bagong Accomplishment Attendance mula sa Mobile: ${newest.beneficiaryName}!`, 'success');
              }
              return latest;
            }
            return prev;
          });
        }
      } catch {}
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // Real-time synchronization #3: Cross-tab / Window BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ld_sync');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_ATTENDANCE' && event.data.attendance) {
          const newAtt = event.data.attendance as AttendanceRecord;
          setAttendances((prev) => [newAtt, ...prev.filter((a) => a.id !== newAtt.id)]);
          showToast(`Bagong Accomplishment Attendance: ${newAtt.beneficiaryName}!`, 'success');
        }
        if (event.data?.type === 'NEW_BROADCAST' && event.data.broadcast) {
          const newBc = event.data.broadcast as EventQrBroadcast;
          setLatestEventBroadcast(newBc);
          showToast(`Bagong Opisyal na Paalala at QR Code: ${newBc.activityTitle}!`, 'success');
        }
      };
      return () => bc.close();
    }
  }, []);

  // Real-time synchronization #4: Firestore onSnapshot for Broadcasts
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(
        collection(db, 'broadcasts'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: EventQrBroadcast[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as EventQrBroadcast);
            });
            list.sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
            if (list.length > 0) {
              setLatestEventBroadcast(list[0]);
            }
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot broadcasts warning:', error);
        }
      );
    } catch (err) {
      console.warn('Firestore broadcasts subscription exception:', err);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleBroadcastSuccess = async (broadcast: EventQrBroadcast) => {
    if (!broadcast || !broadcast.id) {
      // Clear or reload from DB
      const latest = await api.getLatestEventBroadcast();
      setLatestEventBroadcast(latest && latest.id ? latest : null);
      return;
    }
    await api.broadcastEventQr(broadcast);
    setLatestEventBroadcast(broadcast);

    // Upsert activity into state so that all modals and views immediately update with the new broadcast details
    setActivities((prev) => {
      const existingIdx = prev.findIndex((a) => a.id === broadcast.activityId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          title: broadcast.activityTitle,
          barangay: broadcast.barangay as any,
          targetArea: broadcast.targetArea,
          date: broadcast.eventDate || new Date().toISOString().split('T')[0],
          callTime: broadcast.startTime || '06:00 AM',
          status: 'ongoing',
          notes: broadcast.additionalNotes,
        };
        return updated;
      } else {
        const newAct: Activity = {
          id: broadcast.activityId || `act-${Date.now()}`,
          title: broadcast.activityTitle,
          programType: 'COASTAL_CLEANUP',
          description: broadcast.additionalNotes || 'Linis Dingalan Cleanup Operation',
          date: broadcast.eventDate || new Date().toISOString().split('T')[0],
          callTime: broadcast.startTime || '06:00 AM',
          targetArea: broadcast.targetArea,
          barangay: broadcast.barangay as any,
          menroSupervisorId: currentUser.id,
          supervisorName: broadcast.sentByAdminName,
          targetBeneficiariesCount: 40,
          assignedBeneficiariesCount: 35,
          attendedBeneficiariesCount: 0,
          status: 'ongoing',
          notes: broadcast.additionalNotes,
          createdAt: new Date().toISOString(),
        };
        return [newAct, ...prev];
      }
    });

    showToast('Naipadala na ang Event QR Code at mga paalala sa lahat ng naka-register na user!', 'success');
  };

  // Role Switcher Handler
  const handleSwitchRole = (newRole: UserRole) => {
    const updated = api.switchRole(newRole);
    setCurrentUser(updated);

    if (newRole === 'superadmin') {
      api.getAuditLogs().then((res) => {
        if (res.success && res.auditLogs) setAuditLogs(res.auditLogs);
      });
    }
  };

  // Login & Logout Handlers
  const handleLogin = (userOrRole: UserRole | User) => {
    if (typeof userOrRole === 'string') {
      handleSwitchRole(userOrRole);
    } else {
      api.setCurrentUser(userOrRole);
      setCurrentUser(userOrRole);
    }
    setIsLoggedIn(true);

    // Refresh pending users count
    const latestPending = api.getPendingUsers();
    setPendingUsers(latestPending);
    setAllUsers(api.getUsers());
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    showToast('Naka-log out na po kayo sa system.', 'info');
  };

  // Account Approvals Handlers (Strictly Admin & Super Admin only)
  const handleApproveUser = (userId: string) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      showToast('Wala kang pahintulot. Ang Admin at Super Admin lamang ang may karapatang mag-approve ng account.', 'error');
      return;
    }
    const res = api.approveUser(userId, currentUser.name);
    if (res.success && res.user) {
      setPendingUsers(api.getPendingUsers());
      setAllUsers(api.getUsers());
      showToast(`Na-approve at na-activate na ang account ni ${res.user.name} (${res.user.department}).`, 'success');
      api.getAuditLogs().then((logsRes) => {
        if (logsRes.success && logsRes.auditLogs) setAuditLogs(logsRes.auditLogs);
      });
    }
  };

  const handleRejectUser = (userId: string) => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      showToast('Wala kang pahintulot. Ang Admin at Super Admin lamang ang may karapatang mag-decline ng account.', 'error');
      return;
    }
    const res = api.rejectUser(userId, currentUser.name);
    if (res.success && res.user) {
      setPendingUsers(api.getPendingUsers());
      setAllUsers(api.getUsers());
      showToast(`Tinanggihan ang registration request ni ${res.user.name}.`, 'info');
    }
  };

  // Add Beneficiary Handler
  const handleAddBeneficiary = async (beneData: Partial<Beneficiary>) => {
    const newBene = await api.createBeneficiary(beneData);
    setBeneficiaries((prev) => [newBene, ...prev]);
    showToast(`Registered ${newBene.firstName} ${newBene.lastName} with QR token ${newBene.beneCode}.`, 'success');
  };

  // Delete Beneficiary Handler
  const handleDeleteBeneficiary = async (id: string) => {
    await api.deleteBeneficiary(id);
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
    showToast('Beneficiary record permanently deleted.', 'info');
  };

  // Create Activity Handler
  const handleCreateActivity = async (data: Partial<Activity>) => {
    const newAct = await api.createActivity(data);
    setActivities((prev) => [newAct, ...prev]);
    showToast(`Created work program "${newAct.title}".`, 'success');
  };

  // Assign Beneficiary Handler
  const handleAssignBeneficiary = async (activityId: string, beneficiaryId: string) => {
    try {
      const res = await fetch(`/api/activities/${activityId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ beneficiaryId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments((prev) => [...prev, data.assignment]);
      }
    } catch {
      // offline
    }
  };

  // Submit Attendance Handler
  const handleSubmitAttendance = async (payload: any) => {
    const result = await api.submitAttendanceCheckin(payload);
    setAttendances((prev) => [result.attendance, ...prev]);

    setAssignments((prev) =>
      prev.map((asg) =>
        asg.activityId === payload.activity_id && asg.beneficiaryId === payload.beneficiary_id
          ? { ...asg, status: 'attended' }
          : asg
      )
    );

    const metrics = await api.getStorageMetrics();
    setStorageMetrics(metrics);

    showToast('Geotagged compliance photograph verified & recorded!', 'success');
    return result;
  };

  // Prune Photos Handler
  const handlePrunePhotos = async (retentionDays: number) => {
    const result = await api.prunePhotos(retentionDays);
    const updatedMetrics = await api.getStorageMetrics();
    setStorageMetrics(updatedMetrics);
    showToast(`Pruned ${result.prunedCount} photos older than ${retentionDays} days.`, 'success');
    return result;
  };

  // Quick Direct Scan Test trigger
  const handleDirectScanTest = (bene: Beneficiary) => {
    setTargetBeneficiary(bene);
    setActiveTab('portal');
  };

  const handleSelectActivityForAttendance = (act: Activity) => {
    setTargetActivity(act);
    setActiveTab('portal');
  };

  // When system opens, the login page is the first thing that appears
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
        {toastMessage && (
          <div className="fixed top-20 right-4 z-50 animate-bounce">
            <div
              className={`px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border backdrop-blur-xl flex items-center space-x-2 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                  : 'bg-cyan-950/90 text-cyan-300 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              }`}
            >
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}
        <LoginModal
          isOpen={true}
          currentUser={currentUser}
          onLogin={handleLogin}
          onOpenRegisterModal={() => setIsPersonalQrModalOpen(true)}
          onOpenUploadAccomplishment={() => setIsUploadAccomplishmentModalOpen(true)}
          onOpenScanQrModal={() => setIsScanQrModalOpen(true)}
          eventBroadcast={latestEventBroadcast}
        />

        {/* Standalone Personal QR Generator & Registration Modal */}
        <GeneratePersonalQrModal
          isOpen={isPersonalQrModalOpen}
          onClose={() => setIsPersonalQrModalOpen(false)}
          onRegisterSuccess={(newBene) => {
            setBeneficiaries((prev) => [newBene, ...prev]);
            showToast(`Naka-register na si ${newBene.firstName} ${newBene.lastName}! Na-generate na ang kanyang Personal QR Code.`, 'success');
          }}
          onScanPersonalQr={(bene) => {
            setUploadBeneficiaryTarget(bene);
            setIsUploadAccomplishmentModalOpen(true);
          }}
        />

        {/* Upload Accomplishment Modal for public participant */}
        <UploadAccomplishmentModal
          isOpen={isUploadAccomplishmentModalOpen}
          onClose={() => setIsUploadAccomplishmentModalOpen(false)}
          beneficiary={uploadBeneficiaryTarget}
          activity={targetActivity}
          currentUser={currentUser}
          onSubmitAttendance={handleSubmitAttendance}
          onSuccessSubmitted={(att) => {
            setAttendances((prev) => [att, ...prev.filter(a => a.id !== att.id)]);
            showToast(`Matagumpay na na-upload ang accomplishment ni ${att.beneficiaryName}!`, 'success');
          }}
        />

        {/* Scan QR Modal for public participant */}
        <ScanQrModal
          isOpen={isScanQrModalOpen}
          onClose={() => setIsScanQrModalOpen(false)}
          beneficiaries={beneficiaries}
          activities={activities}
          onScanSuccess={(bene, act) => {
            setUploadBeneficiaryTarget(bene);
            if (act) setTargetActivity(act);
            setIsUploadAccomplishmentModalOpen(true);
            setIsScanQrModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* ========================================================================= */}
      {/* FULL SYSTEM DASHBOARD BACKGROUND: DINGALAN AURORA HD TECH VIDEO (1080P) */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-slate-950 flex items-center justify-center">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          className="w-full h-full object-cover object-center filter contrast-[1.12] saturate-[1.15] brightness-[0.80] transform translate-z-0 opacity-100"
          style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }}
          src="/dingalan_sunset_background.mp4"
        >
          <source src="/dingalan_sunset_background.mp4" type="video/mp4" />
          <source src="/dingalan_tech_background.mp4" type="video/mp4" />
        </video>

        {/* System Color-Tuned Ambient Gradients for Text Contrast while preserving 1080p video clarity */}
        <div className="absolute inset-0 bg-slate-950/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-amber-950/15 to-slate-950/75" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-transparent to-slate-950/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-transparent" />

        {/* Subtle Geometric System Grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px), radial-gradient(rgba(6, 182, 212, 0.4) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            backgroundPosition: '0 0, 20px 20px',
          }}
        />
      </div>

      {/* Relative container for dashboard content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed top-20 right-4 z-50 animate-bounce">
            <div
              className={`px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border backdrop-blur-xl flex items-center space-x-2 ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                  : 'bg-cyan-950/90 text-cyan-300 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              }`}
            >
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Floating Frosted Glassmorphism Navigation Capsule across the top */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          pendingApprovalsCount={isAdminOrSuperAdmin ? pendingUsers.length : 0}
          onOpenApprovalsModal={isAdminOrSuperAdmin ? () => setIsApprovalsModalOpen(true) : undefined}
          attendancesCount={attendances.length}
          onOpenAccomplishmentModal={isAdminOrSuperAdmin ? () => setIsAccomplishmentModalOpen(true) : undefined}
          onOpenScanQrModal={() => setIsScanQrModalOpen(true)}
          onOpenManualUploadModal={() => setIsManualAccomplishmentModalOpen(true)}
          onOpenGenerateQrModal={isAdminOrSuperAdmin ? () => setIsGenerateQrModalOpen(true) : undefined}
          onOpenEventNoticeModal={() => setIsEventQrNoticeModalOpen(true)}
        />

        {/* Main View Container */}
        <main className="flex-1 w-full mx-auto">
          {/* TAB 1: 3D CINEMATIC BENTO HOMEPAGE */}
          {activeTab === 'homepage' && (
            <CinematicBentoHomepage
              currentUser={currentUser}
              activities={activities}
              beneficiaries={beneficiaries}
              attendances={attendances}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenLoginModal={() => setIsLoginModalOpen(true)}
              onOpenDigitalIdModal={(bene) => setDigitalIdModalBene(bene)}
              onOpenAccomplishmentModal={isAdminOrSuperAdmin ? () => setIsAccomplishmentModalOpen(true) : undefined}
              onOpenScanQrModal={() => setIsScanQrModalOpen(true)}
              onOpenManualUploadModal={() => setIsManualAccomplishmentModalOpen(true)}
              onOpenGenerateQrModal={isAdminOrSuperAdmin ? () => setIsGenerateQrModalOpen(true) : undefined}
              onOpenEventNoticeModal={() => setIsEventQrNoticeModalOpen(true)}
              onOpenPersonalQrModal={() => setIsPersonalQrModalOpen(true)}
              eventBroadcast={latestEventBroadcast}
            />
          )}

          {/* TAB 2: FIELD ATTENDANCE TERMINAL */}
          {activeTab === 'portal' && (
            <div className="w-full px-2 sm:px-4 md:px-6 py-3">
              <FieldAttendancePortal
                activities={activities}
                beneficiaries={beneficiaries}
                currentUser={currentUser}
                initialActivity={targetActivity}
                initialBeneficiary={targetBeneficiary}
                onSubmitAttendance={handleSubmitAttendance}
              />
            </div>
          )}

          {/* TAB 3: BENEFICIARY MASTERLIST */}
          {activeTab === 'beneficiaries' && (
            <div className="w-full px-2 sm:px-4 md:px-6 py-3">
              <BeneficiaryMasterlist
                beneficiaries={beneficiaries}
                currentUser={currentUser}
                onAddBeneficiary={handleAddBeneficiary}
                onDeleteBeneficiary={handleDeleteBeneficiary}
                onDirectScanTest={handleDirectScanTest}
              />
            </div>
          )}

          {/* TAB 4: WORK PROGRAMS & ACTIVITIES */}
          {activeTab === 'activities' && (
            <div className="w-full px-2 sm:px-4 md:px-6 py-3">
              <ActivityManagement
                activities={activities}
                assignments={assignments}
                beneficiaries={beneficiaries}
                currentUser={currentUser}
                onCreateActivity={handleCreateActivity}
                onAssignBeneficiary={handleAssignBeneficiary}
                onSelectActivityForAttendance={handleSelectActivityForAttendance}
              />
            </div>
          )}

          {/* TAB 5: COMPLIANCE REPORTS */}
          {activeTab === 'reports' && (
            <div className="w-full px-2 sm:px-4 md:px-6 py-3">
              <ReportsView
                activities={activities}
                attendances={attendances}
                beneficiaries={beneficiaries}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="w-full px-2 sm:px-4 md:px-6 py-3">
              <AuditTrailView
                auditLogs={auditLogs}
                currentUser={currentUser}
                onSwitchToSuperadmin={() => handleSwitchRole('superadmin')}
              />
            </div>
          )}

          {/* TAB 7: STORAGE & PHOTO PRUNING */}
          {activeTab === 'storage' && storageMetrics && (
            <div className="w-full px-2 sm:px-4 md:px-6 py-3">
              <StoragePruningView
                metrics={storageMetrics}
                currentUser={currentUser}
                onPrunePhotos={handlePrunePhotos}
              />
            </div>
          )}

          {/* TAB 8: ARCHITECTURE & DDL SCHEMAS */}
          {activeTab === 'architecture' && (
            <div className="w-full px-2 sm:px-4 md:px-6 py-3">
              <ArchitectureDocsView currentUser={currentUser} />
            </div>
          )}
        </main>

        {/* Digital ID Card Modal */}
        {digitalIdModalBene && (
          <DigitalIdCardModal
            beneficiary={digitalIdModalBene}
            onClose={() => setDigitalIdModalBene(null)}
            onDirectScanTest={handleDirectScanTest}
            onOpenUploadAccomplishment={(bene) => {
              setUploadBeneficiaryTarget(bene);
              setIsUploadAccomplishmentModalOpen(true);
            }}
          />
        )}

        {/* Upload Accomplishment Pictures Modal (From QR Code Scan) */}
        {uploadBeneficiaryTarget && (
          <UploadAccomplishmentModal
            isOpen={isUploadAccomplishmentModalOpen}
            onClose={() => {
              setIsUploadAccomplishmentModalOpen(false);
              setUploadBeneficiaryTarget(null);
            }}
            beneficiary={uploadBeneficiaryTarget}
            activity={activities.find((a) => a.barangay === uploadBeneficiaryTarget.barangay) || activities[0] || null}
            currentUser={currentUser}
            onSubmitAttendance={handleSubmitAttendance}
            onSuccessSubmitted={(att) => {
              setAttendances((prev) => [att, ...prev.filter(a => a.id !== att.id)]);
              showToast(`Nai-upload ang accomplishment pictures ni ${att.beneficiaryName}!`, 'success');
            }}
          />
        )}

        {/* Accomplishment Attendance Records Modal (Admin & Super Admin) */}
        <AccomplishmentAttendanceModal
          isOpen={isAccomplishmentModalOpen}
          onClose={() => setIsAccomplishmentModalOpen(false)}
          attendances={attendances}
          currentUser={currentUser}
        />

        {/* Scan QR Modal (User Account Scans Admin QR Code) */}
        <ScanQrModal
          isOpen={isScanQrModalOpen}
          onClose={() => setIsScanQrModalOpen(false)}
          beneficiaries={beneficiaries}
          activities={activities}
          onScanSuccess={(bene, act) => {
            setUploadBeneficiaryTarget(bene);
            if (act) setTargetActivity(act);
            setIsUploadAccomplishmentModalOpen(true);
            setIsScanQrModalOpen(false);
          }}
        />

        {/* Manual Accomplishment Upload Modal */}
        <ManualAccomplishmentModal
          isOpen={isManualAccomplishmentModalOpen}
          onClose={() => setIsManualAccomplishmentModalOpen(false)}
          beneficiaries={beneficiaries}
          activities={activities}
          currentUser={currentUser}
          onSubmitAttendance={handleSubmitAttendance}
          onSuccessSubmitted={(att) => {
            setAttendances((prev) => [att, ...prev.filter(a => a.id !== att.id)]);
            showToast(`Matagumpay na naitala ang manual accomplishment attendance ni ${att.beneficiaryName}!`, 'success');
          }}
        />

        {/* Admin Event QR Code & Reminders Generator Modal */}
        {isAdminOrSuperAdmin && (
          <GenerateQrEventModal
            isOpen={isGenerateQrModalOpen}
            onClose={() => setIsGenerateQrModalOpen(false)}
            activities={activities}
            currentUser={currentUser}
            onBroadcastSuccess={(broadcast) => {
              handleBroadcastSuccess(broadcast);
              setIsGenerateQrModalOpen(false);
            }}
          />
        )}

        {/* User View Broadcasted Event QR & Reminders Notice Modal */}
        <EventQrNoticeModal
          isOpen={isEventQrNoticeModalOpen}
          onClose={() => setIsEventQrNoticeModalOpen(false)}
          broadcast={latestEventBroadcast}
          activities={activities}
          onProceedUploadAccomplishment={(targetAct) => {
            if (targetAct) {
              setTargetActivity(targetAct);
            }
            if (beneficiaries.length > 0) {
              const defaultBene = beneficiaries.find(
                (b) => `${b.firstName} ${b.lastName}`.toLowerCase() === currentUser.name.toLowerCase()
              ) || beneficiaries[0];
              setUploadBeneficiaryTarget(defaultBene);
              setIsUploadAccomplishmentModalOpen(true);
            }
          }}
        />

        {/* Account Approvals Modal - STRICTLY ADMIN & SUPERADMIN ONLY */}
        {isAdminOrSuperAdmin && (
          <AccountApprovalsModal
            isOpen={isApprovalsModalOpen}
            onClose={() => setIsApprovalsModalOpen(false)}
            pendingUsers={pendingUsers}
            allUsers={allUsers}
            onApproveUser={handleApproveUser}
            onRejectUser={handleRejectUser}
            currentAdminName={currentUser.name}
            currentUserRole={currentUser.role}
          />
        )}

        {/* Admin & Super Admin Login Modal Box */}
        <LoginModal
          isOpen={isLoginModalOpen}
          currentUser={currentUser}
          onLogin={(userOrRole) => {
            handleLogin(userOrRole);
            setIsLoginModalOpen(false);
          }}
          onClose={() => setIsLoginModalOpen(false)}
          onOpenRegisterModal={() => setIsPersonalQrModalOpen(true)}
          onOpenUploadAccomplishment={() => setIsUploadAccomplishmentModalOpen(true)}
          onOpenScanQrModal={() => setIsScanQrModalOpen(true)}
          onRegisterSuccess={(newBene) => {
            setBeneficiaries((prev) => [newBene, ...prev]);
            showToast(`Naka-register na si ${newBene.firstName} ${newBene.lastName}! Na-generate na ang kanyang Personal QR Code.`, 'success');
          }}
          eventBroadcast={isBroadcastActive(latestEventBroadcast) ? latestEventBroadcast : null}
        />

        {/* Standalone Personal QR Generator & Registration Modal */}
        <GeneratePersonalQrModal
          isOpen={isPersonalQrModalOpen}
          onClose={() => setIsPersonalQrModalOpen(false)}
          onRegisterSuccess={(newBene) => {
            setBeneficiaries((prev) => [newBene, ...prev]);
            showToast(`Naka-register na si ${newBene.firstName} ${newBene.lastName}! Na-generate na ang kanyang Personal QR Code.`, 'success');
          }}
          onScanPersonalQr={(bene) => {
            setUploadBeneficiaryTarget(bene);
            setIsUploadAccomplishmentModalOpen(true);
          }}
        />

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl py-4 mt-auto">
          <div className="max-w-[1850px] mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-3">
            <div>
              Linis Dingalan EC Management • PESO & MENRO Operations • Municipality of Dingalan, Aurora
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="text-emerald-400 font-bold">HTML5 Canvas Geotag Engine</span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">HMAC-SHA256 Tokenized QR</span>
              <span>•</span>
              <span>Bento Glassmorphism</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
