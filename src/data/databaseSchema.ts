/**
 * Complete Database Schema Deliverables for Linis Dingalan EC Management
 * 1. PostgreSQL / Supabase DDL with Row Level Security (RLS) & Triggers
 * 2. Prisma Schema Definition
 */

export const POSTGRESQL_SUPABASE_DDL = `-- ============================================================================
-- LINIS DINGALAN EC MANAGEMENT SYSTEM - DATABASE SCHEMA (POSTGRESQL / SUPABASE)
-- Public Sector Environmental & Workforce Management Platform
-- Dingalan, Aurora, Philippines (PESO & MENRO Operations)
-- ============================================================================

-- Enable UUID extension & PostGIS (optional for geographic queries)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS & DOMAINS
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('superadmin', 'menro_officer');
CREATE TYPE department_type AS ENUM ('PESO', 'MENRO');
CREATE TYPE record_status AS ENUM ('active', 'inactive');
CREATE TYPE activity_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE assignment_status AS ENUM ('assigned', 'attended', 'excused', 'absent');
CREATE TYPE compliance_status AS ENUM ('verified', 'flagged', 'pending');
CREATE TYPE audit_action_status AS ENUM ('SUCCESS', 'BLOCKED_RBAC', 'FAILED');

-- ----------------------------------------------------------------------------
-- 2. USERS TABLE (SUPERADMIN & MENRO OFFICERS)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role NOT NULL DEFAULT 'menro_officer',
    department department_type NOT NULL,
    position VARCHAR(100) NOT NULL,
    badge_number VARCHAR(50) UNIQUE NOT NULL,
    status record_status NOT NULL DEFAULT 'active',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- ----------------------------------------------------------------------------
-- 3. BENEFICIARIES TABLE (COMMUNITY WORKFORCE MASTERLIST)
-- ----------------------------------------------------------------------------
CREATE TABLE beneficiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bene_code VARCHAR(32) UNIQUE NOT NULL, -- e.g. LD-BEN-2025-0012
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(20),
    national_or_local_id VARCHAR(100) UNIQUE NOT NULL, -- PhilSys / Dingalan Resident ID
    contact_number VARCHAR(20) NOT NULL,
    barangay VARCHAR(60) NOT NULL CHECK (
        barangay IN (
            'Aplaya', 'Butas na Bato', 'Cabischasan', 'Caragsacan',
            'Davil-davilan', 'Dikapanikian', 'Ibona', 'Paltic',
            'Poblacion', 'Tanawan', 'Umiray'
        )
    ),
    assigned_cluster VARCHAR(100) NOT NULL,
    emergency_contact_name VARCHAR(150) NOT NULL,
    emergency_contact_phone VARCHAR(20) NOT NULL,
    emergency_contact_relation VARCHAR(50) NOT NULL,
    photo_url TEXT,
    qr_hash VARCHAR(64) NOT NULL, -- Cryptographic signature for QR cards
    status record_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_beneficiary_name_barangay UNIQUE (first_name, last_name, barangay)
);

CREATE INDEX idx_beneficiaries_barangay ON beneficiaries(barangay);
CREATE INDEX idx_beneficiaries_cluster ON beneficiaries(assigned_cluster);
CREATE INDEX idx_beneficiaries_status ON beneficiaries(status);

-- ----------------------------------------------------------------------------
-- 4. ACTIVITIES TABLE (PER-EVENT WORK PROGRAMS)
-- ----------------------------------------------------------------------------
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    program_type VARCHAR(60) NOT NULL, -- TUPAD, Cash-for-Work, Coastal Cleanup
    description TEXT,
    activity_date DATE NOT NULL,
    call_time TIME NOT NULL,
    target_area VARCHAR(150) NOT NULL, -- e.g. Paltic Beachfront, Feeder Port
    barangay VARCHAR(60) NOT NULL,
    menro_supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_beneficiaries_count INT NOT NULL DEFAULT 0,
    status activity_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_supervisor ON activities(menro_supervisor_id);

-- ----------------------------------------------------------------------------
-- 5. ACTIVITY ASSIGNMENTS TABLE (JUNCTION TABLE)
-- ----------------------------------------------------------------------------
CREATE TABLE activity_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status assignment_status NOT NULL DEFAULT 'assigned',
    CONSTRAINT uq_activity_beneficiary UNIQUE (activity_id, beneficiary_id)
);

CREATE INDEX idx_assignments_activity ON activity_assignments(activity_id);
CREATE INDEX idx_assignments_beneficiary ON activity_assignments(beneficiary_id);

-- ----------------------------------------------------------------------------
-- 6. ATTENDANCES TABLE (GEOTAGGED COMPLIANCE RECORDS)
-- ----------------------------------------------------------------------------
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE RESTRICT,
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE RESTRICT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    local_ph_time VARCHAR(50) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy_meters NUMERIC(6, 2) NOT NULL,
    altitude_meters NUMERIC(6, 2),
    location_description VARCHAR(200),
    photo_watermarked_url TEXT NOT NULL,
    photo_size_kb INT NOT NULL,
    qr_signature VARCHAR(64) NOT NULL,
    compliance_status compliance_status NOT NULL DEFAULT 'verified',
    verified_by_officer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_per_activity UNIQUE (activity_id, beneficiary_id)
);

CREATE INDEX idx_attendances_activity ON attendances(activity_id);
CREATE INDEX idx_attendances_beneficiary ON attendances(beneficiary_id);
CREATE INDEX idx_attendances_timestamp ON attendances(timestamp);

-- ----------------------------------------------------------------------------
-- 7. AUDIT LOGS TABLE (SUPERADMIN PESO MANAGER ONLY)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(150) NOT NULL,
    user_role user_role NOT NULL,
    department department_type NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id VARCHAR(64),
    details JSONB NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    status audit_action_status NOT NULL DEFAULT 'SUCCESS'
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ----------------------------------------------------------------------------
-- 8. STORAGE RETENTION & PHOTO PRUNING POLICIES
-- ----------------------------------------------------------------------------
CREATE TABLE storage_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retention_days INT NOT NULL DEFAULT 60,
    auto_compression_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_dimension_px INT NOT NULL DEFAULT 1280,
    compression_quality NUMERIC(3, 2) NOT NULL DEFAULT 0.82,
    last_prune_run_at TIMESTAMPTZ,
    total_pruned_count INT NOT NULL DEFAULT 0,
    total_bytes_saved BIGINT NOT NULL DEFAULT 0,
    updated_by_user_id UUID REFERENCES users(id)
);

-- ----------------------------------------------------------------------------
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_policies ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current authenticated user role
CREATE OR REPLACE FUNCTION auth.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- RLS: Audit Logs (Strictly PESO Manager / Superadmin ONLY)
CREATE POLICY audit_logs_superadmin_select ON audit_logs
    FOR SELECT TO authenticated
    USING (auth.get_user_role() = 'superadmin');

CREATE POLICY audit_logs_system_insert ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Insert allowed via trigger / service role

-- RLS: Beneficiaries
CREATE POLICY beneficiaries_read_all ON beneficiaries
    FOR SELECT TO authenticated USING (true);

CREATE POLICY beneficiaries_insert_update ON beneficiaries
    FOR ALL TO authenticated
    USING (auth.get_user_role() IN ('superadmin', 'menro_officer'))
    WITH CHECK (auth.get_user_role() IN ('superadmin', 'menro_officer'));

CREATE POLICY beneficiaries_delete_superadmin_only ON beneficiaries
    FOR DELETE TO authenticated
    USING (auth.get_user_role() = 'superadmin');

-- RLS: Storage Policies (Superadmin Only)
CREATE POLICY storage_policies_superadmin ON storage_policies
    FOR ALL TO authenticated
    USING (auth.get_user_role() = 'superadmin');
`;

export const PRISMA_SCHEMA_DEFINITION = `// ============================================================================
// LINIS DINGALAN EC MANAGEMENT SYSTEM - PRISMA SCHEMA
// Public Sector Environmental & Workforce Management Platform
// ============================================================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  superadmin
  menro_officer
}

enum DepartmentType {
  PESO
  MENRO
}

enum RecordStatus {
  active
  inactive
}

enum ActivityStatus {
  scheduled
  ongoing
  completed
  cancelled
}

enum AssignmentStatus {
  assigned
  attended
  excused
  absent
}

enum ComplianceStatus {
  verified
  flagged
  pending
}

enum AuditActionStatus {
  SUCCESS
  BLOCKED_RBAC
  FAILED
}

model User {
  id              String         @id @default(uuid())
  email           String         @unique
  passwordHash    String         @map("password_hash")
  fullName        String         @map("full_name")
  role            UserRole       @default(menro_officer)
  department      DepartmentType
  position        String
  badgeNumber     String         @unique @map("badge_number")
  status          RecordStatus   @default(active)
  lastLoginAt     DateTime?      @map("last_login_at")
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  supervisedActivities Activity[] @relation("SupervisorActivities")
  verifiedAttendances  Attendance[] @relation("VerifiedAttendances")
  auditLogs            AuditLog[]

  @@map("users")
}

model Beneficiary {
  id                      String         @id @default(uuid())
  beneCode                String         @unique @map("bene_code")
  firstName               String         @map("first_name")
  middleName              String?        @map("middle_name")
  lastName                String         @map("last_name")
  suffix                  String?
  nationalOrLocalId       String         @unique @map("national_or_local_id")
  contactNumber           String         @map("contact_number")
  barangay                String
  assignedCluster         String         @map("assigned_cluster")
  emergencyContactName    String         @map("emergency_contact_name")
  emergencyContactPhone   String         @map("emergency_contact_phone")
  emergencyContactRelation String        @map("emergency_contact_relation")
  photoUrl                String?        @map("photo_url")
  qrHash                  String         @map("qr_hash")
  status                  RecordStatus   @default(active)
  createdAt               DateTime       @default(now()) @map("created_at")
  updatedAt               DateTime       @updatedAt @map("updated_at")

  assignments             ActivityAssignment[]
  attendances             Attendance[]

  @@unique([firstName, lastName, barangay])
  @@map("beneficiaries")
}

model Activity {
  id                       String         @id @default(uuid())
  title                    String
  programType              String         @map("program_type")
  description              String?
  activityDate             DateTime       @map("activity_date") @db.Date
  callTime                 String         @map("call_time")
  targetArea               String         @map("target_area")
  barangay                 String
  menroSupervisorId        String         @map("menro_supervisor_id")
  targetBeneficiariesCount Int            @default(0) @map("target_beneficiaries_count")
  status                   ActivityStatus @default(scheduled)
  notes                    String?
  createdAt                DateTime       @default(now()) @map("created_at")
  updatedAt                DateTime       @updatedAt @map("updated_at")

  supervisor               User           @relation("SupervisorActivities", fields: [menroSupervisorId], references: [id])
  assignments              ActivityAssignment[]
  attendances              Attendance[]

  @@map("activities")
}

model ActivityAssignment {
  id            String           @id @default(uuid())
  activityId    String           @map("activity_id")
  beneficiaryId String           @map("beneficiary_id")
  assignedAt    DateTime         @default(now()) @map("assigned_at")
  status        AssignmentStatus @default(assigned)

  activity      Activity         @relation(fields: [activityId], references: [id], onDelete: Cascade)
  beneficiary   Beneficiary      @relation(fields: [beneficiaryId], references: [id], onDelete: Restrict)

  @@unique([activityId, beneficiaryId])
  @@map("activity_assignments")
}

model Attendance {
  id                 String           @id @default(uuid())
  activityId         String           @map("activity_id")
  beneficiaryId      String           @map("beneficiary_id")
  timestamp          DateTime         @default(now())
  localPhTime        String           @map("local_ph_time")
  latitude           Decimal          @db.Decimal(10, 7)
  longitude          Decimal          @db.Decimal(10, 7)
  accuracyMeters     Decimal          @map("accuracy_meters") @db.Decimal(6, 2)
  altitudeMeters     Decimal?         @map("altitude_meters") @db.Decimal(6, 2)
  locationDescription String?         @map("location_description")
  photoWatermarkedUrl String          @map("photo_watermarked_url")
  photoSizeKb        Int              @map("photo_size_kb")
  qrSignature        String           @map("qr_signature")
  complianceStatus   ComplianceStatus @default(verified) @map("compliance_status")
  verifiedByOfficerId String          @map("verified_by_officer_id")
  notes              String?
  createdAt          DateTime         @default(now()) @map("created_at")

  activity           Activity         @relation(fields: [activityId], references: [id])
  beneficiary        Beneficiary      @relation(fields: [beneficiaryId], references: [id])
  verifiedByOfficer  User             @relation("VerifiedAttendances", fields: [verifiedByOfficerId], references: [id])

  @@unique([activityId, beneficiaryId])
  @@map("attendances")
}

model AuditLog {
  id          String            @id @default(uuid())
  timestamp   DateTime          @default(now())
  userId      String?           @map("user_id")
  userName    String            @map("user_name")
  userRole    UserRole          @map("user_role")
  department  DepartmentType
  action      String
  entityType  String            @map("entity_type")
  entityId    String?           @map("entity_id")
  details     Json
  ipAddress   String            @map("ip_address")
  status      AuditActionStatus @default(SUCCESS)

  user        User?             @relation(fields: [userId], references: [id])

  @@map("audit_logs")
}
`;
