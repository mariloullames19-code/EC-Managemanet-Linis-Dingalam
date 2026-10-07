export type UserRole = 'superadmin' | 'admin' | 'menro_officer' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  department: string;
  position: string;
  badgeNumber: string;
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  address?: string;
  age?: number;
  photoUrl?: string;
  registeredAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  lastLogin?: string;
  createdAt: string;
  isDeveloper?: boolean;
}

export interface RegistrationFormData {
  fullName: string;
  address: string;
  age: number | string;
  department: string;
  password: string;
  confirmPassword?: string;
  username?: string;
  email?: string;
  photoUrl?: string;
}

export interface Beneficiary {
  id: string;
  beneCode: string; // e.g. LD-BEN-2025-0142
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  nationalOrLocalId: string;
  contactNumber: string;
  barangay: DingalanBarangay;
  assignedCluster: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  qrHash: string; // Cryptographic signature
  createdAt: string;
  updatedAt: string;
}

export type DingalanBarangay = 
  | 'Aplaya'
  | 'Butas na Bato'
  | 'Cabischasan'
  | 'Caragsacan'
  | 'Davil-davilan'
  | 'Dikapanikian'
  | 'Ibona'
  | 'Paltic'
  | 'Poblacion'
  | 'Tanawan'
  | 'Umiray';

export type ActivityStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Activity {
  id: string;
  title: string;
  programType: 'TUPAD' | 'CASH_FOR_WORK' | 'COASTAL_CLEANUP' | 'MANGROVE_REHAB' | 'DRAINAGE_DECLOGGING';
  description: string;
  date: string; // YYYY-MM-DD
  callTime: string; // HH:mm
  targetArea: string;
  barangay: DingalanBarangay;
  menroSupervisorId: string;
  supervisorName: string;
  targetBeneficiariesCount: number | string;
  assignedBeneficiariesCount: number;
  attendedBeneficiariesCount: number;
  status: ActivityStatus;
  notes?: string;
  createdAt: string;
}

export interface ActivityAssignment {
  id: string;
  activityId: string;
  beneficiaryId: string;
  assignedAt: string;
  status: 'assigned' | 'attended' | 'excused' | 'absent';
}

export interface AttendanceRecord {
  id: string;
  activityId: string;
  activityTitle: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryCode: string;
  timestamp: string; // ISO string
  localPhTime: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters: number | null;
  locationDescription: string;
  photoWatermarkedUrl: string; // Base64 or URL
  photoOriginalUrl?: string;
  accomplishmentPhotos?: string[]; // Multiple accomplishment proof photos
  accomplishmentNotes?: string;
  photoSizeKb: number;
  qrSignature: string;
  complianceStatus: 'verified' | 'flagged' | 'pending';
  verifiedByOfficerId: string;
  verifiedByOfficerName: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  department: string;
  action: string;
  entityType: 'USER' | 'BENEFICIARY' | 'ACTIVITY' | 'ATTENDANCE' | 'STORAGE_POLICY' | 'SECURITY';
  entityId?: string;
  details: string;
  ipAddress: string;
  status: 'SUCCESS' | 'BLOCKED_RBAC' | 'FAILED';
}

export interface StorageMetrics {
  totalPhotos: number;
  totalStorageBytes: number;
  averagePhotoSizeBytes: number;
  photosEligibleForPrune: number;
  retentionDays: number;
  autoPruneEnabled: boolean;
  lastPruneDate?: string;
  totalPrunedCount: number;
  totalPrunedBytesSaved: number;
}

export interface WatermarkPayload {
  beneficiaryName: string;
  beneficiaryCode: string;
  activityTitle: string;
  assignedArea: string;
  barangay: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  verificationHash: string;
}

export interface EventQrBroadcast {
  id: string;
  activityId: string;
  activityTitle: string;
  barangay: string;
  targetArea: string;
  qrDataUrl?: string;
  qrPayload: string;
  eventDate?: string;
  startTime?: string;
  estimatedEndTime?: string;
  totalHours?: string;
  requiredTools?: string;
  waterTumblerReminder?: string;
  recommendedAttire?: string;
  additionalNotes?: string;
  assignedPersonnel?: string[];
  sentByAdminName: string;
  sentAt: string;
}

export interface AnonymousMessage {
  id: string;
  senderAlias: string;
  category: 'report' | 'feedback' | 'allowance_inquiry' | 'emergency' | 'general';
  categoryLabelTagalog: string;
  priority: 'normal' | 'urgent' | 'confidential';
  message: string;
  referencedPhotoUrl?: string;
  referencedActivityTitle?: string;
  referencedLocation?: string;
  timestamp: string;
  localPhTime: string;
  status: 'unread' | 'read' | 'resolved';
  adminNotes?: string;
  createdAt?: string;
}
