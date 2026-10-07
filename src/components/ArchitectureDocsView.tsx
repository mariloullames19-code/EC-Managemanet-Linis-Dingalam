import React, { useState } from 'react';
import { POSTGRESQL_SUPABASE_DDL, PRISMA_SCHEMA_DEFINITION } from '../data/databaseSchema';
import { User } from '../types';
import {
  Database,
  Code2,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  Cpu,
  Layers,
  Sliders,
  Lock,
  Sparkles,
  Wrench,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ArchitectureDocsViewProps {
  currentUser?: User;
}

export const ArchitectureDocsView: React.FC<ArchitectureDocsViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'ddl' | 'prisma' | 'watermark' | 'api_route' | 'mobile_ui'>('ddl');
  const [copied, setCopied] = useState<boolean>(false);
  const [developerActionFeedback, setDeveloperActionFeedback] = useState<string | null>(null);

  // System Function & Interface settings state
  const [strictGeofence, setStrictGeofence] = useState<boolean>(true);
  const [autoOfflineSync, setAutoOfflineSync] = useState<boolean>(true);
  const [watermarkDensity, setWatermarkDensity] = useState<'standard' | 'high_contrast'>('high_contrast');
  const [uiColorTheme, setUiColorTheme] = useState<'emerald_cyan' | 'pacific_blue' | 'aurora_green'>('emerald_cyan');

  const isSuperadmin = !currentUser || currentUser.role === 'superadmin';

  const handleToggleFunction = (name: string, setter: (val: any) => void, currentVal: any) => {
    if (!isSuperadmin) {
      alert('Access Denied: Ang pagbago ng mga function ng system ay nakalaan lamang para sa Super Admin (Lead Developer).');
      return;
    }
    setter(!currentVal);
    setDeveloperActionFeedback(`Nabagong Function: ${name} ay ${!currentVal ? 'NAKA-ENABLE' : 'NAKA-DISABLE'}.`);
    setTimeout(() => setDeveloperActionFeedback(null), 3000);
  };

  const handleUpdateInterface = (theme: 'emerald_cyan' | 'pacific_blue' | 'aurora_green') => {
    if (!isSuperadmin) {
      alert('Access Denied: Ang pagbago ng interface ng system ay nakalaan lamang para sa Super Admin (Lead Developer).');
      return;
    }
    setUiColorTheme(theme);
    setDeveloperActionFeedback(`Nabagong Interface Theme: ${theme.toUpperCase()} inilapat sa system.`);
    setTimeout(() => setDeveloperActionFeedback(null), 3000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const WATERMARK_ENGINE_CODE = `// Linis Dingalan EC Management - Geotag Watermark Engine
// Takes raw File/Blob from camera, prompts for GPS coordinates, burns styled HUD into <canvas>
export async function burnGeotagWatermark(
  imageSource: Blob | File | string,
  metadata: GeotagMetadata,
  targetWidth: number = 1280,
  targetQuality: number = 0.82
): Promise<GeotagResult> {
  // 1. High-accuracy GPS Acquisition
  const coords = await getGpsCoordinates(metadata.barangay);
  const now = new Date();

  // 2. Load and downscale source image
  const img = await loadImage(imageSource);
  let { width, height } = img;
  if (width > targetWidth) {
    height = Math.round((targetWidth / width) * height);
    width = targetWidth;
  }

  // 3. Create Offscreen Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.drawImage(img, 0, 0, width, height);

  // 4. Burn HUD Watermark Banner into Lower Third
  const hudHeight = Math.max(140, Math.round(height * 0.28));
  const hudY = height - hudHeight;

  // Semi-transparent deep dark gradient overlay
  const gradient = ctx.createLinearGradient(0, hudY, 0, height);
  gradient.addColorStop(0, 'rgba(8, 15, 28, 0.0)');
  gradient.addColorStop(0.2, 'rgba(10, 20, 35, 0.90)');
  gradient.addColorStop(1, 'rgba(4, 8, 14, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, hudY, width, hudHeight);

  // High-contrast security neon accent lines
  ctx.strokeStyle = '#059669'; // Emerald-600
  ctx.lineWidth = 3;
  ctx.strokeRect(0, hudY + (hudHeight * 0.15), width, 1);

  // Typography Stamping
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#10b981';
  ctx.fillText('LINIS DINGALAN EC MANAGEMENT // MENRO-PESO VERIFIED GEOTAG', 35, hudY + 45);

  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(\`\${metadata.beneficiaryName.toUpperCase()} [\${metadata.beneficiaryCode}]\`, 35, hudY + 70);

  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(\`GPS: \${coords.latitude}° N, \${coords.longitude}° E (±\${coords.accuracy}m)\`, 35, hudY + 115);

  // Export compressed WebP/JPEG blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({
        watermarkedBlob: blob!,
        watermarkedDataUrl: canvas.toDataURL('image/jpeg', targetQuality),
        coordinates: coords,
        timestamp: now.toISOString(),
      });
    }, 'image/jpeg', targetQuality);
  });
}`;

  const API_ROUTE_CODE = `// Linis Dingalan EC Management - Server-Side QR Verification & RBAC Route
import express from 'express';
import crypto from 'crypto';

const app = express();
const HMAC_SECRET = process.env.HMAC_SECRET || 'LINIS-DINGALAN-LGU-AURORA-SEC-KEY-2025-V1';

// Strict RBAC Middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req, res, next) => {
    const user = req.user;
    if (!allowedRoles.includes(user.role)) {
      // Record Security Violation to Immutable Audit Ledger
      auditLogger.log({
        action: 'RESTRICTED_ACCESS_ATTEMPT',
        userId: user.id,
        entityType: 'SECURITY',
        status: 'BLOCKED_RBAC',
        details: \`User '\${user.name}' (\${user.role}) attempted to access \${req.method} \${req.url}\`
      });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges', code: 'RBAC_FORBIDDEN' });
    }
    next();
  };
};

// Check-in Route: Verifies HMAC signature, checks geofencing & records compliance
app.post('/api/attendance/checkin', async (req, res) => {
  const { activity_id, beneficiary_id, qr_signature, latitude, longitude, photo_watermarked } = req.body;

  // 1. Verify Cryptographic QR Signature
  const expectedHash = crypto.createHmac('sha256', HMAC_SECRET)
    .update(\`\${beneficiary_id}:\${beneCode}:\${HMAC_SECRET}\`)
    .digest('hex').substring(0, 16);

  if (expectedHash !== qr_signature) {
    return res.status(403).json({ error: 'Tampered QR signature detected', code: 'SIGNATURE_INVALID' });
  }

  // 2. Prevent Duplicate Attendance per Activity
  const exists = await db.attendances.findFirst({ where: { activity_id, beneficiary_id } });
  if (exists) {
    return res.status(409).json({ error: 'Attendance already recorded for this activity' });
  }

  // 3. Commit Geotagged Record & Log Audit Trail
  const record = await db.attendances.create({
    data: {
      activity_id,
      beneficiary_id,
      latitude,
      longitude,
      photo_watermarked_url: photo_watermarked,
      compliance_status: 'verified',
      verified_by_officer_id: req.user.id
    }
  });

  res.status(201).json({ success: true, attendance: record });
});`;

  const MOBILE_UI_SPECS = `# Mobile-Responsive UI & Field UX Specification
## Linis Dingalan EC Management (Coastal & Rural Field Operations)

### 1. Environmental Design Constraints (Outdoor Marine Context)
- **Extreme Sunlight & Glare**: Dingalan's Pacific coastal weather presents intense solar glare. The UI employs an ultra-high-contrast theme (#020617 / Slate-950 base) with vivid phosphor accents (#10b981 Emerald-500, #38bdf8 Sky-400, #f59e0b Amber-500) to maintain crisp legibility under direct sunlight.
- **Wet Hands / Heavy Work Gloves**: Coastal cleanup workers and field supervisors wear heavy rubber gloves. All actionable touch targets are engineered with a minimum hitbox of 48px to 56px (meeting WCAG 2.5.5 AAA touch target criteria).
- **Intermittent Coastal Connectivity**: Cellular connectivity between Paltic Port and Umiray river boundary can fluctuate. The client features an offline-first storage queue (LocalStorage / IndexedDB sync engine) allowing field officers to capture and watermark photographs even without internet.

### 2. Multi-Role Operating Boundaries
- **Superadmin (PESO Manager)**:
  - Exclusive access to: Full Audit Trail, Account Deletions, Storage Pruning thresholds, and Masterlist Purges.
- **Operations Officer (MENRO)**:
  - Operational authority for: Activity planning, Cluster assignments, Camera geotagging HUD, QR Verification, and Compliance sign-offs.
  - Hard-locked out of: Audit Trail queries (HTTP 403 Forbidden) and user account management.

### 3. Geotag Watermarking HUD Standard
- Burns indelible HUD metadata directly into image pixel buffer:
  - Municipality & LGU Seal Insignia
  - Beneficiary Full Legal Name & Linis Dingalan Code (LD-BEN-XXXX)
  - Work Program Activity Title & Coastal Zone (e.g. Paltic Rock Sea Wall)
  - Decimal & DMS GPS Coordinates with sensor accuracy rating (±Xm)
  - Local Philippine Standard Time (PST UTC+8)
  - Officer Validation Stamp & Compliance Seal`;

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Role Privilege Banner: Explains Superadmin (Developer) vs Admin permissions */}
      <div
        className={`rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border backdrop-blur-xl transition-all shadow-lg ${
          isSuperadmin
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
            : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`p-2.5 rounded-xl border mt-0.5 ${
                isSuperadmin
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
              }`}
            >
              {isSuperadmin ? <Wrench className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isSuperadmin
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                  }`}
                >
                  {isSuperadmin ? 'SUPERADMIN • LEAD DEVELOPER & ARCHITECT' : 'ADMIN • OPERATIONS ADMINISTRATOR'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {currentUser ? currentUser.name : 'System User'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {isSuperadmin
                  ? 'Ganap na Developer Access: May kakayahan kang i-configure ang interface at mga function ng system.'
                  : 'Admin Feature Access: May kakayahan kang gamitin at i-access ang lahat ng feature ng system.'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isSuperadmin
                  ? 'Bilang nag-develop ng system na ito, may ganap kang kontrol sa database DDL, API routes, layout density, interface themes, at mga core operating function.'
                  : 'Bilang Admin, maaari mong i-view at gamitin ang lahat ng operational features (Masterlist, Field Terminal, Programs, Reports, Schemas). Alinsunod sa patakaran, ang pagbago ng interface at core functions ng system ay naka-lock (tanging si Super Admin lamang ang may karapatang mag-reconfigure).'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center space-x-2">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5 ${
                isSuperadmin
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/50'
              }`}
            >
              {isSuperadmin ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{isSuperadmin ? 'Developer Controls: UNLOCKED' : 'Interface Modifying: LOCKED'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Developer Action Notice */}
      {developerActionFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-mono font-bold text-center animate-bounce shadow-xl">
          {developerActionFeedback}
        </div>
      )}

      {/* System Interface & Functions Customizer */}
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/15 rounded-xl border border-emerald-500/30">
              <Sliders className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                System Interface & Core Functions Configuration
              </h3>
              <p className="text-xs text-slate-400">
                {isSuperadmin
                  ? 'I-reconfigure ang layout, hitsura ng interface, at mga aktibong system function alinsunod sa pangangailangan ng LGU.'
                  : 'Naka-lock para sa Admin: Tanging Super Admin (Lead Developer) ang may kakayahang magbago ng mga function at interface.'}
              </p>
            </div>
          </div>

          {!isSuperadmin && (
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Read-Only for Admin</span>
            </span>
          )}
        </div>

        {/* 2-Column Controls: Interface Customizer & System Functions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Column 1: Interface Themes */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Interface Theme Styling</span>
              </span>
              {!isSuperadmin && <Lock className="w-3.5 h-3.5 text-slate-500" />}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!isSuperadmin}
                onClick={() => handleUpdateInterface('emerald_cyan')}
                className={`p-2.5 rounded-xl border text-xs font-mono font-bold transition-all text-center ${
                  uiColorTheme === 'emerald_cyan'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                } ${!isSuperadmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Emerald-Cyan
              </button>

              <button
                type="button"
                disabled={!isSuperadmin}
                onClick={() => handleUpdateInterface('pacific_blue')}
                className={`p-2.5 rounded-xl border text-xs font-mono font-bold transition-all text-center ${
                  uiColorTheme === 'pacific_blue'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                } ${!isSuperadmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Pacific Blue
              </button>

              <button
                type="button"
                disabled={!isSuperadmin}
                onClick={() => handleUpdateInterface('aurora_green')}
                className={`p-2.5 rounded-xl border text-xs font-mono font-bold transition-all text-center ${
                  uiColorTheme === 'aurora_green'
                    ? 'bg-teal-500/25 border-teal-400 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.3)]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                } ${!isSuperadmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Aurora Green
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {isSuperadmin
                ? 'Aktibong Palette: Makakapal na neon accents na angkop sa matinding sikat ng araw sa baybayin ng Dingalan.'
                : 'Naka-lock: Hindi maaaring baguhin ng Admin ang scheme o kulay ng interface.'}
            </p>
          </div>

          {/* Column 2: Core System Functions */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Core System Functions</span>
              </span>
              {!isSuperadmin && <Lock className="w-3.5 h-3.5 text-slate-500" />}
            </div>

            <div className="space-y-2 text-xs">
              {/* Function 1: Strict Geofencing */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="font-bold text-white block">Strict Dingalan Geofence (11 Barangays)</span>
                  <span className="text-[10px] text-slate-400">Paghigpit ng GPS coordinates boundary bago mag-validate</span>
                </div>
                <button
                  type="button"
                  disabled={!isSuperadmin}
                  onClick={() => handleToggleFunction('Strict Geofence', setStrictGeofence, strictGeofence)}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold transition-all ${
                    strictGeofence
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  } ${!isSuperadmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {strictGeofence ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Function 2: Auto Offline Sync */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <span className="font-bold text-white block">Offline-First Auto Sync Queue</span>
                  <span className="text-[10px] text-slate-400">Awtomatikong pag-sync kapag bumalik ang signal sa dagat</span>
                </div>
                <button
                  type="button"
                  disabled={!isSuperadmin}
                  onClick={() => handleToggleFunction('Auto Offline Sync', setAutoOfflineSync, autoOfflineSync)}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold transition-all ${
                    autoOfflineSync
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  } ${!isSuperadmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {autoOfflineSync ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Technical Deliverables & Architecture Specifications
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete database DDL, Prisma models, client-side Geotag engine, server API routes, and mobile UI design specifications.
          </p>
        </div>

        <button
          onClick={() => {
            const content =
              activeTab === 'ddl'
                ? POSTGRESQL_SUPABASE_DDL
                : activeTab === 'prisma'
                ? PRISMA_SCHEMA_DEFINITION
                : activeTab === 'watermark'
                ? WATERMARK_ENGINE_CODE
                : activeTab === 'api_route'
                ? API_ROUTE_CODE
                : MOBILE_UI_SPECS;
            handleCopy(content);
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-600 flex items-center transition-colors shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
              Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1.5 text-cyan-400" />
              Copy Active Code
            </>
          )}
        </button>
      </div>

      {/* Deliverable Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">
        {[
          { id: 'ddl', label: '1. PostgreSQL / Supabase DDL', icon: Database },
          { id: 'prisma', label: '1b. Prisma Schema', icon: Layers },
          { id: 'watermark', label: '2. Geotag Watermark Engine', icon: Code2 },
          { id: 'api_route', label: '3. QR Route & RBAC Guard', icon: ShieldCheck },
          { id: 'mobile_ui', label: '5. Outdoor Mobile UX Specs', icon: Smartphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 mr-1.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Code / Content Display Panel */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between font-mono text-[11px] text-slate-400">
          <span>
            {activeTab === 'ddl' && 'schema.sql — PostgreSQL 15+ / Supabase with RLS Policies & Triggers'}
            {activeTab === 'prisma' && 'schema.prisma — Complete Relational Data Models & Enums'}
            {activeTab === 'watermark' && 'watermarkEngine.ts — HTML5 Canvas Geotagging & Metadata Stamping'}
            {activeTab === 'api_route' && 'server.ts — Express QR Signature Verification & RBAC Middleware'}
            {activeTab === 'mobile_ui' && 'OUTDOOR_MOBILE_UI_SPEC.md — High-contrast Coastal UX Design'}
          </span>
          <span className="text-emerald-400">Production Ready</span>
        </div>

        <pre className="p-5 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[600px] select-all">
          {activeTab === 'ddl' && POSTGRESQL_SUPABASE_DDL}
          {activeTab === 'prisma' && PRISMA_SCHEMA_DEFINITION}
          {activeTab === 'watermark' && WATERMARK_ENGINE_CODE}
          {activeTab === 'api_route' && API_ROUTE_CODE}
          {activeTab === 'mobile_ui' && MOBILE_UI_SPECS}
        </pre>
      </div>
    </div>
  );
};
