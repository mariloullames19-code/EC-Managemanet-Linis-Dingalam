import React, { useState } from 'react';
import { StorageMetrics, User } from '../types';
import {
  HardDrive,
  Trash2,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Archive,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react';

interface StoragePruningViewProps {
  metrics: StorageMetrics;
  currentUser: User;
  onPrunePhotos: (retentionDays: number) => Promise<{ success: boolean; prunedCount: number; bytesSaved: number }>;
}

export const StoragePruningView: React.FC<StoragePruningViewProps> = ({
  metrics,
  currentUser,
  onPrunePhotos,
}) => {
  const [retentionDays, setRetentionDays] = useState<number>(60);
  const [isPruning, setIsPruning] = useState(false);
  const [pruneResult, setPruneResult] = useState<{ prunedCount: number; bytesSaved: number } | null>(null);

  const isSuperadmin = currentUser.role === 'superadmin';

  const handleExecutePrune = async () => {
    if (!isSuperadmin) {
      alert('Access Denied: Only Superadmin (PESO Manager) can execute photo pruning.');
      return;
    }

    if (window.confirm(`Confirm Storage Pruning: This will downscale and prune compliance photos older than ${retentionDays} days to lightweight audit stubs. Audit metadata, coordinates, and timestamp proofs are permanently preserved.`)) {
      setIsPruning(true);
      setPruneResult(null);
      try {
        const res = await onPrunePhotos(retentionDays);
        setPruneResult({ prunedCount: res.prunedCount, bytesSaved: res.bytesSaved });
      } catch (err: any) {
        alert(err.message || 'Pruning failed');
      } finally {
        setIsPruning(false);
      }
    }
  };

  const totalStorageMb = (metrics.totalStorageBytes / (1024 * 1024)).toFixed(2);
  const savedMb = (metrics.totalPrunedBytesSaved / (1024 * 1024)).toFixed(2);
  const avgPhotoKb = Math.round(metrics.averagePhotoSizeBytes / 1024);

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
              Storage Optimization & Photo Pruning Utility
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Standardized WebP compression and automated archival of verified accomplishment media.
          </p>
        </div>

        {!isSuperadmin && (
          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold rounded-xl flex items-center shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-400" />
            Superadmin Required
          </span>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-slate-400">Total Photos</p>
          <p className="text-lg sm:text-2xl font-black text-white mt-0.5 sm:mt-1">{metrics.totalPhotos}</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">In cloud storage</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-cyan-400">Footprint</p>
          <p className="text-lg sm:text-2xl font-black text-cyan-400 mt-0.5 sm:mt-1">{totalStorageMb} MB</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">Standardized WebP</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-emerald-400">Pruned & Saved</p>
          <p className="text-lg sm:text-2xl font-black text-emerald-400 mt-0.5 sm:mt-1">{savedMb} MB</p>
          <span className="text-[9px] sm:text-[10px] text-emerald-500 font-mono">{metrics.totalPrunedCount} archived</span>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow">
          <p className="text-[10px] sm:text-[11px] font-mono uppercase text-amber-400">Avg Photo</p>
          <p className="text-lg sm:text-2xl font-black text-amber-400 mt-0.5 sm:mt-1">{avgPhotoKb} KB</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">1280x720 at 82%</span>
        </div>
      </div>

      {/* Pruning Control Console */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xl space-y-4 sm:space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center">
            <Sliders className="w-5 h-5 text-emerald-400 mr-2" />
            Retention Rules & Batch Pruning Configuration
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Define photo retention period for audit-verified field records. Photos older than the retention period will be downscaled to permanent audit stubs.
          </p>
        </div>

        {/* Retention Days Slider */}
        <div className="space-y-3 bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Retention Threshold:
            </label>
            <span className="text-base font-mono font-black text-emerald-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              {retentionDays} Days
            </span>
          </div>

          <input
            type="range"
            min="15"
            max="180"
            step="15"
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>15 Days (High-frequency)</span>
            <span>60 Days (Recommended)</span>
            <span>90 Days (Quarterly Audit)</span>
            <span>180 Days (Half-year)</span>
          </div>
        </div>

        {/* Compression Engine Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
            <p className="font-bold text-slate-300 flex items-center">
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
              Standard Dimensions
            </p>
            <p className="text-[11px] text-slate-400">
              Capped at 1280px width, aspect-ratio preserved. Prevents 4K camera bloat.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
            <p className="font-bold text-slate-300 flex items-center">
              <Archive className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
              WebP Standard 82%
            </p>
            <p className="text-[11px] text-slate-400">
              High-efficiency lossy compression with zero degradation of watermark text or GPS HUD.
            </p>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
            <p className="font-bold text-slate-300 flex items-center">
              <CheckCircle className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              Metadata Protection
            </p>
            <p className="text-[11px] text-slate-400">
              GPS coordinates, timestamp, and audit trail records are never pruned or purged.
            </p>
          </div>
        </div>

        {pruneResult && (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">Pruning Cycle Executed Successfully!</p>
              <p className="text-[11px]">
                Pruned {pruneResult.prunedCount} photos older than {retentionDays} days. Freed approx. {(pruneResult.bytesSaved / (1024 * 1024)).toFixed(2)} MB of storage space.
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleExecutePrune}
            disabled={!isSuperadmin || isPruning}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xl flex items-center transition-all active:scale-95"
          >
            {isPruning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Executing Pruning Batch...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Execute Photo Pruning ({retentionDays} Days Threshold)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
