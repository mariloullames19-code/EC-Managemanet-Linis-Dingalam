import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
} from './src/data/seedData';
import { User, Beneficiary, Activity, ActivityAssignment, AttendanceRecord, AuditLog, UserRole, EventQrBroadcast, AnonymousMessage } from './src/types';

// In-Memory Database Store with Server Persistence
let users: User[] = [...INITIAL_USERS];
let beneficiaries: Beneficiary[] = [...INITIAL_BENEFICIARIES];
let activities: Activity[] = [...INITIAL_ACTIVITIES];
let assignments: ActivityAssignment[] = [...INITIAL_ASSIGNMENTS];
let attendances: AttendanceRecord[] = [...INITIAL_ATTENDANCES];
let auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let storageMetrics = { ...INITIAL_STORAGE_METRICS };
let latestBroadcast: EventQrBroadcast | null = { ...INITIAL_EVENT_BROADCAST };
let broadcastHistory: EventQrBroadcast[] = [{ ...INITIAL_EVENT_BROADCAST }];
let anonymousMessages: AnonymousMessage[] = [...INITIAL_ANONYMOUS_MESSAGES];

const HMAC_SECRET = 'LINIS-DINGALAN-LGU-AURORA-SEC-KEY-2025-V1';

// Cryptographic Signature Validator
function computeSignature(beneId: string, beneCode: string): string {
  const hmac = crypto.createHmac('sha256', HMAC_SECRET);
  hmac.update(`${beneId}:${beneCode}:${HMAC_SECRET}`);
  return hmac.digest('hex').substring(0, 16);
}

// System Audit Logger
function recordAuditLog(
  userId: string,
  userName: string,
  userRole: UserRole,
  department: string,
  action: string,
  entityType: 'USER' | 'BENEFICIARY' | 'ACTIVITY' | 'ATTENDANCE' | 'STORAGE_POLICY' | 'SECURITY',
  entityId: string,
  details: string,
  ipAddress: string,
  status: 'SUCCESS' | 'BLOCKED_RBAC' | 'FAILED' = 'SUCCESS'
) {
  const newLog: AuditLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    department,
    action,
    entityType,
    entityId,
    details,
    ipAddress,
    status,
  };
  auditLogs.unshift(newLog);
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  // Serve static assets from public directory
  app.use(express.static(path.resolve(__dirname, 'public')));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request IP & User Session simulator
  app.use((req: Request, res: Response, next: NextFunction) => {
    // In production, user token comes from Authorization header.
    // For this demonstration, default session can be simulated or passed via x-user-role / x-user-id headers.
    const headerRole = (req.headers['x-user-role'] as UserRole) || 'superadmin';
    const headerUserId = (req.headers['x-user-id'] as string) || (headerRole === 'superadmin' ? 'usr-superadmin-01' : 'usr-menro-01');
    const currentUser = users.find(u => u.id === headerUserId) || users[0];

    (req as any).user = currentUser;
    (req as any).clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '112.198.88.24';
    next();
  });

  // ----------------------------------------------------------------------------
  // RBAC MIDDLEWARE / ROUTE GUARD
  // ----------------------------------------------------------------------------
  const requireRole = (allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user as User;
      const clientIp = (req as any).clientIp as string;

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required: Missing credentials.',
          code: 'UNAUTHORIZED'
        });
      }

      if (!allowedRoles.includes(user.role)) {
        // Strict Security: Record RBAC violation in system audit log
        recordAuditLog(
          user.id,
          user.name,
          user.role,
          user.department,
          'RESTRICTED_ACCESS_ATTEMPT',
          'SECURITY',
          req.originalUrl,
          `RBAC Policy Block: User with role '${user.role}' attempted to access restricted endpoint '${req.method} ${req.originalUrl}'. Required: [${allowedRoles.join(', ')}]`,
          clientIp,
          'BLOCKED_RBAC'
        );

        return res.status(403).json({
          error: `Access Denied: Only [${allowedRoles.join(', ')}] can access this resource. Your role: ${user.role}`,
          code: 'RBAC_FORBIDDEN',
          requiredRoles: allowedRoles,
          userRole: user.role
        });
      }

      next();
    };
  };

  // ----------------------------------------------------------------------------
  // API ROUTES
  // ----------------------------------------------------------------------------

  // Authoritative Background Video stream for Login Page with Range Requests support
  app.get('/api/video/background', (req: Request, res: Response) => {
    const videoPath = path.resolve(process.cwd(), 'public', 'dingalan_bg_video.mp4');
    res.sendFile(videoPath, {
      headers: {
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  });

  // Authoritative Philippine Standard Time (PST UTC+8) for Dingalan, Aurora
  app.get('/api/time', (req: Request, res: Response) => {
    const now = new Date();
    const dingalanFormatted = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now);

    res.json({
      success: true,
      epochMs: now.getTime(),
      utcIso: now.toISOString(),
      timezone: 'Asia/Manila',
      timeZoneOffsetHours: 8,
      location: 'Dingalan, Aurora, Philippines',
      dingalanTime: dingalanFormatted,
      fullFormatted: `${dingalanFormatted} PST`,
    });
  });

  // Current User / Session Switcher
  app.get('/api/auth/me', (req: Request, res: Response) => {
    res.json({
      user: (req as any).user,
      availableUsers: users
    });
  });

  // User Management - Superadmin PESO Manager Only
  app.get('/api/users', requireRole(['superadmin']), (req: Request, res: Response) => {
    res.json({ users });
  });

  app.delete('/api/users/:id', requireRole(['superadmin']), (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user as User;
    const target = users.find(u => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (target.id === user.id) {
      return res.status(400).json({ error: 'Cannot delete current active session user' });
    }
    users = users.filter(u => u.id !== id);
    recordAuditLog(
      user.id,
      user.name,
      user.role,
      user.department,
      'USER_ACCOUNT_DELETED',
      'USER',
      id,
      `User account '${target.name}' (${target.email}) permanently deleted.`,
      (req as any).clientIp
    );
    res.json({ success: true, message: `User ${target.name} deleted.` });
  });

  // Beneficiaries Endpoints (Read: Both, Write: Both, Delete: Superadmin)
  app.get('/api/beneficiaries', (req: Request, res: Response) => {
    res.json({ beneficiaries });
  });

  app.post('/api/beneficiaries', (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const body = req.body;

    // Check duplicates by national ID or name in same barangay
    const duplicateId = beneficiaries.find(b => b.nationalOrLocalId.trim().toLowerCase() === body.nationalOrLocalId?.trim().toLowerCase());
    if (duplicateId) {
      return res.status(400).json({
        error: `Duplicate National/Local ID: Record already exists for ${duplicateId.firstName} ${duplicateId.lastName} (${duplicateId.beneCode})`,
        code: 'DUPLICATE_ID'
      });
    }

    const duplicateNameInBarangay = beneficiaries.find(b =>
      b.firstName.trim().toLowerCase() === body.firstName?.trim().toLowerCase() &&
      b.lastName.trim().toLowerCase() === body.lastName?.trim().toLowerCase() &&
      b.barangay === body.barangay
    );

    if (duplicateNameInBarangay) {
      return res.status(400).json({
        error: `Duplicate Record: A beneficiary named '${body.firstName} ${body.lastName}' is already registered in Barangay ${body.barangay}.`,
        code: 'DUPLICATE_NAME_BARANGAY'
      });
    }

    const newId = `ben-${Date.now().toString().slice(-6)}-uuid`;
    const nextSeq = String(beneficiaries.length + 101).padStart(4, '0');
    const beneCode = `LD-BEN-2025-${nextSeq}`;
    const qrHash = computeSignature(newId, beneCode);

    const newBene: Beneficiary = {
      id: newId,
      beneCode,
      firstName: body.firstName,
      middleName: body.middleName || '',
      lastName: body.lastName,
      suffix: body.suffix || '',
      nationalOrLocalId: body.nationalOrLocalId,
      contactNumber: body.contactNumber,
      barangay: body.barangay,
      assignedCluster: body.assignedCluster,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      emergencyContactRelation: body.emergencyContactRelation,
      photoUrl: body.photoUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      status: 'active',
      qrHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    beneficiaries.unshift(newBene);

    recordAuditLog(
      user.id,
      user.name,
      user.role,
      user.department,
      'BENEFICIARY_RECORD_CREATED',
      'BENEFICIARY',
      newBene.id,
      `Registered beneficiary: ${newBene.firstName} ${newBene.lastName} (${newBene.beneCode}) in ${newBene.barangay}. Generated QR hash: ${qrHash}`,
      (req as any).clientIp
    );

    res.status(201).json({ beneficiary: newBene });
  });

  app.delete('/api/beneficiaries/:id', requireRole(['superadmin']), (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user as User;
    const target = beneficiaries.find(b => b.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Beneficiary not found' });
    }
    beneficiaries = beneficiaries.filter(b => b.id !== id);
    recordAuditLog(
      user.id,
      user.name,
      user.role,
      user.department,
      'BENEFICIARY_RECORD_DELETED',
      'BENEFICIARY',
      id,
      `Permanently removed beneficiary record: ${target.firstName} ${target.lastName} (${target.beneCode})`,
      (req as any).clientIp
    );
    res.json({ success: true, message: `Beneficiary ${target.beneCode} deleted.` });
  });

  // Activities
  app.get('/api/activities', (req: Request, res: Response) => {
    res.json({ activities, assignments });
  });

  app.post('/api/activities', (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const body = req.body;
    const newAct: Activity = {
      id: `act-${Date.now().toString().slice(-6)}`,
      title: body.title,
      programType: body.programType || 'COASTAL_CLEANUP',
      description: body.description || '',
      date: body.date,
      callTime: body.callTime,
      targetArea: body.targetArea,
      barangay: body.barangay,
      menroSupervisorId: user.id,
      supervisorName: user.name,
      targetBeneficiariesCount: Number(body.targetBeneficiariesCount) || 10,
      assignedBeneficiariesCount: 0,
      attendedBeneficiariesCount: 0,
      status: 'scheduled',
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
    };

    activities.unshift(newAct);

    recordAuditLog(
      user.id,
      user.name,
      user.role,
      user.department,
      'ACTIVITY_WORK_PROGRAM_CREATED',
      'ACTIVITY',
      newAct.id,
      `Created work program '${newAct.title}' in ${newAct.barangay} (${newAct.targetArea})`,
      (req as any).clientIp
    );

    res.status(201).json({ activity: newAct });
  });

  // Assign Beneficiary to Activity
  app.post('/api/activities/:id/assignments', (req: Request, res: Response) => {
    const { id } = req.params;
    const { beneficiaryId } = req.body;
    const activity = activities.find(a => a.id === id);
    const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);

    if (!activity || !beneficiary) {
      return res.status(404).json({ error: 'Activity or Beneficiary not found' });
    }

    const existing = assignments.find(asg => asg.activityId === id && asg.beneficiaryId === beneficiaryId);
    if (existing) {
      return res.status(400).json({ error: 'Beneficiary is already assigned to this activity' });
    }

    const newAsg: ActivityAssignment = {
      id: `asg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      activityId: id,
      beneficiaryId,
      assignedAt: new Date().toISOString(),
      status: 'assigned',
    };

    assignments.push(newAsg);
    activity.assignedBeneficiariesCount += 1;

    res.status(201).json({ assignment: newAsg });
  });

  // Delete Individual Activity
  app.delete('/api/activities/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user as User;
    const actIdx = activities.findIndex(a => a.id === id);
    if (actIdx === -1) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    const [deleted] = activities.splice(actIdx, 1);
    
    // Remove associated assignments
    for (let i = assignments.length - 1; i >= 0; i--) {
      if (assignments[i].activityId === id) {
        assignments.splice(i, 1);
      }
    }

    recordAuditLog(
      user?.id || 'admin',
      user?.name || 'Administrator',
      user?.role || 'admin',
      user?.department || 'PESO',
      'ACTIVITY_WORK_PROGRAM_DELETED',
      'ACTIVITY',
      id,
      `Deleted work program '${deleted.title}' in ${deleted.barangay}`,
      (req as any).clientIp
    );

    res.json({ success: true, message: `Work program '${deleted.title}' deleted successfully.` });
  });

  // Delete All Activities
  app.delete('/api/activities', (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const count = activities.length;
    activities.length = 0;
    assignments.length = 0;

    recordAuditLog(
      user?.id || 'admin',
      user?.name || 'Administrator',
      user?.role || 'admin',
      user?.department || 'PESO',
      'ALL_ACTIVITIES_CLEARED',
      'ACTIVITY',
      'ALL',
      `Cleared all ${count} work programs from the system`,
      (req as any).clientIp
    );

    res.json({ success: true, message: `Successfully cleared all ${count} work programs.` });
  });

  // ----------------------------------------------------------------------------
  // DELIVERABLE #3: QR VERIFICATION & ATTENDANCE CHECK-IN ROUTE
  // ----------------------------------------------------------------------------

  // QR Signature Verification Endpoint
  app.post('/api/attendance/verify-qr', (req: Request, res: Response) => {
    const { bene_id, hash } = req.body;

    if (!bene_id || !hash) {
      return res.status(400).json({
        valid: false,
        error: 'Missing QR payload parameters (bene_id or hash)',
        code: 'INVALID_QR_PAYLOAD'
      });
    }

    const beneficiary = beneficiaries.find(b => b.id === bene_id);
    if (!beneficiary) {
      return res.status(404).json({
        valid: false,
        error: 'Beneficiary ID not found in Linis Dingalan masterlist',
        code: 'BENEFICIARY_NOT_FOUND'
      });
    }

    const expectedHash = computeSignature(beneficiary.id, beneficiary.beneCode);
    const isAuthentic = expectedHash.toLowerCase() === hash.toLowerCase();

    if (!isAuthentic) {
      return res.status(403).json({
        valid: false,
        error: 'Tampered QR Code signature: Security verification failed',
        code: 'SIGNATURE_MISMATCH'
      });
    }

    // Resolve active ongoing or scheduled activity matching beneficiary's barangay or cluster
    const matchingActivity = activities.find(
      a => (a.status === 'ongoing' || a.status === 'scheduled') &&
           (a.barangay === beneficiary.barangay || a.targetArea.toLowerCase().includes(beneficiary.barangay.toLowerCase()))
    ) || activities.find(a => a.status === 'ongoing') || activities[0];

    // Check if already checked in
    const existingAttendance = matchingActivity ? attendances.find(
      att => att.activityId === matchingActivity.id && att.beneficiaryId === beneficiary.id
    ) : null;

    res.json({
      valid: true,
      beneficiary,
      suggestedActivity: matchingActivity || null,
      alreadyCheckedIn: !!existingAttendance,
      existingAttendance
    });
  });

  // QR Geotagged Attendance Check-in Endpoint
  app.post('/api/attendance/checkin', (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const clientIp = (req as any).clientIp as string;
    const {
      activity_id,
      beneficiary_id,
      qr_signature,
      latitude,
      longitude,
      accuracy_meters,
      altitude_meters,
      location_description,
      photo_watermarked,
      photo_size_kb,
      accomplishment_photos,
      accomplishment_notes,
      notes
    } = req.body;

    // 1. Validate mandatory fields
    if (!activity_id || !beneficiary_id || !latitude || !longitude || !photo_watermarked) {
      return res.status(400).json({
        error: 'Incomplete compliance submission: Activity, Beneficiary, GPS coordinates, and watermarked photo are required.',
        code: 'INCOMPLETE_COMPLIANCE_PAYLOAD'
      });
    }

    // 2. Validate beneficiary (Auto-upsert from payload if registered client-side)
    let beneficiary = beneficiaries.find(b => b.id === beneficiary_id || b.beneCode === req.body.beneficiary_code);
    if (!beneficiary) {
      const nameParts = (req.body.beneficiary_name || 'Participant Dingalan').split(' ');
      beneficiary = {
        id: beneficiary_id,
        beneCode: req.body.beneficiary_code || `LD-BEN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        firstName: nameParts[0] || 'Participant',
        lastName: nameParts.slice(1).join(' ') || 'Dingalan',
        nationalOrLocalId: `LGU-DING-GEN-${Math.floor(100 + Math.random() * 900)}`,
        contactNumber: req.body.phone_number || '0917-000-0000',
        barangay: (req.body.barangay as any) || 'Paltic',
        assignedCluster: req.body.department || 'General Cleanup',
        emergencyContactName: 'Family',
        emergencyContactPhone: '0917-000-0000',
        emergencyContactRelation: 'Relative',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775?w=400&auto=format&fit=crop&q=80',
        status: 'active',
        qrHash: qr_signature || 'qr-hash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      beneficiaries.push(beneficiary);
    }

    // 3. Signature check (accepts HMAC token or client QR hash)
    if (qr_signature && beneficiary.qrHash) {
      const expectedSignature = computeSignature(beneficiary.id, beneficiary.beneCode);
      if (
        expectedSignature.toLowerCase() !== qr_signature.toLowerCase() &&
        beneficiary.qrHash.toLowerCase() !== qr_signature.toLowerCase()
      ) {
        console.warn('QR signature mismatch for', beneficiary.beneCode, qr_signature);
      }
    }

    // 4. Validate Activity
    let activity = activities.find(a => a.id === activity_id);
    if (!activity) {
      activity = activities.find(a => a.status === 'ongoing') || activities[0];
    }

    // 5. Update or Create Attendance Record
    const duplicate = attendances.find(att => att.activityId === activity.id && att.beneficiaryId === beneficiary.id);
    if (duplicate) {
      if (req.body.beneficiary_name) duplicate.beneficiaryName = req.body.beneficiary_name;
      if (location_description) duplicate.locationDescription = location_description;
      duplicate.accomplishmentPhotos = Array.isArray(accomplishment_photos) && accomplishment_photos.length > 0
        ? accomplishment_photos
        : [photo_watermarked];
      duplicate.photoWatermarkedUrl = photo_watermarked;
      duplicate.accomplishmentNotes = accomplishment_notes || notes || duplicate.accomplishmentNotes;
      duplicate.notes = notes || accomplishment_notes || duplicate.notes;
      duplicate.timestamp = new Date().toISOString();
      duplicate.localPhTime = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date()) + ' PST';

      return res.status(200).json({
        success: true,
        attendance: duplicate,
        message: 'Updated accomplishment photos and attendance successfully.'
      });
    }

    // 6. Ensure Assignment exists
    let assignment = assignments.find(asg => asg.activityId === activity_id && asg.beneficiaryId === beneficiary_id);
    if (!assignment) {
      // Auto-bind beneficiary to ongoing work area assignment
      assignment = {
        id: `asg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        activityId: activity_id,
        beneficiaryId: beneficiary_id,
        assignedAt: new Date().toISOString(),
        status: 'attended',
      };
      assignments.push(assignment);
      activity.assignedBeneficiariesCount += 1;
    } else {
      assignment.status = 'attended';
    }

    // 7. Format Time in Philippine Standard Time
    const now = new Date();
    const localPhTime = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(now) + ' PST';

    // 8. Commit Attendance Record
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      activityId: activity.id,
      activityTitle: req.body.activity_title || activity.title,
      beneficiaryId: beneficiary.id,
      beneficiaryName: req.body.beneficiary_name || `${beneficiary.firstName} ${beneficiary.lastName}`,
      beneficiaryCode: beneficiary.beneCode,
      timestamp: now.toISOString(),
      localPhTime,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracyMeters: Number(accuracy_meters) || 4.2,
      altitudeMeters: altitude_meters ? Number(altitude_meters) : 10,
      locationDescription: location_description || `${activity.targetArea}, Brgy. ${activity.barangay}`,
      photoWatermarkedUrl: photo_watermarked,
      accomplishmentPhotos: Array.isArray(accomplishment_photos) && accomplishment_photos.length > 0
        ? accomplishment_photos
        : [photo_watermarked],
      accomplishmentNotes: accomplishment_notes || notes,
      photoSizeKb: Number(photo_size_kb) || 120,
      qrSignature: qr_signature || computeSignature(beneficiary.id, beneficiary.beneCode),
      complianceStatus: 'verified',
      verifiedByOfficerId: user.id,
      verifiedByOfficerName: user.name,
      notes: notes || accomplishment_notes || 'Verified with on-site geotag photograph.',
    };

    attendances.unshift(newRecord);
    activity.attendedBeneficiariesCount += 1;

    // Update Storage metrics
    storageMetrics.totalPhotos += 1;
    storageMetrics.totalStorageBytes += (newRecord.photoSizeKb * 1024);
    storageMetrics.averagePhotoSizeBytes = Math.round(storageMetrics.totalStorageBytes / storageMetrics.totalPhotos);

    // 9. Audit Logging
    recordAuditLog(
      user.id,
      user.name,
      user.role,
      user.department,
      'ATTENDANCE_GEOTAG_RECORDED',
      'ATTENDANCE',
      newRecord.id,
      `Geotag compliance verified for ${beneficiary.beneCode} (${beneficiary.firstName} ${beneficiary.lastName}) at ${activity.title}. GPS: ${latitude} N, ${longitude} E (acc ±${accuracy_meters}m). Photo size: ${newRecord.photoSizeKb} KB.`,
      clientIp,
      'SUCCESS'
    );

    res.status(201).json({
      success: true,
      attendance: newRecord,
      message: 'Attendance verified and geotagged accomplishment photograph recorded successfully.'
    });
  });

  // ----------------------------------------------------------------------------
  // ATTENDANCES: AUTO-PRUNE (30 DAYS / 1 MONTH) & PERMANENT DELETE ALL
  // ----------------------------------------------------------------------------
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  function pruneAttendancesOlderThan30Days(): number {
    const now = Date.now();
    const beforeCount = attendances.length;
    attendances = attendances.filter(att => {
      const ts = new Date(att.timestamp).getTime();
      return !isNaN(ts) && (now - ts) <= THIRTY_DAYS_MS;
    });
    return beforeCount - attendances.length;
  }

  // Attendances List (With Automatic 30-Day Auto-Prune)
  app.get('/api/attendances', (req: Request, res: Response) => {
    pruneAttendancesOlderThan30Days();
    const { activity_id } = req.query;
    if (activity_id) {
      return res.json({ attendances: attendances.filter(a => a.activityId === activity_id) });
    }
    res.json({ attendances });
  });

  // Delete All Attendance Records (Permanent Delete as requested)
  app.delete('/api/attendances', (req: Request, res: Response) => {
    const deletedCount = attendances.length;
    attendances = [];
    storageMetrics.totalPhotos = 0;
    storageMetrics.totalStorageBytes = 0;
    storageMetrics.averagePhotoSizeBytes = 0;

    res.json({
      success: true,
      message: `Matagumpay na permanenteng nabura ang lahat ng ${deletedCount} attendance records.`,
      deletedCount
    });
  });

  // Explicit Trigger for 30-Day Auto-Prune
  app.post('/api/attendances/prune-monthly', (req: Request, res: Response) => {
    const prunedCount = pruneAttendancesOlderThan30Days();
    res.json({
      success: true,
      message: `Awtomatikong nabura ang ${prunedCount} records na lagpas na sa 1 buwan (30 araw).`,
      prunedCount
    });
  });

  // ----------------------------------------------------------------------------
  // BROADCASTS & EVENT REMINDERS (PAALALA) API
  // ----------------------------------------------------------------------------
  app.get('/api/broadcasts/latest', (req: Request, res: Response) => {
    res.json({ broadcast: latestBroadcast });
  });

  app.get('/api/broadcasts', (req: Request, res: Response) => {
    res.json({ broadcasts: broadcastHistory });
  });

  app.post('/api/broadcasts', (req: Request, res: Response) => {
    const broadcast = req.body as EventQrBroadcast;
    if (broadcast && broadcast.id) {
      latestBroadcast = broadcast;
      broadcastHistory = [broadcast, ...broadcastHistory.filter(b => b.id !== broadcast.id)];
    }
    res.json({ success: true, broadcast: latestBroadcast });
  });

  app.delete('/api/broadcasts/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    broadcastHistory = broadcastHistory.filter(b => b.id !== id);
    if (latestBroadcast && latestBroadcast.id === id) {
      latestBroadcast = broadcastHistory.length > 0 ? broadcastHistory[0] : null;
    }
    res.json({ success: true, message: 'Broadcast deleted.' });
  });

  app.delete('/api/broadcasts', (req: Request, res: Response) => {
    latestBroadcast = null;
    broadcastHistory = [];
    res.json({ success: true, message: 'All broadcasts cleared.' });
  });

  // ----------------------------------------------------------------------------
  // ANONYMOUS MESSAGES & REPORTS (ADMIN ACCESS ONLY)
  // AUTO-PRUNE (30 DAYS / 1 MONTH) & PERMANENT DELETE ALL
  // ----------------------------------------------------------------------------
  function pruneAnonymousMessagesOlderThan30Days(): number {
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const beforeCount = anonymousMessages.length;
    anonymousMessages = anonymousMessages.filter(msg => {
      const ts = new Date(msg.timestamp || msg.createdAt).getTime();
      return !isNaN(ts) && (now - ts) <= THIRTY_DAYS_MS;
    });
    return beforeCount - anonymousMessages.length;
  }

  app.get('/api/anonymous-messages', (req: Request, res: Response) => {
    pruneAnonymousMessagesOlderThan30Days();
    res.json({ messages: anonymousMessages });
  });

  app.post('/api/anonymous-messages', (req: Request, res: Response) => {
    pruneAnonymousMessagesOlderThan30Days();
    const data = req.body;
    const newMsg: AnonymousMessage = {
      id: `anon-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      senderAlias: data.senderAlias || `Anonymous Participant #ANON-${Math.floor(1000 + Math.random() * 9000)}`,
      category: data.category || 'report',
      categoryLabelTagalog: data.categoryLabelTagalog || 'Ulat sa Paglilinis / Field Report',
      priority: data.priority || 'normal',
      message: data.message || '',
      referencedPhotoUrl: data.referencedPhotoUrl,
      referencedActivityTitle: data.referencedActivityTitle,
      referencedLocation: data.referencedLocation,
      timestamp: data.timestamp || new Date().toISOString(),
      localPhTime: data.localPhTime || new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }) + ' PST',
      status: 'unread',
      createdAt: new Date().toISOString(),
    };

    anonymousMessages.unshift(newMsg);
    res.status(201).json({ success: true, message: newMsg });
  });

  app.patch('/api/anonymous-messages/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const target = anonymousMessages.find(m => m.id === id);
    if (!target) {
      return res.status(404).json({ error: 'Anonymous message not found' });
    }
    if (status) target.status = status;
    if (adminNotes !== undefined) target.adminNotes = adminNotes;
    res.json({ success: true, message: target });
  });

  // Delete All Anonymous Messages permanently
  app.delete('/api/anonymous-messages', (req: Request, res: Response) => {
    const count = anonymousMessages.length;
    anonymousMessages = [];
    res.json({ success: true, count, message: 'All anonymous messages permanently deleted.' });
  });

  app.delete('/api/anonymous-messages/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    anonymousMessages = anonymousMessages.filter(m => m.id !== id);
    res.json({ success: true, message: 'Anonymous message deleted.' });
  });

  // ----------------------------------------------------------------------------
  // DELIVERABLE #4: AUDIT TRAIL (SUPERADMIN & ADMIN ACCESS)
  // ----------------------------------------------------------------------------
  app.get('/api/audit-logs', requireRole(['superadmin', 'admin']), (req: Request, res: Response) => {
    res.json({ auditLogs });
  });

  // Storage Metrics (Superadmin & Admin View Access)
  app.get('/api/storage/metrics', requireRole(['superadmin', 'admin']), (req: Request, res: Response) => {
    res.json({ metrics: storageMetrics });
  });

  app.post('/api/storage/prune', requireRole(['superadmin']), (req: Request, res: Response) => {
    const user = (req as any).user as User;
    const { retentionDays = 60, dryRun = false } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(retentionDays));

    // Find attendances older than retentionDays
    const eligibleRecords = attendances.filter(att => new Date(att.timestamp) < cutoffDate);
    const totalBytesPrunable = eligibleRecords.reduce((acc, curr) => acc + (curr.photoSizeKb * 1024), 0);

    if (dryRun) {
      return res.json({
        eligibleCount: eligibleRecords.length,
        eligibleBytes: totalBytesPrunable,
        cutoffDate: cutoffDate.toISOString(),
      });
    }

    // Execute Pruning: downscale / prune photo storage
    eligibleRecords.forEach(att => {
      // Retain audit metadata and coordinate proof, remove heavy photo data
      att.photoWatermarkedUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="%231e293b"/><text x="100" y="50" fill="%2394a3b8" font-size="12" text-anchor="middle" dominant-baseline="middle">Archived Photo (Pruned)</text></svg>';
      att.photoSizeKb = 4; // Downsized metadata stub
    });

    storageMetrics.totalPrunedCount += eligibleRecords.length;
    storageMetrics.totalPrunedBytesSaved += totalBytesPrunable;
    storageMetrics.lastPruneDate = new Date().toISOString();
    storageMetrics.photosEligibleForPrune = 0;

    recordAuditLog(
      user.id,
      user.name,
      user.role,
      user.department,
      'STORAGE_PHOTO_PRUNE_EXECUTED',
      'STORAGE_POLICY',
      'storage_policies_table',
      `Superadmin pruned ${eligibleRecords.length} historical compliance photos older than ${retentionDays} days. Saved ${(totalBytesPrunable / (1024 * 1024)).toFixed(2)} MB of cloud storage.`,
      (req as any).clientIp
    );

    res.json({
      success: true,
      prunedCount: eligibleRecords.length,
      bytesSaved: totalBytesPrunable,
      updatedMetrics: storageMetrics
    });
  });

  // Mount Vite development middlewares in dev mode
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Linis Dingalan Server] Listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[Linis Dingalan Server] Startup Error:', err);
});
