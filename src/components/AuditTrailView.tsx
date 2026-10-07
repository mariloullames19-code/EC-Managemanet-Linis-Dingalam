import React, { useState, useMemo } from 'react';
import { AuditLog, User } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  AlertTriangle,
  Lock,
  ArrowRight,
  Filter,
  CheckCircle2,
  Terminal,
} from 'lucide-react';

interface AuditTrailViewProps {
  auditLogs: AuditLog[];
  currentUser: User;
  onSwitchToSuperadmin: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  auditLogs,
  currentUser,
  onSwitchToSuperadmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Enforce RBAC boundary on Client
  const isSuperadmin = currentUser.role === 'superadmin';

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesSearch =
        `${log.action} ${log.userName} ${log.details} ${log.entityType} ${log.ipAddress}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [auditLogs, searchTerm, statusFilter]);

  const handleExportCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'User', 'Role', 'Department', 'Action', 'Entity', 'Details', 'IP Address', 'Status'];
    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.department}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ipAddress}"`,
      `"${l.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Linis-Dingalan-Audit-Trail-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user is MENRO, show strict RBAC restriction boundary
  if (!isSuperadmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-slate-900 border-2 border-rose-500/70 rounded-2xl p-8 shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 bg-rose-500/10 border-2 border-rose-500/40 rounded-full flex items-center justify-center mx-auto text-rose-400">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            HTTP 403 FORBIDDEN • RBAC ENFORCED
          </span>
          <h2 className="text-2xl font-black text-white mt-3">
            Audit Trail Access Restricted
          </h2>
          <p className="text-xs text-slate-300 max-w-lg mx-auto mt-2 leading-relaxed">
            By statutory mandate, Operations Officers (MENRO) are strictly barred from querying system-wide audit trail logs. This boundary ensures independent, tamper-proof accountability for the PESO Division Head.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-slate-400 space-y-1">
          <p className="text-rose-400 font-bold">API Security Policy Response:</p>
          <p>GET /api/audit-logs</p>
          <p>Status: 403 Forbidden</p>
          <p>Required Roles: ['superadmin']</p>
          <p>Current Role: '{currentUser.role}' ({currentUser.name})</p>
          <p className="text-amber-400">Security event logged in PESO Security Ledger.</p>
        </div>

        <div className="pt-2">
          <button
            onClick={onSwitchToSuperadmin}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg inline-flex items-center space-x-2 transition-transform active:scale-95"
          >
            <span>Switch to Superadmin (PESO Manager) Role</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 sm:p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
              PESO Manager Audit Trail & Security Ledger
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Immutable log of all user registrations, attendance geotags, RBAC security blocks, and photo pruning events.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
        <div className="md:col-span-8 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by Action, Officer Name, IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Outcomes ({auditLogs.length})</option>
            <option value="SUCCESS">SUCCESS Only</option>
            <option value="BLOCKED_RBAC">BLOCKED_RBAC (Security)</option>
            <option value="FAILED">FAILED Attempts</option>
          </select>
        </div>
      </div>

      {/* Logs Container */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
        {/* MOBILE VIEW: Compact Cards (< 640px) */}
        <div className="sm:hidden p-2 space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="bg-slate-900/90 border border-slate-750 rounded-xl p-2.5 space-y-1.5 cursor-pointer hover:border-emerald-500/50 transition-colors shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-white text-xs">{log.action}</div>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {log.userName} [{log.department}]
                  </span>
                </div>
                {log.status === 'SUCCESS' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    SUCCESS
                  </span>
                )}
                {log.status === 'BLOCKED_RBAC' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0 animate-pulse">
                    BLOCKED
                  </span>
                )}
                {log.status === 'FAILED' && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    FAILED
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <span>{new Date(log.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} PST</span>
                <span>{log.entityType} • {log.ipAddress}</span>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP VIEW: Table (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/60 text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Timestamp (UTC/Local)</th>
                <th className="py-3 px-4">Officer / User</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs">
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-700/30 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                    {new Date(log.timestamp).toLocaleString('en-PH', {
                      timeZone: 'Asia/Manila',
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-white group-hover:text-emerald-300">
                      {log.userName}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      [{log.department} • {log.userRole}]
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono font-bold text-xs text-slate-200">
                    {log.action}
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                      {log.entityType}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {log.ipAddress}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {log.status === 'SUCCESS' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        SUCCESS
                      </span>
                    )}
                    {log.status === 'BLOCKED_RBAC' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                        BLOCKED_RBAC
                      </span>
                    )}
                    {log.status === 'FAILED' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        FAILED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Inspection Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative max-w-xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <Terminal className="w-5 h-5 text-emerald-400 mr-2" />
                Audit Trail Event Details
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Log Entry ID:</span>
                <span className="text-white">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-emerald-400">{selectedLog.timestamp}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Operator:</span>
                <span className="text-white">{selectedLog.userName} ({selectedLog.userRole})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Action:</span>
                <span className="text-cyan-400 font-bold">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Entity:</span>
                <span className="text-slate-300">{selectedLog.entityType} ({selectedLog.entityId || 'N/A'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Client IP:</span>
                <span className="text-slate-300">{selectedLog.ipAddress}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Outcome Status:</span>
                <span className="text-white font-bold">{selectedLog.status}</span>
              </div>

              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Details Payload:</span>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-200 text-[11px] leading-relaxed break-words">
                  {selectedLog.details}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
