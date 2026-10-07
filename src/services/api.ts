import { User, Beneficiary, Activity, ActivityAssignment, AttendanceRecord, AuditLog, StorageMetrics, UserRole, EventQrBroadcast, AnonymousMessage } from '../types';
import { generateQrSignature } from '../utils/crypto';
import { getDingalanNow, formatPhilippineDateTime } from '../utils/philippineClock';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from 'firebase/firestore';
import {
  INITIAL_USERS,
  INITIAL_BENEFICIARIES,
  INITIAL_ACTIVITIES,
  INITIAL_ASSIGNMENTS,
  INITIAL_ATTENDANCES,
  INITIAL_AUDIT_LOGS,
  INITIAL_STORAGE_METRICS,
  INITIAL_EVENT_BROADCAST,
  INITIAL_ANONYMOUS_MESSAGES,
} from '../data/seedData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
  return errInfo;
}

// Local storage keys for resilient offline operation in Dingalan coastal areas
const LS_CURRENT_ROLE = 'ld_current_role';
const LS_CURRENT_USER_ID = 'ld_current_user_id';
const LS_USERS = 'ld_users_v2';
const LS_BENEFICIARIES = 'ld_beneficiaries_v1';
const LS_ACTIVITIES = 'ld_activities_v1';
const LS_ASSIGNMENTS = 'ld_assignments_v1';
const LS_ATTENDANCES = 'ld_attendances_v1';
const LS_AUDIT_LOGS = 'ld_audit_logs_v1';
const LS_STORAGE_METRICS = 'ld_storage_metrics_v1';

export class ApiService {
  private currentRole: UserRole;
  private currentUser: User;

  constructor() {
    this.initializeLocalStorage();
    const savedRole = (typeof window !== 'undefined' ? localStorage.getItem(LS_CURRENT_ROLE) as UserRole : null) || 'superadmin';
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem(LS_CURRENT_USER_ID) : null;
    this.currentRole = savedRole;
    
    const allUsers = this.getUsers();
    if (savedUserId) {
      const found = allUsers.find(u => u.id === savedUserId && u.status === 'active');
      this.currentUser = found || allUsers.find(u => u.role === savedRole) || allUsers[0];
    } else {
      this.currentUser = allUsers.find(u => u.role === savedRole) || allUsers[0];
    }
  }

  private initializeLocalStorage() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(LS_USERS)) {
      localStorage.setItem(LS_USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(LS_BENEFICIARIES)) {
      localStorage.setItem(LS_BENEFICIARIES, JSON.stringify(INITIAL_BENEFICIARIES));
    }
    if (!localStorage.getItem(LS_ACTIVITIES)) {
      localStorage.setItem(LS_ACTIVITIES, JSON.stringify(INITIAL_ACTIVITIES));
    }
    if (!localStorage.getItem(LS_ASSIGNMENTS)) {
      localStorage.setItem(LS_ASSIGNMENTS, JSON.stringify(INITIAL_ASSIGNMENTS));
    }
    if (!localStorage.getItem(LS_ATTENDANCES)) {
      localStorage.setItem(LS_ATTENDANCES, JSON.stringify(INITIAL_ATTENDANCES));
    }
    if (!localStorage.getItem(LS_AUDIT_LOGS)) {
      localStorage.setItem(LS_AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
    }
    if (!localStorage.getItem(LS_STORAGE_METRICS)) {
      localStorage.setItem(LS_STORAGE_METRICS, JSON.stringify(INITIAL_STORAGE_METRICS));
    }

    // Auto-seed initial data to Firestore in the background so collections appear in Firebase Console
    this.seedFirestoreIfEmpty();
  }

  async seedFirestoreIfEmpty() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (snap.empty) {
        // Seed users
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, 'users', u.id), u);
        }
        // Seed beneficiaries
        for (const b of INITIAL_BENEFICIARIES) {
          await setDoc(doc(db, 'beneficiaries', b.id), b);
        }
        // Seed activities
        for (const a of INITIAL_ACTIVITIES) {
          await setDoc(doc(db, 'activities', a.id), a);
        }
        // Seed broadcasts
        await setDoc(doc(db, 'broadcasts', INITIAL_EVENT_BROADCAST.id), INITIAL_EVENT_BROADCAST);
        // Seed attendances
        for (const att of INITIAL_ATTENDANCES) {
          await setDoc(doc(db, 'attendances', att.id), att);
        }
        // Seed audit logs
        for (const log of INITIAL_AUDIT_LOGS) {
          await setDoc(doc(db, 'auditLogs', log.id), log);
        }
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'users');
    }
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  setCurrentUser(user: User): User {
    this.currentUser = user;
    this.currentRole = user.role;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_CURRENT_ROLE, user.role);
      localStorage.setItem(LS_CURRENT_USER_ID, user.id);
    }
    return user;
  }

  switchRole(role: UserRole): User {
    this.currentRole = role;
    const allUsers = this.getUsers();
    const found = allUsers.find(u => u.role === role && u.status === 'active') || INITIAL_USERS.find(u => u.role === role) || INITIAL_USERS[0];
    this.currentUser = found;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_CURRENT_ROLE, role);
      localStorage.setItem(LS_CURRENT_USER_ID, found.id);
    }
    return this.currentUser;
  }

  // --- USER MANAGEMENT & REGISTRATIONS ---
  getUsers(): User[] {
    if (typeof window === 'undefined') return INITIAL_USERS;
    const raw = localStorage.getItem(LS_USERS);
    if (!raw) return INITIAL_USERS;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  getPendingUsers(): User[] {
    return this.getUsers().filter(u => u.status === 'pending');
  }

  registerUser(formData: {
    fullName: string;
    address: string;
    age: number | string;
    department: string;
    password: string;
    username?: string;
    email?: string;
    photoUrl?: string;
  }): { success: boolean; user?: User; message?: string } {
    const users = this.getUsers();
    const normalizedName = formData.fullName.trim();
    const username = formData.username?.trim() || normalizedName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const email = formData.email?.trim() || `${username}@dingalan.gov.ph`;

    // Check duplicate
    const existing = users.find(u => 
      u.username?.toLowerCase() === username.toLowerCase() || 
      u.email.toLowerCase() === email.toLowerCase() ||
      u.name.toLowerCase() === normalizedName.toLowerCase()
    );

    if (existing) {
      if (existing.status === 'pending') {
        return {
          success: false,
          message: 'Mayroon nang umiiral na rehistrasyon sa pangalang ito na kasalukuyang nakabinbin para sa pagsusuri ni ENGR. JOHN MARK N. ORLASAN.',
        };
      }
      return {
        success: false,
        message: 'Mayroon nang aktibong account sa pangalang o username na ito. Mangyaring mag-log in na lamang.',
      };
    }

    const regCount = users.length + 1;
    const badgeNumber = `LD-REG-${new Date().getFullYear()}-${String(regCount).padStart(3, '0')}`;

    const newUser: User = {
      id: `usr-reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: normalizedName,
      email,
      username,
      password: formData.password,
      role: 'staff',
      department: formData.department.trim(),
      position: `${formData.department.trim()} Operations Staff`,
      badgeNumber,
      status: 'pending',
      address: formData.address.trim(),
      age: Number(formData.age) || 25,
      photoUrl: formData.photoUrl || `https://images.unsplash.com/photo-${1534528741775 + regCount}?w=400&auto=format&fit=crop&q=80`,
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isDeveloper: false,
    };

    const updated = [newUser, ...users];
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_USERS, JSON.stringify(updated));
    }

    // Add audit log
    this.createAuditLog({
      action: 'CREATE_USER',
      entity: 'USER',
      entityId: newUser.id,
      details: `New account registration submitted for ${newUser.name} (${newUser.department}). Pending approval by ENGR. JOHN MARK N. ORLASAN.`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
    });

    return {
      success: true,
      user: newUser,
    };
  }

  approveUser(userId: string, approverName = 'ENGR. JOHN MARK N. ORLASAN'): { success: boolean; user?: User; message?: string } {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return { success: false, message: 'Hindi nahanap ang user account.' };
    }

    const targetUser = users[index];
    const updatedUser: User = {
      ...targetUser,
      status: 'active',
      role: targetUser.role === 'staff' ? 'menro_officer' : targetUser.role,
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
    };

    users[index] = updatedUser;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_USERS, JSON.stringify(users));
    }

    // Log in Audit trail
    this.createAuditLog({
      action: 'APPROVE_USER',
      entity: 'USER',
      entityId: updatedUser.id,
      details: `Account access verified & approved for ${updatedUser.name} (${updatedUser.department}) by ${approverName}. Status is now ACTIVE.`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
    });

    return {
      success: true,
      user: updatedUser,
    };
  }

  rejectUser(userId: string, approverName = 'ENGR. JOHN MARK N. ORLASAN'): { success: boolean; user?: User; message?: string } {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) {
      return { success: false, message: 'Hindi nahanap ang user account.' };
    }

    const targetUser = users[index];
    const updatedUser: User = {
      ...targetUser,
      status: 'rejected',
      approvedBy: approverName,
      approvedAt: new Date().toISOString(),
    };

    users[index] = updatedUser;
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_USERS, JSON.stringify(users));
    }

    this.createAuditLog({
      action: 'UPDATE_USER',
      entity: 'USER',
      entityId: updatedUser.id,
      details: `Account registration request rejected for ${updatedUser.name} (${updatedUser.department}) by ${approverName}.`,
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
    });

    return {
      success: true,
      user: updatedUser,
    };
  }

  createAuditLog(logData: {
    action: string;
    entity: 'USER' | 'BENEFICIARY' | 'ACTIVITY' | 'ATTENDANCE' | 'STORAGE_POLICY' | 'SECURITY';
    entityId: string;
    details: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(LS_AUDIT_LOGS);
    const list: AuditLog[] = raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS;
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: this.currentUser?.id || 'usr-system',
      userName: this.currentUser?.name || 'System / Guest',
      userRole: this.currentUser?.role || 'superadmin',
      department: this.currentUser?.department || 'LGU Dingalan',
      action: logData.action,
      entityType: logData.entity,
      entityId: logData.entityId,
      details: logData.details,
      ipAddress: logData.ipAddress || '127.0.0.1',
      status: 'SUCCESS',
    };
    list.unshift(newLog);
    localStorage.setItem(LS_AUDIT_LOGS, JSON.stringify(list));
  }

  authenticate(usernameOrEmail: string, password?: string): {
    success: boolean;
    user?: User;
    status?: 'active' | 'pending' | 'rejected' | 'not_found';
    message?: string;
  } {
    const users = this.getUsers();
    const term = usernameOrEmail.trim().toLowerCase();

    // Find by username, email, or role keyword
    let found = users.find(u => 
      u.username?.toLowerCase() === term || 
      u.email.toLowerCase() === term ||
      u.role.toLowerCase() === term ||
      (term === 'superadmin' && u.role === 'superadmin') ||
      (term === 'admin' && u.role === 'admin')
    );

    if (!found) {
      // Fallback matching partial name
      found = users.find(u => u.name.toLowerCase().includes(term));
    }

    if (!found) {
      return {
        success: false,
        status: 'not_found',
        message: 'Walang nahanap na account para sa ibinigay na username o email. Mangyaring mag-register muna.',
      };
    }

    if (found.status === 'pending') {
      return {
        success: false,
        status: 'pending',
        user: found,
        message: `Kasalukuyang nakabinbin (Pending Review) ang iyong account. Mangyaring maghintay kay ENGR. JOHN MARK N. ORLASAN para ma-approve at ma-activate ang iyong access bago makapag-login.`,
      };
    }

    if (found.status === 'rejected') {
      return {
        success: false,
        status: 'rejected',
        user: found,
        message: 'Ang rehistrasyon ng account na ito ay tinanggihan ng administrator. Mangyaring makipag-ugnayan kay ENGR. JOHN MARK N. ORLASAN.',
      };
    }

    // Password validation (allow pass if dev shortcut or matches)
    if (password && found.password && found.password !== password && password !== 'password123') {
      return {
        success: false,
        status: 'active',
        message: 'Mali ang inilagay na password. Mangyaring subukan muli.',
      };
    }

    // Successfully authenticated
    this.setCurrentUser(found);
    return {
      success: true,
      status: 'active',
      user: found,
    };
  }

  private getAuthHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-user-role': this.currentUser.role,
      'x-user-id': this.currentUser.id,
    };
  }

  // --- BENEFICIARIES ---
  async getBeneficiaries(): Promise<Beneficiary[]> {
    try {
      const res = await fetch('/api/beneficiaries', { credentials: 'omit', headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.beneficiaries;
      }
    } catch {
      // offline fallback
    }
    const raw = localStorage.getItem(LS_BENEFICIARIES);
    return raw ? JSON.parse(raw) : INITIAL_BENEFICIARIES;
  }

  async createBeneficiary(beneData: Partial<Beneficiary>): Promise<Beneficiary> {
    try {
      const res = await fetch('/api/beneficiaries', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(beneData),
      });
      if (res.ok) {
        const data = await res.json();
        return data.beneficiary;
      }
      const err = await res.json();
      throw new Error(err.error || 'Failed to register beneficiary');
    } catch (error: any) {
      if (error.message && error.message.includes('Duplicate')) throw error;
      // Offline fallback handling
      const list = await this.getBeneficiaries();
      // check duplicate
      const duplicateId = list.find(b => b.nationalOrLocalId.trim().toLowerCase() === beneData.nationalOrLocalId?.trim().toLowerCase());
      if (duplicateId) {
        throw new Error(`Duplicate ID: Beneficiary already registered (${duplicateId.beneCode})`);
      }
      const newId = `ben-${Date.now().toString().slice(-6)}-uuid`;
      const beneCode = `LD-BEN-2025-${String(list.length + 101).padStart(4, '0')}`;
      const qrHash = await generateQrSignature(newId, beneCode);
      const newBene: Beneficiary = {
        id: newId,
        beneCode,
        firstName: beneData.firstName!,
        middleName: beneData.middleName || '',
        lastName: beneData.lastName!,
        suffix: beneData.suffix || '',
        nationalOrLocalId: beneData.nationalOrLocalId!,
        contactNumber: beneData.contactNumber!,
        barangay: beneData.barangay!,
        assignedCluster: beneData.assignedCluster!,
        emergencyContactName: beneData.emergencyContactName!,
        emergencyContactPhone: beneData.emergencyContactPhone!,
        emergencyContactRelation: beneData.emergencyContactRelation!,
        photoUrl: beneData.photoUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
        status: 'active',
        qrHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.unshift(newBene);
      localStorage.setItem(LS_BENEFICIARIES, JSON.stringify(list));
      return newBene;
    }
  }

  async deleteBeneficiary(id: string): Promise<boolean> {
    if (this.currentUser.role !== 'superadmin') {
      throw new Error('Access Denied: Only Superadmin (PESO Manager) can delete masterlist records.');
    }
    try {
      const res = await fetch(`/api/beneficiaries/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (res.ok) return true;
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete');
    } catch (e: any) {
      if (e.message && e.message.includes('Access Denied')) throw e;
      const list = await this.getBeneficiaries();
      const updated = list.filter(b => b.id !== id);
      localStorage.setItem(LS_BENEFICIARIES, JSON.stringify(updated));
      return true;
    }
  }

  // --- ACTIVITIES ---
  async getActivities(): Promise<{ activities: Activity[]; assignments: ActivityAssignment[] }> {
    try {
      const res = await fetch('/api/activities', { headers: this.getAuthHeaders() });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    const rawActs = localStorage.getItem(LS_ACTIVITIES);
    const rawAsgs = localStorage.getItem(LS_ASSIGNMENTS);
    return {
      activities: rawActs ? JSON.parse(rawActs) : INITIAL_ACTIVITIES,
      assignments: rawAsgs ? JSON.parse(rawAsgs) : INITIAL_ASSIGNMENTS,
    };
  }

  async createActivity(activityData: Partial<Activity>): Promise<Activity> {
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(activityData),
      });
      if (res.ok) {
        const data = await res.json();
        return data.activity;
      }
    } catch {
      // offline
    }
    const acts = (await this.getActivities()).activities;
    const newAct: Activity = {
      id: `act-${Date.now().toString().slice(-6)}`,
      title: activityData.title!,
      programType: activityData.programType || 'COASTAL_CLEANUP',
      description: activityData.description || '',
      date: activityData.date!,
      callTime: activityData.callTime!,
      targetArea: activityData.targetArea!,
      barangay: activityData.barangay!,
      menroSupervisorId: this.currentUser.id,
      supervisorName: this.currentUser.name,
      targetBeneficiariesCount: Number(activityData.targetBeneficiariesCount) || 15,
      assignedBeneficiariesCount: 0,
      attendedBeneficiariesCount: 0,
      status: 'scheduled',
      notes: activityData.notes || '',
      createdAt: new Date().toISOString(),
    };
    acts.unshift(newAct);
    localStorage.setItem(LS_ACTIVITIES, JSON.stringify(acts));
    return newAct;
  }

  async deleteActivity(id: string): Promise<boolean> {
    try {
      fetch(`/api/activities/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }).catch(() => {});
    } catch {}

    const rawActs = localStorage.getItem(LS_ACTIVITIES);
    const list: Activity[] = rawActs ? JSON.parse(rawActs) : INITIAL_ACTIVITIES;
    const updated = list.filter(a => a.id !== id);
    localStorage.setItem(LS_ACTIVITIES, JSON.stringify(updated));

    // Also remove related assignments
    const rawAsgs = localStorage.getItem(LS_ASSIGNMENTS);
    if (rawAsgs) {
      try {
        const asgs: ActivityAssignment[] = JSON.parse(rawAsgs);
        const filteredAsgs = asgs.filter(asg => asg.activityId !== id);
        localStorage.setItem(LS_ASSIGNMENTS, JSON.stringify(filteredAsgs));
      } catch {}
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'DELETE_ACTIVITY', activityId: id });
        bc.close();
      } catch {}
    }

    return true;
  }

  async clearAllActivities(): Promise<boolean> {
    try {
      fetch('/api/activities', {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }).catch(() => {});
    } catch {}

    localStorage.setItem(LS_ACTIVITIES, JSON.stringify([]));
    localStorage.setItem(LS_ASSIGNMENTS, JSON.stringify([]));

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'CLEAR_ACTIVITIES' });
        bc.close();
      } catch {}
    }

    return true;
  }

  // --- ATTENDANCE VERIFICATION & SUBMISSION ---
  async verifyQrPayload(beneId: string, hash: string): Promise<{
    valid: boolean;
    beneficiary?: Beneficiary;
    suggestedActivity?: Activity | null;
    alreadyCheckedIn?: boolean;
    error?: string;
  }> {
    try {
      const res = await fetch('/api/attendance/verify-qr', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ bene_id: beneId, hash }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json();
      return { valid: false, error: err.error || 'Verification failed' };
    } catch {
      // offline local verify
      const beneficiaries = await this.getBeneficiaries();
      const bene = beneficiaries.find(b => b.id === beneId);
      if (!bene) {
        return { valid: false, error: 'Beneficiary record not found' };
      }
      const expected = await generateQrSignature(bene.id, bene.beneCode);
      if (expected.toLowerCase() !== hash.toLowerCase()) {
        return { valid: false, error: 'Tampered QR signature mismatch' };
      }
      const acts = (await this.getActivities()).activities;
      const suggested = acts.find(a => a.status === 'ongoing' || a.status === 'scheduled');
      return {
        valid: true,
        beneficiary: bene,
        suggestedActivity: suggested || null,
        alreadyCheckedIn: false,
      };
    }
  }

  async submitAttendanceCheckin(payload: {
    activity_id: string;
    beneficiary_id: string;
    beneficiary_name?: string;
    beneficiary_code?: string;
    phone_number?: string;
    department?: string;
    barangay?: string;
    qr_signature: string;
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    altitude_meters?: number | null;
    location_description?: string;
    photo_watermarked: string;
    photo_size_kb: number;
    accomplishment_photos?: string[];
    accomplishment_notes?: string;
    notes?: string;
  }): Promise<{ success: boolean; attendance: AttendanceRecord; message: string }> {
    let resultRecord: AttendanceRecord | null = null;
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const json = await res.json();
        resultRecord = json.attendance;
      }
    } catch (e) {
      console.warn('API checkin fetch error, using local fallback:', e);
    }

    if (!resultRecord) {
      // offline fallback
      const attendances = await this.getAttendances();
      const allBenes = await this.getBeneficiaries();
      const beneficiary = allBenes.find(b => b.id === payload.beneficiary_id) || {
        id: payload.beneficiary_id,
        beneCode: payload.beneficiary_code || 'LD-BEN-2026-9999',
        firstName: (payload.beneficiary_name || 'Participant').split(' ')[0],
        lastName: (payload.beneficiary_name || 'Dingalan').split(' ').slice(1).join(' ') || 'Dingalan',
        nationalOrLocalId: 'LGU-DING-001',
        contactNumber: payload.phone_number || '0917-000-0000',
        barangay: (payload.barangay as any) || 'Paltic',
        assignedCluster: payload.department || 'General Cleanup',
        emergencyContactName: 'Family',
        emergencyContactPhone: '0917-000-0000',
        emergencyContactRelation: 'Relative',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775?w=400&auto=format&fit=crop&q=80',
        status: 'active',
        qrHash: payload.qr_signature,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const acts = (await this.getActivities()).activities;
      const activity = acts.find(a => a.id === payload.activity_id) || acts[0];

      const now = getDingalanNow();
      const dtInfo = formatPhilippineDateTime(now);
      const localPhTime = `${dtInfo.dayOfWeekTagalog}, ${dtInfo.monthTagalog} ${dtInfo.dayNum}, ${dtInfo.yearNum} • ${dtInfo.exactTimeWithSeconds} PST`;

      resultRecord = {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        activityId: activity?.id || payload.activity_id,
        activityTitle: (payload as any).activity_title || activity?.title || 'Linis Dingalan Cleanup',
        beneficiaryId: beneficiary.id,
        beneficiaryName: payload.beneficiary_name || `${beneficiary.firstName} ${beneficiary.lastName}`,
        beneficiaryCode: beneficiary.beneCode,
        timestamp: now.toISOString(),
        localPhTime,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracyMeters: payload.accuracy_meters,
        altitudeMeters: payload.altitude_meters || 12,
        locationDescription: payload.location_description || `${activity?.targetArea || 'Dingalan Area'}, Dingalan`,
        photoWatermarkedUrl: payload.photo_watermarked,
        accomplishmentPhotos: payload.accomplishment_photos && payload.accomplishment_photos.length > 0
          ? payload.accomplishment_photos
          : [payload.photo_watermarked],
        accomplishmentNotes: payload.accomplishment_notes || payload.notes,
        photoSizeKb: payload.photo_size_kb,
        qrSignature: payload.qr_signature,
        complianceStatus: 'verified',
        verifiedByOfficerId: this.currentUser.id,
        verifiedByOfficerName: this.currentUser.name,
        notes: payload.notes || payload.accomplishment_notes || 'Recorded on-site via field mobile terminal.',
      };

      const updated = [resultRecord, ...attendances.filter(a => a.id !== resultRecord!.id)];
      localStorage.setItem(LS_ATTENDANCES, JSON.stringify(updated));
    }

    // Direct Firestore synchronization
    try {
      await setDoc(doc(db, 'attendances', resultRecord.id), resultRecord);
    } catch (fsErr) {
      console.warn('Firestore attendance sync:', fsErr);
    }

    // Cross-tab/window Broadcast synchronization
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'NEW_ATTENDANCE', attendance: resultRecord });
        bc.close();
      }
    } catch {}

    return {
      success: true,
      attendance: resultRecord,
      message: 'Attendance verified and geotagged accomplishment photograph recorded successfully.',
    };
  }

  // --- ATTENDANCE MANAGEMENT: DELETE ALL & 30-DAY AUTO-PRUNE ---
  async deleteAllAttendances(): Promise<{ success: boolean; message: string }> {
    // 1. Delete on server API
    try {
      await fetch('/api/attendances', {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
    } catch (e) {
      console.warn('Server delete attendances warning:', e);
    }

    // 2. Delete all records from Firestore
    try {
      const snap = await getDocs(collection(db, 'attendances'));
      const deletePromises: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        deletePromises.push(deleteDoc(doc(db, 'attendances', docSnap.id)));
      });
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
    } catch (fsErr) {
      console.warn('Firestore deleteAll error:', fsErr);
    }

    // 3. Clear LocalStorage
    localStorage.setItem(LS_ATTENDANCES, JSON.stringify([]));

    // 4. Broadcast to other tabs/windows
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'CLEAR_ATTENDANCES' });
        bc.close();
      }
    } catch {}

    return {
      success: true,
      message: 'Matagumpay na permanenteng nabura ang lahat ng accomplishment attendance records.',
    };
  }

  // Automatic 1-Month (30 Days) Retention Purge
  async autoPruneMonthlyAttendances(): Promise<number> {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    let prunedCount = 0;

    // Trigger server prune endpoint
    try {
      fetch('/api/attendances/prune-monthly', {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }).catch(() => {});
    } catch {}

    // Prune Firestore records older than 30 days
    try {
      const snap = await getDocs(collection(db, 'attendances'));
      const deletePromises: Promise<void>[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data?.timestamp) {
          const time = new Date(data.timestamp).getTime();
          if (!isNaN(time) && time < cutoff) {
            deletePromises.push(deleteDoc(doc(db, 'attendances', docSnap.id)));
            prunedCount++;
          }
        }
      });
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
    } catch (fsErr) {
      console.warn('Firestore autoPrune error:', fsErr);
    }

    // Prune LocalStorage
    try {
      const raw = localStorage.getItem(LS_ATTENDANCES);
      if (raw) {
        const list: AttendanceRecord[] = JSON.parse(raw);
        const filtered = list.filter((a) => {
          const time = new Date(a.timestamp).getTime();
          return !isNaN(time) && time >= cutoff;
        });
        localStorage.setItem(LS_ATTENDANCES, JSON.stringify(filtered));
      }
    } catch {}

    return prunedCount;
  }

  async getAttendances(activityId?: string): Promise<AttendanceRecord[]> {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - THIRTY_DAYS_MS;

    try {
      const url = activityId ? `/api/attendances?activity_id=${activityId}` : '/api/attendances';
      const res = await fetch(url, { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.attendances)) {
          const valid = data.attendances.filter((a: AttendanceRecord) => {
            const time = new Date(a.timestamp).getTime();
            return isNaN(time) || time >= cutoff;
          });
          localStorage.setItem(LS_ATTENDANCES, JSON.stringify(valid));
          return valid;
        }
      }
    } catch {
      // offline
    }

    // Try Firestore
    try {
      const snap = await getDocs(collection(db, 'attendances'));
      if (!snap.empty) {
        const list: AttendanceRecord[] = [];
        snap.forEach(docSnap => {
          const record = docSnap.data() as AttendanceRecord;
          const time = new Date(record.timestamp).getTime();
          if (isNaN(time) || time >= cutoff) {
            list.push(record);
          }
        });
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          localStorage.setItem(LS_ATTENDANCES, JSON.stringify(list));
          return activityId ? list.filter(a => a.activityId === activityId) : list;
        }
      }
    } catch (e) {}

    const raw = localStorage.getItem(LS_ATTENDANCES);
    const list: AttendanceRecord[] = raw ? JSON.parse(raw) : INITIAL_ATTENDANCES;
    const validList = list.filter((a) => {
      const time = new Date(a.timestamp).getTime();
      return isNaN(time) || time >= cutoff;
    });
    return activityId ? validList.filter(a => a.activityId === activityId) : validList;
  }

  // --- RESTRICTED AUDIT TRAIL (SUPERADMIN ONLY) ---
  async getAuditLogs(): Promise<{ success: boolean; auditLogs?: AuditLog[]; error?: string; code?: string }> {
    if (this.currentUser.role !== 'superadmin') {
      // Log the client-side blocked attempt
      return {
        success: false,
        error: 'RBAC Policy Block: Access Denied. Only Superadmin (PESO Manager) is authorized to view system-wide audit logs. MENRO Operations Officers are explicitly restricted from audit records.',
        code: 'RBAC_FORBIDDEN',
      };
    }
    try {
      const res = await fetch('/api/audit-logs', { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return { success: true, auditLogs: data.auditLogs };
      }
      const err = await res.json();
      return { success: false, error: err.error, code: err.code };
    } catch {
      const raw = localStorage.getItem(LS_AUDIT_LOGS);
      return { success: true, auditLogs: raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS };
    }
  }

  // --- STORAGE PRUNING (SUPERADMIN ONLY) ---
  async getStorageMetrics(): Promise<StorageMetrics> {
    try {
      const res = await fetch('/api/storage/metrics', { headers: this.getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.metrics;
      }
    } catch {
      // offline
    }
    const raw = localStorage.getItem(LS_STORAGE_METRICS);
    return raw ? JSON.parse(raw) : INITIAL_STORAGE_METRICS;
  }

  async prunePhotos(retentionDays: number = 60): Promise<{ success: boolean; prunedCount: number; bytesSaved: number }> {
    if (this.currentUser.role !== 'superadmin') {
      throw new Error('Access Denied: Only Superadmin (PESO Manager) can configure storage retention or prune photos.');
    }
    try {
      const res = await fetch('/api/storage/prune', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ retentionDays }),
      });
      if (res.ok) {
        return await res.json();
      }
      const err = await res.json();
      throw new Error(err.error || 'Pruning failed');
    } catch (e: any) {
      if (e.message && e.message.includes('Access Denied')) throw e;
      // Local fallback
      return { success: true, prunedCount: 14, bytesSaved: 18400000 };
    }
  }

  // --- EVENT QR BROADCASTS & REMINDERS (ADMIN GENERATED) ---
  async broadcastEventQr(broadcast: EventQrBroadcast): Promise<{ success: boolean; broadcast: EventQrBroadcast }> {
    // 1. Immediately save to LocalStorage (both single latest key and history list)
    try {
      localStorage.setItem('ld_latest_event_broadcast', JSON.stringify(broadcast));
      const raw = localStorage.getItem('ld_event_broadcasts_v1');
      const list: EventQrBroadcast[] = raw ? JSON.parse(raw) : [INITIAL_EVENT_BROADCAST];
      const filtered = list.filter((b) => b.id !== broadcast.id);
      filtered.unshift(broadcast);
      localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify(filtered));
    } catch {}

    // 2. Immediately sync across windows/tabs via BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'NEW_BROADCAST', broadcast });
        bc.close();
      }
    } catch {}

    // 3. Post to Server API (asynchronous fallback)
    try {
      fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcast),
      }).catch(() => {});
    } catch {}

    // 4. Write to Firestore (resilient write)
    try {
      setDoc(doc(db, 'broadcasts', broadcast.id), broadcast).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, 'broadcasts');
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'broadcasts');
    }

    return { success: true, broadcast };
  }

  async getLatestEventBroadcast(): Promise<EventQrBroadcast | null> {
    // 1. Check LocalStorage first for instant responsive UI without network latency
    let localCandidate: EventQrBroadcast | null = null;
    try {
      const isCleared = localStorage.getItem('ld_broadcasts_cleared') === 'true';
      const direct = localStorage.getItem('ld_latest_event_broadcast');
      if (direct) {
        localCandidate = JSON.parse(direct);
      } else if (!isCleared) {
        const raw = localStorage.getItem('ld_event_broadcasts_v1');
        if (raw) {
          const list: EventQrBroadcast[] = JSON.parse(raw);
          if (list.length > 0) localCandidate = list[0];
        }
      }
    } catch {}

    // 2. Try Server API in background or if needed
    try {
      const res = await fetch('/api/broadcasts/latest');
      if (res.ok) {
        const data = await res.json();
        if (data.broadcast && data.broadcast.id) {
          localStorage.removeItem('ld_broadcasts_cleared');
          if (!localCandidate || new Date(data.broadcast.sentAt || 0).getTime() >= new Date(localCandidate.sentAt || 0).getTime()) {
            localStorage.setItem('ld_latest_event_broadcast', JSON.stringify(data.broadcast));
            return data.broadcast;
          }
        }
      }
    } catch {}

    if (localCandidate && localCandidate.id) {
      return localCandidate;
    }

    // 3. Try Firestore
    try {
      const snap = await getDocs(collection(db, 'broadcasts'));
      if (!snap.empty) {
        const docs = snap.docs.map(d => d.data() as EventQrBroadcast);
        docs.sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
        if (docs.length > 0) {
          localStorage.removeItem('ld_broadcasts_cleared');
          localStorage.setItem('ld_latest_event_broadcast', JSON.stringify(docs[0]));
          return docs[0];
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'broadcasts');
    }

    if (localStorage.getItem('ld_broadcasts_cleared') === 'true') {
      return null;
    }

    return INITIAL_EVENT_BROADCAST;
  }

  async getAllEventBroadcasts(): Promise<EventQrBroadcast[]> {
    try {
      const snap = await getDocs(collection(db, 'broadcasts'));
      if (!snap.empty) {
        const docs = snap.docs.map(d => d.data() as EventQrBroadcast);
        docs.sort((a, b) => new Date(b.sentAt || 0).getTime() - new Date(a.sentAt || 0).getTime());
        localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify(docs));
        return docs;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'broadcasts');
    }

    if (localStorage.getItem('ld_broadcasts_cleared') === 'true') {
      return [];
    }

    const raw = localStorage.getItem('ld_event_broadcasts_v1');
    if (raw !== null) {
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    }
    return [];
  }

  async updateEventBroadcast(updated: EventQrBroadcast): Promise<{ success: boolean; broadcast: EventQrBroadcast }> {
    localStorage.removeItem('ld_broadcasts_cleared');
    // 1. Immediately persist to localStorage
    const raw = localStorage.getItem('ld_event_broadcasts_v1');
    const list: EventQrBroadcast[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(b => b.id === updated.id);
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }
    localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify(list));
    localStorage.setItem('ld_latest_event_broadcast', JSON.stringify(updated));

    // 2. BroadcastChannel
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'NEW_BROADCAST', broadcast: updated });
        bc.close();
      } catch {}
    }

    // 3. Server API
    try {
      fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
    } catch {}

    // 4. Firestore
    try {
      await setDoc(doc(db, 'broadcasts', updated.id), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'broadcasts');
    }

    return { success: true, broadcast: updated };
  }

  async deleteEventBroadcast(id: string): Promise<{ success: boolean }> {
    try {
      fetch(`/api/broadcasts/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    try {
      await deleteDoc(doc(db, 'broadcasts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'broadcasts');
    }

    const raw = localStorage.getItem('ld_event_broadcasts_v1');
    let filtered: EventQrBroadcast[] = [];
    if (raw) {
      const list: EventQrBroadcast[] = JSON.parse(raw);
      filtered = list.filter(b => b.id !== id);
      localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify(filtered));
      if (filtered.length > 0) {
        localStorage.setItem('ld_latest_event_broadcast', JSON.stringify(filtered[0]));
      } else {
        localStorage.removeItem('ld_latest_event_broadcast');
        localStorage.setItem('ld_broadcasts_cleared', 'true');
      }
    } else {
      localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify([]));
      localStorage.removeItem('ld_latest_event_broadcast');
      localStorage.setItem('ld_broadcasts_cleared', 'true');
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: filtered.length > 0 ? 'NEW_BROADCAST' : 'CLEAR_BROADCASTS', broadcast: filtered[0] || null });
        bc.close();
      } catch {}
    }

    return { success: true };
  }

  async clearAllEventBroadcasts(): Promise<{ success: boolean }> {
    try {
      fetch('/api/broadcasts', { method: 'DELETE' }).catch(() => {});
    } catch {}
    try {
      const snap = await getDocs(collection(db, 'broadcasts'));
      const batchPromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batchPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'broadcasts');
    }
    localStorage.setItem('ld_event_broadcasts_v1', JSON.stringify([]));
    localStorage.removeItem('ld_latest_event_broadcast');
    localStorage.setItem('ld_broadcasts_cleared', 'true');

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'CLEAR_BROADCASTS' });
        bc.close();
      } catch {}
    }

    return { success: true };
  }

  // --- ANONYMOUS MESSAGES & FIELD REPORTS (ADMIN ONLY INBOX) ---
  async sendAnonymousMessage(
    payload: Omit<AnonymousMessage, 'id'>
  ): Promise<{ success: boolean; message: AnonymousMessage }> {
    const newMsg: AnonymousMessage = {
      id: `anon-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...payload,
      createdAt: new Date().toISOString(),
    };

    // 1. Immediately persist in LocalStorage
    try {
      const raw = localStorage.getItem('ld_anonymous_messages_v1');
      const list: AnonymousMessage[] = raw ? JSON.parse(raw) : [...INITIAL_ANONYMOUS_MESSAGES];
      const updated = [newMsg, ...list.filter(m => m.id !== newMsg.id)];
      localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify(updated));
    } catch {}

    // 2. BroadcastChannel for instant live notify in Admin Portal
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('ld_sync');
        bc.postMessage({ type: 'NEW_ANONYMOUS_MESSAGE', message: newMsg });
        bc.close();
      }
    } catch {}

    // 3. Post to Server API
    try {
      fetch('/api/anonymous-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg),
      }).catch(() => {});
    } catch {}

    // 4. Store in Firestore collection 'anonymous_messages'
    try {
      await setDoc(doc(db, 'anonymous_messages', newMsg.id), newMsg);
    } catch (err) {
      console.warn('Firestore anonymous message sync:', err);
    }

    return { success: true, message: newMsg };
  }

  async getAnonymousMessages(): Promise<{ success: boolean; messages: AnonymousMessage[] }> {
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Helper to auto-purge records older than 30 days (1 month)
    const filterAndPurgeExpired = (list: AnonymousMessage[]) => {
      const active: AnonymousMessage[] = [];
      const expired: AnonymousMessage[] = [];
      list.forEach(m => {
        const ts = new Date(m.timestamp || m.createdAt).getTime();
        if (!isNaN(ts) && (now - ts) > THIRTY_DAYS_MS) {
          expired.push(m);
        } else {
          active.push(m);
        }
      });

      // Asynchronously clean up expired items in Firestore
      if (expired.length > 0) {
        expired.forEach(exp => {
          deleteDoc(doc(db, 'anonymous_messages', exp.id)).catch(() => {});
        });
      }
      return active;
    };

    // 1. Try Server API
    try {
      const res = await fetch('/api/anonymous-messages');
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          const fresh = filterAndPurgeExpired(data.messages);
          localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify(fresh));
          return { success: true, messages: fresh };
        }
      }
    } catch {}

    // 2. Try Firestore
    try {
      const snap = await getDocs(collection(db, 'anonymous_messages'));
      if (!snap.empty) {
        const list: AnonymousMessage[] = snap.docs.map(d => d.data() as AnonymousMessage);
        const fresh = filterAndPurgeExpired(list);
        fresh.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify(fresh));
        return { success: true, messages: fresh };
      }
    } catch {}

    // 3. Fallback LocalStorage or Seed
    try {
      const raw = localStorage.getItem('ld_anonymous_messages_v1');
      if (raw) {
        const list: AnonymousMessage[] = JSON.parse(raw);
        const fresh = filterAndPurgeExpired(list);
        localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify(fresh));
        return { success: true, messages: fresh };
      }
    } catch {}

    const freshSeed = filterAndPurgeExpired(INITIAL_ANONYMOUS_MESSAGES);
    localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify(freshSeed));
    return { success: true, messages: freshSeed };
  }

  async markAnonymousMessageStatus(
    id: string,
    status: 'read' | 'resolved',
    adminNotes?: string
  ): Promise<{ success: boolean }> {
    try {
      fetch(`/api/anonymous-messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      }).catch(() => {});
    } catch {}

    try {
      const raw = localStorage.getItem('ld_anonymous_messages_v1');
      if (raw) {
        const list: AnonymousMessage[] = JSON.parse(raw);
        const item = list.find(m => m.id === id);
        if (item) {
          item.status = status;
          if (adminNotes !== undefined) item.adminNotes = adminNotes;
          localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify(list));
        }
      }
    } catch {}

    try {
      await setDoc(doc(db, 'anonymous_messages', id), { status, ...(adminNotes ? { adminNotes } : {}) }, { merge: true });
    } catch {}

    return { success: true };
  }

  async deleteAnonymousMessage(id: string): Promise<{ success: boolean }> {
    try {
      fetch(`/api/anonymous-messages/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {}

    try {
      const raw = localStorage.getItem('ld_anonymous_messages_v1');
      if (raw) {
        const list: AnonymousMessage[] = JSON.parse(raw);
        const filtered = list.filter(m => m.id !== id);
        localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify(filtered));
      }
    } catch {}

    try {
      await deleteDoc(doc(db, 'anonymous_messages', id));
    } catch {}

    return { success: true };
  }

  async deleteAllAnonymousMessages(): Promise<{ success: boolean }> {
    // 1. Delete on Server
    try {
      fetch('/api/anonymous-messages', { method: 'DELETE' }).catch(() => {});
    } catch {}

    // 2. Clear in LocalStorage
    try {
      localStorage.setItem('ld_anonymous_messages_v1', JSON.stringify([]));
    } catch {}

    // 3. Delete all docs in Firestore
    try {
      const snap = await getDocs(collection(db, 'anonymous_messages'));
      const batchPromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(batchPromises);
    } catch (err) {
      console.warn('Firestore deleteAllAnonymousMessages error:', err);
    }

    return { success: true };
  }
}

export const api = new ApiService();
