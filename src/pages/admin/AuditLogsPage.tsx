import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  History,
  Info,
  Search,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Shield,
  Terminal,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { auditLogService } from '../../services/auditLogService';
import { userService, UserManagementItem } from '../../services/userService';
import { AuditLogItem, AuditLogFilter } from '../../types/auditLog.types';

/**
 * Defensive filtering function to redact sensitive fields in metadata.
 * Processes arrays and objects recursively. Matching is case-insensitive.
 */
export function sanitizeAuditMetadata(metadata: any): any {
  if (metadata === null || metadata === undefined) {
    return metadata;
  }

  const sensitiveKeys = [
    'password',
    'passwd',
    'pass',
    'token',
    'access_token',
    'refresh_token',
    'id_token',
    'secret',
    'client_secret',
    'api_key',
    'apikey',
    'private_key',
    'privateKey',
    'authorization',
    'credential',
    'credentials'
  ];

  const isSensitiveKey = (key: string): boolean => {
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(s => lowerKey === s.toLowerCase());
  };

  if (Array.isArray(metadata)) {
    return metadata.map(item => sanitizeAuditMetadata(item));
  }

  if (typeof metadata === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeAuditMetadata(value);
      }
    }
    return sanitized;
  }

  return metadata;
}

// Human-readable action label translations
const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Masuk Sesi (Login)',
  LOGOUT: 'Keluar Sesi (Logout)',
  CREATE: 'Tambah Baru',
  UPDATE: 'Pembaruan Data',
  DELETE: 'Penghapusan Data',
  ROLE_CHANGE: 'Perubahan Peran',
  CHECK_IN: 'Presensi Masuk',
  CHECK_OUT: 'Presensi Keluar',
  APPROVE: 'Persetujuan Pengajuan',
  REJECT: 'Penolakan Pengajuan',
  CANCEL: 'Pembatalan Pengajuan',
  SYSTEM_SETTING_CHANGE: 'Pengaturan Sistem',
};

// Human-readable target type label translations
const TARGET_TYPE_LABELS: Record<string, string> = {
  USER: 'Akun Pengguna',
  EMPLOYEE: 'Profil Pegawai',
  ROLE: 'Otoritas Peran',
  LOCATION: 'Lokasi Presensi',
  WORK_SCHEDULE: 'Jadwal Kerja',
  HOLIDAY: 'Hari Libur Resmi',
  REQUEST: 'Pengajuan Izin',
  ATTENDANCE: 'Transaksi Presensi',
  SYSTEM_SETTING: 'Konfigurasi Aplikasi',
};

// Beautiful semantic colors based on the design guide action types
const getActionBadgeVariant = (action: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  switch (action) {
    case 'CREATE':
    case 'APPROVE':
    case 'CHECK_IN':
      return 'success';
    case 'DELETE':
    case 'REJECT':
      return 'danger';
    case 'UPDATE':
    case 'ROLE_CHANGE':
    case 'SYSTEM_SETTING_CHANGE':
      return 'warning';
    case 'LOGIN':
    case 'CHECK_OUT':
      return 'info';
    case 'LOGOUT':
    case 'CANCEL':
    default:
      return 'default';
  }
};

export const AuditLogsPage: React.FC = () => {
  // Lists & States
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [userMap, setUserMap] = useState<Record<string, UserManagementItem>>({});
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Pagination State
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  // Filters State
  const [filterActor, setFilterActor] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterTargetType, setFilterTargetType] = useState<string>('');
  const [filterTargetId, setFilterTargetId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // UI Status
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal State for Inspection
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedField, setCopiedField] = useState<'id' | 'metadata' | 'ip' | null>(null);

  // Success Toast for Copy Actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Fetch system users to resolve actor names
  const loadUsers = useCallback(async () => {
    try {
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers);
      
      const mapping: Record<string, UserManagementItem> = {};
      fetchedUsers.forEach((u) => {
        mapping[u.id] = u;
      });
      setUserMap(mapping);
    } catch (err) {
      console.warn('Failed to resolve users list for audit logs:', err);
    }
  }, []);

  // 2. Fetch Paginated Audit Logs from Service with criteria
  const loadLogs = useCallback(async (targetPage = page, quiet = false) => {
    if (!quiet) setIsLoading(true);
    setErrorMsg(null);

    const activeFilter: AuditLogFilter = {};
    if (filterActor) activeFilter.actor_user_id = filterActor;
    if (filterAction) activeFilter.action = filterAction;
    if (filterTargetType) activeFilter.target_type = filterTargetType;
    if (filterTargetId.trim()) activeFilter.target_id = filterTargetId.trim();
    if (filterStartDate) activeFilter.start_date = filterStartDate;
    if (filterEndDate) activeFilter.end_date = filterEndDate;

    try {
      const response = await auditLogService.getAuditLogs(activeFilter, targetPage, pageSize);
      setLogs(response.logs);
      setTotalCount(response.totalCount);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memuat log audit aktivitas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filterActor, filterAction, filterTargetType, filterTargetId, filterStartDate, filterEndDate, page]);

  // Handle Mount & Filter changes
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    // Reset to page 1 whenever filters change
    setPage(1);
    loadLogs(1);
  }, [filterActor, filterAction, filterTargetType, filterTargetId, filterStartDate, filterEndDate]);

  // Handle Explicit Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadUsers(), loadLogs(page, true)]);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterActor('');
    setFilterAction('');
    setFilterTargetType('');
    setFilterTargetId('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(1);
  };

  // Local Timezone Makassar (WITA) Date Formatter
  const formatWita = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '—';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '—';

    const formatted = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Makassar',
    }).format(date);

    return `${formatted} WITA`;
  };

  // Copy helper
  const handleCopyToClipboard = (text: string, field: 'id' | 'metadata' | 'ip') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast(`Berhasil menyalin ${field === 'id' ? 'ID Log' : field === 'ip' ? 'Alamat IP' : 'JSON Metadata'}.`);
    setTimeout(() => {
      setCopiedField(null);
    }, 1500);
  };

  // Pagination calculation
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handlePrevPage = () => {
    if (page > 1) {
      const prev = page - 1;
      setPage(prev);
      loadLogs(prev);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      const next = page + 1;
      setPage(next);
      loadLogs(next);
    }
  };

  const hasActiveFilters = 
    !!filterActor || 
    !!filterAction || 
    !!filterTargetType || 
    !!filterTargetId.trim() || 
    !!filterStartDate || 
    !!filterEndDate;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] bg-[#1F2937] text-white px-4 py-3 rounded-xl shadow-lg border border-[#374151] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                Keamanan & Kepatuhan
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-xs text-[#6B7280] font-mono tabular-nums">
                Total: {totalCount} log
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-1">
              Log Audit Aktivitas Sistem
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Jejak audit digital permanen mencakup akses masuk, mutasi data, dan otorisasi administratif.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Reset Filter
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3.5 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" /> Filter Log Audit
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Actor Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">Aktor</label>
            <select
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className="w-full h-11 text-sm text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 px-3 transition-colors"
            >
              <option value="">Semua Aktor</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">Tindakan</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full h-11 text-sm text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 px-3 transition-colors"
            >
              <option value="">Semua Tindakan</option>
              {Object.entries(ACTION_LABELS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Target Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">Tipe Target</label>
            <select
              value={filterTargetType}
              onChange={(e) => setFilterTargetType(e.target.value)}
              className="w-full h-11 text-sm text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 px-3 transition-colors"
            >
              <option value="">Semua Tipe Target</option>
              {Object.entries(TARGET_TYPE_LABELS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {/* Target ID Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">ID Target</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari ID..."
                value={filterTargetId}
                onChange={(e) => setFilterTargetId(e.target.value)}
                className="w-full h-11 pl-9 pr-3 text-sm text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">Mulai Tanggal</label>
            <div className="relative">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full h-11 pl-9 pr-3 text-sm text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
              />
              <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">Selesai Tanggal</label>
            <div className="relative">
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full h-11 pl-9 pr-3 text-sm text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 transition-colors"
              />
              <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
        {errorMsg ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Gagal Memuat Data</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={() => loadLogs(page)}>
              Coba Lagi
            </Button>
          </div>
        ) : isLoading ? (
          /* High Fidelity Skeleton Loader */
          <div className="divide-y divide-slate-100">
            <div className="bg-slate-50 px-6 py-3.5 grid grid-cols-12 gap-4">
              <div className="col-span-2 h-4 bg-slate-200 rounded-sm w-16" />
              <div className="col-span-3 h-4 bg-slate-200 rounded-sm w-24" />
              <div className="col-span-2 h-4 bg-slate-200 rounded-sm w-20" />
              <div className="col-span-3 h-4 bg-slate-200 rounded-sm w-32" />
              <div className="col-span-2 h-4 bg-slate-200 rounded-sm w-16" />
            </div>
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="px-6 py-4.5 grid grid-cols-12 gap-4 animate-pulse">
                <div className="col-span-2 space-y-1.5">
                  <div className="h-4 bg-slate-100 rounded-sm w-28" />
                  <div className="h-3 bg-slate-50 rounded-sm w-20" />
                </div>
                <div className="col-span-3 space-y-1.5">
                  <div className="h-4 bg-slate-100 rounded-sm w-44" />
                  <div className="h-3 bg-slate-50 rounded-sm w-32" />
                </div>
                <div className="col-span-2">
                  <div className="h-6 bg-slate-100 rounded-full w-24" />
                </div>
                <div className="col-span-3 space-y-1.5">
                  <div className="h-4 bg-slate-100 rounded-sm w-36" />
                  <div className="h-3 bg-slate-50 rounded-sm w-20" />
                </div>
                <div className="col-span-2">
                  <div className="h-8 bg-slate-100 rounded-xl w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          /* Human Crafted Empty State */
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-3xs">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#111827]">Tidak Ada Log Ditemukan</h4>
            <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1.5 leading-relaxed">
              {hasActiveFilters 
                ? 'Tidak ada log aktivitas sistem yang memenuhi kriteria pencarian filter Anda.' 
                : 'Sistem belum merekam entri log audit dalam database.'}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={handleResetFilters} className="mt-4">
                Bersihkan Semua Filter
              </Button>
            )}
          </div>
        ) : (
          /* Actual Data Area */
          <>
            {/* Desktop & Tablet Table View (Visible on viewports >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-xs font-bold text-[#4B5563] uppercase tracking-wider">
                    <th className="px-6 py-3.5 w-[20%]">Waktu (Makassar WITA)</th>
                    <th className="px-6 py-3.5 w-[25%]">Aktor</th>
                    <th className="px-6 py-3.5 w-[15%]">Tindakan</th>
                    <th className="px-6 py-3.5 w-[25%]">Objek Target</th>
                    <th className="px-6 py-3.5 w-[15%] text-right">Inspeksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-sm text-[#374151]">
                  {logs.map((log) => {
                    const resolvedActor = log.actor_user_id ? userMap[log.actor_user_id] : null;
                    const actorName = resolvedActor?.full_name || log.actor_email || 'Sistem Otomatis';
                    const actorRole = resolvedActor?.role || log.actor_role || 'system';

                    return (
                      <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors group">
                        {/* Formatted Date & Time */}
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs text-[#111827] tabular-nums font-semibold">
                            {formatWita(log.created_at)}
                          </div>
                        </td>

                        {/* Actor details with responsive visual weight */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800">{actorName}</span>
                            <span className="text-[11px] text-[#9CA3AF] tracking-tight truncate max-w-xs">
                              {log.actor_user_id ? `ID: ${log.actor_user_id}` : 'Proses Terjadwal'}
                            </span>
                          </div>
                        </td>

                        {/* Action types */}
                        <td className="px-6 py-4">
                          <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </td>

                        {/* Target description and shortened target UUID */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-slate-700">
                              {TARGET_TYPE_LABELS[log.target_type] || log.target_type}
                            </span>
                            <span className="font-mono text-[11px] text-[#6B7280] tracking-tight select-all">
                              {log.target_id || 'Global Config'}
                            </span>
                          </div>
                        </td>

                        {/* Info inspection trigger */}
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="hover:bg-[#F3F4F6] text-slate-500 hover:text-slate-900"
                          >
                            <Eye className="w-4 h-4 mr-1.5" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (Visible on viewports < md) */}
            <div className="block md:hidden divide-y divide-[#E5E7EB]">
              {logs.map((log) => {
                const resolvedActor = log.actor_user_id ? userMap[log.actor_user_id] : null;
                const actorName = resolvedActor?.full_name || log.actor_email || 'Sistem Otomatis';
                const actorRole = resolvedActor?.role || log.actor_role || 'system';

                return (
                  <div key={log.id} className="p-4.5 space-y-3.5 hover:bg-[#F9FAFB] transition-colors">
                    {/* Header line: Waktu & Action badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#111827] font-semibold">
                        {formatWita(log.created_at)}
                      </span>
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </div>

                    {/* Actor information */}
                    <div className="text-xs space-y-1">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                        Aktor
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{actorName}</span>
                        <span className="text-[10px] bg-[#F3F4F6] text-[#4B5563] px-1.5 py-0.5 rounded font-semibold uppercase font-mono">
                          {actorRole}
                        </span>
                      </div>
                    </div>

                    {/* Target info */}
                    <div className="text-xs space-y-1">
                      <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                        Target Objek
                      </span>
                      <div className="text-slate-800">
                        <span className="font-bold mr-1.5">
                          {TARGET_TYPE_LABELS[log.target_type] || log.target_type}
                        </span>
                        <span className="font-mono bg-slate-50 border border-slate-100 px-1 py-0.5 rounded text-[11px] select-all">
                          {log.target_id || 'Global System Config'}
                        </span>
                      </div>
                    </div>

                    {/* Reason if available */}
                    {log.reason && (
                      <div className="text-xs space-y-1">
                        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block">
                          Alasan
                        </span>
                        <div className="text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] p-2.5 rounded-xl font-medium">
                          {log.reason}
                        </div>
                      </div>
                    )}

                    {/* Touch target compliant trigger (Height is h-11 i.e., 44px) */}
                    <div className="pt-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="h-11 w-full text-xs font-semibold rounded-xl border border-[#E5E7EB] hover:bg-[#F3F4F6] text-[#374151] active:bg-[#E5E7EB] transition-colors flex items-center justify-center gap-1.5 shadow-3xs"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                        Detail Inspeksi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer Pagination Bar */}
        {!errorMsg && logs.length > 0 && (
          <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] px-6 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-800 font-mono tabular-nums">{(page - 1) * pageSize + 1}</span> sampai{' '}
              <span className="font-bold text-slate-800 font-mono tabular-nums">
                {Math.min(page * pageSize, totalCount)}
              </span>{' '}
              dari <span className="font-bold text-slate-800 font-mono tabular-nums">{totalCount}</span> log
            </span>

            {/* Segmented pagination */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 1}
                className="h-8.5 w-8.5 !p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1 px-2.5">
                <span className="text-xs font-bold text-slate-800 font-mono tabular-nums">{page}</span>
                <span className="text-xs text-slate-400 font-mono">/</span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="h-8.5 w-8.5 !p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* High Fidelity Metadata Inspector Modal */}
      {selectedLog && (() => {
        // Apply defensive redaction on metadata on UI visualizer level
        const sanitizedMetadata = sanitizeAuditMetadata(selectedLog.metadata);
        
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            {/* Overlay Scrim */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
              onClick={() => setSelectedLog(null)} 
            />

            {/* Modal Container */}
            <div className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-[#F9FAFB] border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#F97316]" />
                  <h4 className="text-sm font-bold text-slate-900">Inspektor Detail Log Audit</h4>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                
                {/* Primary Grid metadata */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
                  <div>
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">Log ID</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono bg-slate-50 border border-slate-100 text-slate-700 px-1.5 py-0.5 rounded select-all font-semibold">
                        {selectedLog.id}
                      </span>
                      <button
                        onClick={() => handleCopyToClipboard(selectedLog.id, 'id')}
                        className="text-slate-400 hover:text-[#F97316] p-0.5"
                      >
                        {copiedField === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">Waktu Perekaman</span>
                    <span className="font-bold text-slate-800 block mt-1 font-mono tabular-nums">
                      {formatWita(selectedLog.created_at)}
                    </span>
                  </div>

                  <div className="col-span-2 border-b border-dashed border-slate-100 my-1" />

                  <div>
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">Aktor Transaksi</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {userMap[selectedLog.actor_user_id || '']?.full_name || selectedLog.actor_email || 'Sistem Otomatis'}
                      </span>
                      <span className="text-[10px] bg-[#F3F4F6] text-[#4B5563] px-1.5 py-0.5 rounded font-semibold tracking-wider uppercase font-mono">
                        {userMap[selectedLog.actor_user_id || '']?.role || selectedLog.actor_role || 'system'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">Koneksi & IP</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-slate-700 font-semibold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-all">
                        {selectedLog.ip_address || '—'}
                      </span>
                      {selectedLog.ip_address && (
                        <button
                          onClick={() => handleCopyToClipboard(selectedLog.ip_address!, 'ip')}
                          className="text-slate-400 hover:text-[#F97316] p-0.5"
                        >
                          {copiedField === 'ip' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">User Agent</span>
                    <span className="text-slate-600 block mt-1 font-mono text-[10.5px] leading-relaxed bg-slate-50 border border-slate-100 p-2 rounded-xl max-w-full overflow-x-auto select-all">
                      {selectedLog.user_agent || 'Tidak tersedia'}
                    </span>
                  </div>

                  <div className="col-span-2 border-b border-dashed border-slate-100 my-1" />

                  <div>
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">Tindakan Sistem</span>
                    <div className="mt-1">
                      <Badge variant={getActionBadgeVariant(selectedLog.action)} size="sm">
                        {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">Identitas Target</span>
                    <div className="mt-1 text-slate-800">
                      <span className="font-bold mr-1.5">{TARGET_TYPE_LABELS[selectedLog.target_type] || selectedLog.target_type}</span>
                      <span className="font-mono bg-slate-50 px-1 py-0.5 rounded text-[11px] select-all border border-slate-100">
                        {selectedLog.target_id || 'Global System Config'}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[#9CA3AF] block font-semibold uppercase tracking-wider text-[10px]">Alasan Perubahan / Modifikasi</span>
                    <span className="text-xs text-slate-700 block mt-1 bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] p-2.5 rounded-xl font-medium">
                      {selectedLog.reason || '— (Tanpa Alasan Spesifik)'}
                    </span>
                  </div>
                </div>

                {/* Advanced Metadata JSON payload view with defensive filters */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider text-[10px]">Payload Metadata Lengkap (Sanitized)</span>
                    <button
                      onClick={() => handleCopyToClipboard(JSON.stringify(sanitizedMetadata, null, 2), 'metadata')}
                      className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors font-medium"
                    >
                      {copiedField === 'metadata' ? (
                        <>
                          <Check className="w-3 text-emerald-600" />
                          Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3" />
                          Salin JSON
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="bg-[#1E293B] text-slate-100 p-4.5 rounded-2xl border border-slate-800 text-[11.5px] font-mono leading-relaxed max-h-[220px] overflow-auto select-all shadow-inner">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(sanitizedMetadata, null, 2)}</pre>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] px-6 py-4.5 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedLog(null)}
                >
                  Tutup Inspektor
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
