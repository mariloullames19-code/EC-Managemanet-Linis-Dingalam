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
import { AdminAnonymousInboxModal } from './components/AdminAnonymousInboxModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { EventQrBroadcast, AnonymousMessage } from './types';
import { checkEventCutoff } from './utils/watermarkEngine';
import { checkIsBroadcastActive } from './utils/philippineClock';
import mountainViewWallpaper from './assets/images/dingalan_mountain_view_1791439053773.jpg';
import systemWallpaper from './assets/images/dingalan_system_wallpaper.jpg';
import { db } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const DINGALAN_SYSTEM_BG = mountainViewWallpaper || systemWallpaper;

const isBroadcastActive = (broadcast: any): boolean => {
  return checkIsBroadcastActive(broadcast);
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
  const [isAnonymousInboxModalOpen, setIsAnonymousInboxModalOpen] = useState<boolean>(false);
  const [anonymousMessages, setAnonymousMessages] = useState<AnonymousMessage[]>([]);
  const [latestEventBroadcast, setLatestEventBroadcast] = useState<EventQrBroadcast | null>(() => {
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
    // 1. Fetch latest broadcast immediately for lightning-fast Login Page display
    api.getLatestEventBroadcast().then((latestBroadcast) => {
      if (latestBroadcast && latestBroadcast.id) {
        setLatestEventBroadcast(latestBroadcast);
      }
    }).catch(() => {});

    try {
      // Sync initial data to Firestore so collections populate in Firebase Console
      api.seedFirestoreIfEmpty().catch(() => {});

      const benes = await api.getBeneficiaries();
      setBeneficiaries(benes);

      const anonRes = await api.getAnonymousMessages();
      setAnonymousMessages(anonRes.messages || []);

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
          try {
            const savedBeneStr = localStorage.getItem('LD_LAST_REGISTERED_BENE');
            if (savedBeneStr) {
              foundBene = JSON.parse(savedBeneStr);
            }
          } catch(e) {}
        }
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

        // STRICT TIME GATE: Check if event is active or if cut-off is already reached
        const cutoff = checkEventCutoff(matchingAct, latestEventBroadcast);
        if (cutoff.isExpired) {
          showToast(`SARADO NA ANG SUBMISSION: Tapos na ang nakatakdang oras ng event (${cutoff.endTimeFormatted}). Hindi na maaaring mag-scan o magpasa ng attendance.`, 'error');
          setIsUploadAccomplishmentModalOpen(false);
          setUploadBeneficiaryTarget(null);
          return;
        }

        setUploadBeneficiaryTarget(foundBene);
        setIsUploadAccomplishmentModalOpen(true);
        showToast(`Na-scan ang Opisyal na Event QR: Mag-upload ng accomplishment pictures para sa paglilinis.`, 'success');
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
          if (snapshot.empty) {
            setAttendances([]);
          } else {
            const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
            const cutoff = Date.now() - THIRTY_DAYS_MS;
            const list: AttendanceRecord[] = [];
            snapshot.forEach((docSnap) => {
              const item = docSnap.data() as AttendanceRecord;
              const time = new Date(item.timestamp).getTime();
              if (isNaN(time) || time >= cutoff) {
                list.push(item);
              }
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
        if (latest) {
          setAttendances((prev) => {
            if (latest.length > prev.length) {
              const newest = latest[0];
              if (!prev.some((p) => p.id === newest.id)) {
                showToast(`Bagong Accomplishment Attendance mula sa Mobile: ${newest.beneficiaryName}!`, 'success');
              }
              return latest;
            } else if (latest.length === 0 && prev.length > 0) {
              return [];
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
        if (event.data?.type === 'CLEAR_ATTENDANCES') {
          setAttendances([]);
          showToast('Nabura ang lahat ng accomplishment attendance records.', 'info');
        }
        if (event.data?.type === 'NEW_BROADCAST' && event.data.broadcast) {
          const newBc = event.data.broadcast as EventQrBroadcast;
          setLatestEventBroadcast(newBc);
          showToast(`Bagong Opisyal na Paalala at QR Code: ${newBc.activityTitle}!`, 'success');
        }
        if (event.data?.type === 'CLEAR_BROADCASTS') {
          setLatestEventBroadcast(null);
          showToast('Nabura ang lahat ng kasaysayan ng mga paalala.', 'info');
        }
        if (event.data?.type === 'NEW_ANONYMOUS_MESSAGE' && event.data.message) {
          const newAnon = event.data.message as AnonymousMessage;
          setAnonymousMessages((prev) => [newAnon, ...prev.filter((m) => m.id !== newAnon.id)]);
          showToast('Nakatanggap ng Bagong Anonymous Report sa Admin Inbox!', 'info');
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
            } else {
              setLatestEventBroadcast(null);
            }
          } else {
            if (localStorage.getItem('ld_broadcasts_cleared') === 'true') {
              setLatestEventBroadcast(null);
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

  const handleBroadcastSuccess = async (broadcast: EventQrBroadcast | null) => {
    if (!broadcast || !broadcast.id) {
      // Clear or reload from DB
      if (typeof window !== 'undefined' && localStorage.getItem('ld_broadcasts_cleared') === 'true') {
        setLatestEventBroadcast(null);
        return;
      }
      const latest = await api.getLatestEventBroadcast();
      setLatestEventBroadcast(latest && latest.id ? latest : null);
      return;
    }
    // Instantly reflect the new broadcast in UI state
    setLatestEventBroadcast(broadcast);
    api.broadcastEventQr(broadcast).catch(() => {});

    // Upsert activity into state and localStorage so that all modals and views (including Programs tab) immediately update
    setActivities((prev) => {
      const targetId = broadcast.activityId || `act-${Date.now().toString().slice(-6)}`;
      const existingIdx = prev.findIndex((a) => a.id === targetId || a.title === broadcast.activityTitle);
      let updatedList: Activity[];

      if (existingIdx >= 0) {
        updatedList = [...prev];
        updatedList[existingIdx] = {
          ...updatedList[existingIdx],
          title: broadcast.activityTitle,
          barangay: broadcast.barangay as any,
          targetArea: broadcast.targetArea,
          date: broadcast.eventDate || new Date().toISOString().split('T')[0],
          callTime: broadcast.startTime || '06:00 AM',
          status: 'scheduled',
          notes: broadcast.additionalNotes || updatedList[existingIdx].notes,
          supervisorName: broadcast.sentByAdminName || updatedList[existingIdx].supervisorName,
        };
      } else {
        const newAct: Activity = {
          id: targetId,
          title: broadcast.activityTitle,
          programType: 'COASTAL_CLEANUP',
          description: broadcast.additionalNotes || 'Linis Dingalan Cleanup Operation & Environmental Compliance',
          date: broadcast.eventDate || new Date().toISOString().split('T')[0],
          callTime: broadcast.startTime || '06:00 AM',
          targetArea: broadcast.targetArea,
          barangay: broadcast.barangay as any,
          menroSupervisorId: currentUser.id,
          supervisorName: broadcast.sentByAdminName || currentUser.name || 'Admin Officer',
          targetBeneficiariesCount: 20,
          assignedBeneficiariesCount: 0,
          attendedBeneficiariesCount: 0,
          status: 'scheduled',
          notes: broadcast.additionalNotes || '',
          createdAt: new Date().toISOString(),
        };
        updatedList = [newAct, ...prev];
      }

      try {
        localStorage.setItem('ld_activities_v1', JSON.stringify(updatedList));
      } catch {}

      try {
        fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser.role,
            'x-user-id': currentUser.id,
          },
          body: JSON.stringify(updatedList[0]),
        }).catch(() => {});
      } catch {}

      return updatedList;
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

  // Delete Single Activity Handler
  const handleDeleteActivity = async (id: string) => {
    try {
      await api.deleteActivity(id);
      setActivities((prev) => prev.filter((a) => a.id !== id));
      setAssignments((prev) => prev.filter((asg) => asg.activityId !== id));
      showToast('Matagumpay na nabura ang napiling work program box.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Nabigo ang pagbura sa program', 'error');
    }
  };

  // Clear All Activities Handler
  const handleClearAllActivities = async () => {
    try {
      await api.clearAllActivities();
      setActivities([]);
      setAssignments([]);
      showToast('Matagumpay na permanenteng nabura ang lahat ng work program boxes.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Nabigo ang pagbura sa lahat ng programs', 'error');
    }
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

  // Permanent Delete All Accomplishment Attendance Records Handler
  const handleDeleteAllAttendances = async () => {
    try {
      const res = await api.deleteAllAttendances();
      setAttendances([]);
      showToast(res.message || 'Lahat ng Accomplishment Attendance records ay matagumpay na permanenteng nabura!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Nagka-error sa pagbura ng records.', 'error');
    }
  };

  // Auto-prune records older than 1 month (30 days)
  const handleAutoPruneMonthlyAttendances = async () => {
    try {
      const pruned = await api.autoPruneMonthlyAttendances();
      if (pruned > 0) {
        const fresh = await api.getAttendances();
        setAttendances(fresh);
        showToast(`Awtomatikong nabura ang ${pruned} lumang tala na lagpas na sa 1 buwan (30 araw).`, 'info');
      }
    } catch {}
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
          users={allUsers}
          activities={activities}
          onLogin={handleLogin}
          onOpenRegisterModal={() => setIsPersonalQrModalOpen(true)}
          onOpenUploadAccomplishment={(bene) => {
            const target = bene || uploadBeneficiaryTarget || beneficiaries[0] || {
              id: 'ben-001',
              beneCode: 'LD-BEN-2025-0107',
              firstName: 'Juan',
              lastName: 'Dela Cruz',
              nationalOrLocalId: 'LGU-DING-2025-0107',
              contactNumber: '0917-123-4567',
              barangay: 'Paltic',
              assignedCluster: 'Municipal Administrator',
              emergencyContactName: 'Family',
              emergencyContactPhone: '0917-123-4567',
              emergencyContactRelation: 'Spouse',
              photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              status: 'active',
              qrHash: 'qr-verified',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setUploadBeneficiaryTarget(target);
            setIsUploadAccomplishmentModalOpen(true);
          }}
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
          onClose={() => {
            setIsUploadAccomplishmentModalOpen(false);
            setUploadBeneficiaryTarget(null);
          }}
          beneficiary={
            uploadBeneficiaryTarget ||
            beneficiaries[0] || {
              id: 'ben-001',
              beneCode: 'LD-BEN-2025-0107',
              firstName: 'Juan',
              lastName: 'Dela Cruz',
              nationalOrLocalId: 'LGU-DING-2025-0107',
              contactNumber: '0917-123-4567',
              barangay: 'Paltic',
              assignedCluster: 'Municipal Administrator',
              emergencyContactName: 'Family',
              emergencyContactPhone: '0917-123-4567',
              emergencyContactRelation: 'Spouse',
              photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              status: 'active',
              qrHash: 'qr-verified',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }
          activity={
            targetActivity ||
            (uploadBeneficiaryTarget
              ? activities.find((a) => a.barangay === uploadBeneficiaryTarget.barangay)
              : null) ||
            activities[0] ||
            null
          }
          eventBroadcast={latestEventBroadcast}
          currentUser={currentUser}
          onSubmitAttendance={handleSubmitAttendance}
          onSuccessSubmitted={(att) => {
            setAttendances((prev) => [att, ...prev.filter(a => a.id !== att.id)]);
            showToast(`Matagumpay na na-upload ang accomplishment ni ${att.beneficiaryName}! Makikita na ito sa Accomplishment Attendance ng Admin.`, 'success');
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
      {/* FULL SYSTEM DASHBOARD BACKGROUND: DINGALAN MOUNTAIN VIEW SCENIC PICTURE   */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 w-full h-full pointer-events-none select-none z-0 overflow-hidden bg-slate-950 flex items-center justify-center">
        <img
          src={mountainViewWallpaper}
          alt="Dingalan Aurora Mountain View Admin Background"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-[center_35%] scale-100 transition-all duration-700 filter contrast-[1.08] saturate-[1.2] brightness-[0.98]"
          style={{ imageRendering: '-webkit-optimize-contrast', transform: 'translateZ(0)' }}
        />

        {/* Optimized Minimal Ambient Overlay for Text Readability While Keeping Full View Vivid */}
        <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />

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
          anonymousMessagesCount={isAdminOrSuperAdmin ? anonymousMessages.filter(m => m.status === 'unread').length : 0}
          onOpenAnonymousInboxModal={isAdminOrSuperAdmin ? () => setIsAnonymousInboxModalOpen(true) : undefined}
          onOpenScanQrModal={() => setIsScanQrModalOpen(true)}
          onOpenManualUploadModal={() => setIsManualAccomplishmentModalOpen(true)}
          onOpenGenerateQrModal={() => setIsGenerateQrModalOpen(true)}
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
              onOpenGenerateQrModal={() => setIsGenerateQrModalOpen(true)}
              onOpenEventNoticeModal={() => setIsEventQrNoticeModalOpen(true)}
              onOpenPersonalQrModal={() => setIsPersonalQrModalOpen(true)}
              eventBroadcast={latestEventBroadcast}
            />
          )}

          {/* TAB 2: FIELD ATTENDANCE TERMINAL */}
          {activeTab === 'portal' && (
            <div className="w-full max-w-full overflow-hidden px-1.5 xs:px-2 sm:px-4 md:px-6 py-2 sm:py-3">
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
            <div className="w-full max-w-full overflow-hidden px-1.5 xs:px-2 sm:px-4 md:px-6 py-2 sm:py-3">
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
            <div className="w-full max-w-full overflow-hidden px-1.5 xs:px-2 sm:px-4 md:px-6 py-2 sm:py-3">
              <ActivityManagement
                activities={activities}
                assignments={assignments}
                beneficiaries={beneficiaries}
                currentUser={currentUser}
                onCreateActivity={handleCreateActivity}
                onAssignBeneficiary={handleAssignBeneficiary}
                onSelectActivityForAttendance={handleSelectActivityForAttendance}
                onOpenGenerateQrModal={() => setIsGenerateQrModalOpen(true)}
                onDeleteActivity={handleDeleteActivity}
                onClearAllActivities={handleClearAllActivities}
              />
            </div>
          )}

          {/* TAB 5: COMPLIANCE REPORTS */}
          {activeTab === 'reports' && (
            <div className="w-full max-w-full overflow-hidden px-1.5 xs:px-2 sm:px-4 md:px-6 py-2 sm:py-3">
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
            <div className="w-full max-w-full overflow-hidden px-1.5 xs:px-2 sm:px-4 md:px-6 py-2 sm:py-3">
              <AuditTrailView
                auditLogs={auditLogs}
                currentUser={currentUser}
                onSwitchToSuperadmin={() => handleSwitchRole('superadmin')}
              />
            </div>
          )}

          {/* TAB 7: STORAGE & PHOTO PRUNING */}
          {activeTab === 'storage' && storageMetrics && (
            <div className="w-full max-w-full overflow-hidden px-1.5 xs:px-2 sm:px-4 md:px-6 py-2 sm:py-3">
              <StoragePruningView
                metrics={storageMetrics}
                currentUser={currentUser}
                onPrunePhotos={handlePrunePhotos}
              />
            </div>
          )}

          {/* TAB 8: ARCHITECTURE & DDL SCHEMAS */}
          {activeTab === 'architecture' && (
            <div className="w-full max-w-full overflow-hidden px-1.5 xs:px-2 sm:px-4 md:px-6 py-2 sm:py-3">
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
        {isUploadAccomplishmentModalOpen && (
          <UploadAccomplishmentModal
            isOpen={isUploadAccomplishmentModalOpen}
            onClose={() => {
              setIsUploadAccomplishmentModalOpen(false);
              setUploadBeneficiaryTarget(null);
            }}
            beneficiary={
              uploadBeneficiaryTarget ||
              beneficiaries[0] || {
                id: 'ben-001',
                beneCode: 'LD-BEN-2025-0107',
                firstName: 'Juan',
                lastName: 'Dela Cruz',
                nationalOrLocalId: 'LGU-DING-2025-0107',
                contactNumber: '0917-123-4567',
                barangay: 'Paltic',
                assignedCluster: 'Municipal Administrator',
                emergencyContactName: 'Family',
                emergencyContactPhone: '0917-123-4567',
                emergencyContactRelation: 'Spouse',
                photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                status: 'active',
                qrHash: 'qr-verified',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            }
            activity={
              targetActivity ||
              (uploadBeneficiaryTarget
                ? activities.find((a) => a.barangay === uploadBeneficiaryTarget.barangay)
                : null) ||
              activities[0] ||
              null
            }
            currentUser={currentUser}
            onSubmitAttendance={handleSubmitAttendance}
            onSuccessSubmitted={(att) => {
              setAttendances((prev) => [att, ...prev.filter((a) => a.id !== att.id)]);
              showToast(`Nai-upload ang accomplishment pictures ni ${att.beneficiaryName}!`, 'success');
              try {
                window.history.replaceState({}, document.title, window.location.pathname);
              } catch(e){}
            }}
          />
        )}

        {/* Accomplishment Attendance Records Modal (Admin & Super Admin) */}
        <AccomplishmentAttendanceModal
          isOpen={isAccomplishmentModalOpen}
          onClose={() => setIsAccomplishmentModalOpen(false)}
          attendances={attendances}
          currentUser={currentUser}
          onDeleteAll={handleDeleteAllAttendances}
          onAutoPruneStale={handleAutoPruneMonthlyAttendances}
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
        <ErrorBoundary>
          {isGenerateQrModalOpen && (
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
        </ErrorBoundary>

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
          users={allUsers}
          activities={activities}
          onLogin={(userOrRole) => {
            handleLogin(userOrRole);
            setIsLoginModalOpen(false);
          }}
          onClose={() => setIsLoginModalOpen(false)}
          onOpenRegisterModal={() => setIsPersonalQrModalOpen(true)}
          onOpenUploadAccomplishment={(bene) => {
            const target = bene || uploadBeneficiaryTarget || beneficiaries[0] || {
              id: 'ben-001',
              beneCode: 'LD-BEN-2025-0107',
              firstName: 'Juan',
              lastName: 'Dela Cruz',
              nationalOrLocalId: 'LGU-DING-2025-0107',
              contactNumber: '0917-123-4567',
              barangay: 'Paltic',
              assignedCluster: 'Municipal Administrator',
              emergencyContactName: 'Family',
              emergencyContactPhone: '0917-123-4567',
              emergencyContactRelation: 'Spouse',
              photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              status: 'active',
              qrHash: 'qr-verified',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setUploadBeneficiaryTarget(target);
            setIsUploadAccomplishmentModalOpen(true);
          }}
          onOpenScanQrModal={() => setIsScanQrModalOpen(true)}
          onRegisterSuccess={(newBene) => {
            setBeneficiaries((prev) => [newBene, ...prev]);
            showToast(`Naka-register na si ${newBene.firstName} ${newBene.lastName}! Na-generate na ang kanyang Personal QR Code.`, 'success');
          }}
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

        {/* Admin-Only Anonymous Messages Inbox Modal */}
        {isAdminOrSuperAdmin && (
          <AdminAnonymousInboxModal
            isOpen={isAnonymousInboxModalOpen}
            onClose={() => setIsAnonymousInboxModalOpen(false)}
            currentUser={currentUser}
            messages={anonymousMessages}
            onRefreshMessages={() => {
              api.getAnonymousMessages().then((res) => setAnonymousMessages(res.messages || []));
            }}
            onOpenBroadcastModal={() => setIsGenerateQrModalOpen(true)}
          />
        )}

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
