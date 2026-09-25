import React, { useState } from 'react';
import {
  AttendanceSession,
  Jamaah,
  LoginActivity,
  PengajianGroup,
  SystemSettings,
} from '../types';
import {
  Shield,
  Key,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Plus,
  Save,
  Building,
  Check,
  ExternalLink,
  Pencil,
  MapPin,
  User,
  UserCheck,
  History,
  Trash2,
  Search,
} from 'lucide-react';
import {
  calculateAttendanceStats,
  formatIndonesianDate,
  formatWitaDateTime,
  formatRelativeTime,
} from '../utils/helpers';

interface MasterAdminViewProps {
  settings: SystemSettings;
  groups: PengajianGroup[];
  allMembers: Jamaah[];
  sessions: AttendanceSession[];
  loginActivities?: LoginActivity[];
  onClearLoginActivities?: () => Promise<boolean>;
  onSavePasswords: (payload: {
    masterPassword?: string;
    groupPins?: Record<string, string>;
  }) => Promise<boolean>;
  onSaveGroup: (group: PengajianGroup) => Promise<boolean>;
  onSelectGroupForAttendance: (groupId: string) => void;
}

export const MasterAdminView: React.FC<MasterAdminViewProps> = ({
  settings,
  groups,
  allMembers,
  sessions,
  loginActivities = [],
  onClearLoginActivities,
  onSavePasswords,
  onSaveGroup,
  onSelectGroupForAttendance,
}) => {
  // Password management states
  const [newMasterPassword, setNewMasterPassword] = useState<string>('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState<string>('');
  const [showMasterPass, setShowMasterPass] = useState<boolean>(false);
  const [groupPins, setGroupPins] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    groups.forEach((g) => {
      init[g.id] = g.pin;
    });
    return init;
  });
  const [showGroupPins, setShowGroupPins] = useState<Record<string, boolean>>({});

  // Login activity log filters
  const [loginGroupFilter, setLoginGroupFilter] = useState<string>('ALL');
  const [loginSearchQuery, setLoginSearchQuery] = useState<string>('');
  const [isClearingLogs, setIsClearingLogs] = useState<boolean>(false);

  // Status message
  const [alertNotice, setAlertNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit Group Modal State (Admin Master group edit access)
  const [editingGroup, setEditingGroup] = useState<PengajianGroup | null>(null);

  // New Group Modal State
  const [showNewGroupModal, setShowNewGroupModal] = useState<boolean>(false);
  const [newGroupForm, setNewGroupForm] = useState<{
    name: string;
    masjidName: string;
    address: string;
    adminName: string;
    pin: string;
  }>({
    name: '',
    masjidName: '',
    address: '',
    adminName: '',
    pin: '1234',
  });

  // Calculate high-level system metrics
  const totalJamaah = allMembers.filter((m) => m.isActive).length;
  const totalLaki = allMembers.filter((m) => m.isActive && m.gender === 'L').length;
  const totalPerempuan = allMembers.filter((m) => m.isActive && m.gender === 'P').length;

  // Handle open edit group modal
  const handleStartEditGroup = (group: PengajianGroup) => {
    setEditingGroup({
      ...group,
      pin: groupPins[group.id] || group.pin,
    });
  };

  // Handle saving edited group (Master Admin access)
  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    if (!editingGroup.name.trim() || !editingGroup.masjidName.trim()) {
      setAlertNotice({
        type: 'error',
        text: 'Nama kelompok dan nama masjid wajib diisi!',
      });
      return;
    }

    setIsSaving(true);
    try {
      const ok = await onSaveGroup({
        id: editingGroup.id,
        name: editingGroup.name.trim(),
        masjidName: editingGroup.masjidName.trim(),
        address: editingGroup.address.trim(),
        adminName: editingGroup.adminName.trim() || 'Admin Kelompok',
        pin: editingGroup.pin.trim() || '1234',
      });

      if (ok) {
        // Keep groupPins state synchronized
        setGroupPins((prev) => ({
          ...prev,
          [editingGroup.id]: editingGroup.pin.trim() || '1234',
        }));

        setAlertNotice({
          type: 'success',
          text: `Data kelompok "${editingGroup.name}" (${editingGroup.masjidName}) berhasil diperbarui!`,
        });
        setEditingGroup(null);
      } else {
        setAlertNotice({
          type: 'error',
          text: 'Gagal memperbarui data kelompok. Silakan coba lagi.',
        });
      }
    } catch {
      setAlertNotice({
        type: 'error',
        text: 'Terjadi kesalahan sistem saat memperbarui data kelompok.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle saving passwords
  const handleSaveAllPasswords = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlertNotice(null);

    if (newMasterPassword) {
      if (newMasterPassword !== confirmMasterPassword) {
        setAlertNotice({
          type: 'error',
          text: 'Konfirmasi password master baru tidak sesuai!',
        });
        return;
      }
      if (newMasterPassword.length < 4) {
        setAlertNotice({
          type: 'error',
          text: 'Password master minimal 4 karakter!',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: { masterPassword?: string; groupPins?: Record<string, string> } = {
        groupPins,
      };
      if (newMasterPassword) {
        payload.masterPassword = newMasterPassword;
      }

      const ok = await onSavePasswords(payload);
      if (ok) {
        setAlertNotice({
          type: 'success',
          text: 'Password Master dan PIN Kelompok berhasil disimpan ke database!',
        });
        setNewMasterPassword('');
        setConfirmMasterPassword('');
      } else {
        setAlertNotice({
          type: 'error',
          text: 'Gagal menyimpan perubahan ke database.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle creating new group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupForm.name || !newGroupForm.masjidName) {
      alert('Nama kelompok dan nama masjid wajib diisi!');
      return;
    }

    setIsSaving(true);
    try {
      const ok = await onSaveGroup({
        id: '',
        name: newGroupForm.name.trim(),
        masjidName: newGroupForm.masjidName.trim(),
        address: newGroupForm.address.trim(),
        adminName: newGroupForm.adminName.trim() || 'Admin Kelompok',
        pin: newGroupForm.pin.trim() || '1234',
      });

      if (ok) {
        setShowNewGroupModal(false);
        setNewGroupForm({
          name: '',
          masjidName: '',
          address: '',
          adminName: '',
          pin: '1234',
        });
        setAlertNotice({
          type: 'success',
          text: `Kelompok ${newGroupForm.name} berhasil ditambahkan!`,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs font-semibold text-emerald-400 mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Pusat Kendali Admin Master</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Kontrol & Monitoring Absensi Seluruh Kelompok
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Sebagai Admin Master, Anda memiliki wewenang penuh untuk memantau kehadiran di setiap masjid/kelompok, mengevaluasi kedisiplinan jamaah, dan mengelola keamanan password/PIN seluruh akun.
          </p>
        </div>

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 relative z-10">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400">Total Kelompok / Masjid</span>
            <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
              {groups.length}
            </div>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400">Total Jamaah Wilayah</span>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums mt-0.5">
              {totalJamaah} <span className="text-xs font-normal text-slate-400">org</span>
            </div>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400">Ikhwan (L) / Akhwat (P)</span>
            <div className="text-xl font-bold text-white tabular-nums mt-0.5">
              {totalLaki} <span className="text-slate-400 text-xs font-normal">/</span> {totalPerempuan}
            </div>
          </div>
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400">Sesi Absensi Tersimpan</span>
            <div className="text-2xl font-bold text-teal-400 tabular-nums mt-0.5">
              {sessions.length}
            </div>
          </div>
        </div>
      </div>

      {alertNotice && (
        <div
          className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
            alertNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{alertNotice.text}</span>
          <button
            onClick={() => setAlertNotice(null)}
            className="text-slate-400 hover:text-slate-600 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Monitoring Status Setiap Kelompok / Masjid */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              <span>Status Monitoring Kelompok & Masjid</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau laporan absensi terbaru dan persentase kehadiran setiap kelompok.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNewGroupModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelompok Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const grpMembers = allMembers.filter(
              (m) => m.groupId === group.id && m.isActive
            );
            const grpSessions = sessions
              .filter((s) => s.groupId === group.id)
              .sort((a, b) => b.date.localeCompare(a.date));
            const latestSession = grpSessions[0] || null;
            const stats = calculateAttendanceStats(grpMembers, latestSession);

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                        {group.name}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 mt-1 truncate">
                        {group.masjidName}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{group.address || 'Alamat belum diatur'}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 tabular-nums">
                        PIN: {groupPins[group.id] || group.pin}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEditGroup(group)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                        title="Edit data kelompok dan masjid ini"
                      >
                        <Pencil className="w-3 h-3 text-emerald-700" />
                        <span>Edit Data</span>
                      </button>
                    </div>
                  </div>

                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Total Jamaah Aktif:</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {grpMembers.length} orang (L: {stats.laki}, P: {stats.perempuan})
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Sesi Terakhir:</span>
                      <span className="font-medium text-slate-800">
                        {latestSession ? formatIndonesianDate(latestSession.date) : 'Belum absen'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Kehadiran Terakhir:</span>
                      <span className="font-bold text-emerald-700 tabular-nums">
                        {stats.hadir}/{stats.total} ({stats.persenHadir}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                      <div
                        style={{ width: `${stats.persenHadir}%` }}
                        className="bg-emerald-600 h-full transition-all duration-500"
                      />
                    </div>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Akses Terakhir:</span>
                    </span>
                    <span className="text-right truncate max-w-[150px]">
                      {group.lastLoginUser ? (
                        <span className="font-bold text-emerald-800">
                          {group.lastLoginUser}
                          <span className="text-[10px] font-normal text-slate-400 block">
                            {formatRelativeTime(group.lastLoginAt)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum tercatat</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>PJ: <strong className="text-slate-700 font-semibold">{group.adminName}</strong></span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditGroup(group)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                      title="Edit Data Kelompok dan Masjid ini"
                    >
                      <Pencil className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Edit Data</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectGroupForAttendance(group.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                      title="Buka form absensi kelompok ini"
                    >
                      <span>Buka Absensi</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pemantauan Aktivitas Login Akun Kelompok */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-0.5">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Monitoring Keamanan & Akses Real-Time</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Pemantauan Siapa yang Masuk di Akun Kelompok
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin Master dapat memantau nama petugas/pengguna yang masuk ke sistem pada setiap akun kelompok beserta waktu aksesnya (WITA).
            </p>
          </div>

          {loginActivities.length > 0 && onClearLoginActivities && (
            <button
              type="button"
              disabled={isClearingLogs}
              onClick={async () => {
                if (confirm('Yakin ingin mengosongkan seluruh riwayat log login akun kelompok?')) {
                  setIsClearingLogs(true);
                  try {
                    await onClearLoginActivities();
                    setAlertNotice({
                      type: 'success',
                      text: 'Riwayat aktivitas login kelompok berhasil dikosongkan.',
                    });
                  } finally {
                    setIsClearingLogs(false);
                  }
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" />
              <span>{isClearingLogs ? 'Mengosongkan...' : 'Bersihkan Log'}</span>
            </button>
          )}
        </div>

        {/* Filter bar for login logs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter Kelompok:</span>
            <select
              value={loginGroupFilter}
              onChange={(e) => setLoginGroupFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL">Semua Kelompok & Master</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} - {g.masjidName}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={loginSearchQuery}
              onChange={(e) => setLoginSearchQuery(e.target.value)}
              placeholder="Cari nama pengakses / petugas..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white"
            />
          </div>
        </div>

        {/* Log table */}
        {(() => {
          const filteredLogs = loginActivities.filter((act) => {
            const matchesGroup =
              loginGroupFilter === 'ALL' || act.groupId === loginGroupFilter;
            const q = loginSearchQuery.toLowerCase().trim();
            const matchesSearch =
              !q ||
              act.userName.toLowerCase().includes(q) ||
              (act.officerName && act.officerName.toLowerCase().includes(q)) ||
              (act.groupName && act.groupName.toLowerCase().includes(q));
            return matchesGroup && matchesSearch;
          });

          if (filteredLogs.length === 0) {
            return (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs">
                {loginActivities.length === 0
                  ? 'Belum ada catatan aktivitas login. Ketika petugas akun kelompok masuk, nama dan waktu aksesnya akan otomatis muncul di sini.'
                  : 'Tidak ada catatan log login yang sesuai dengan filter pencarian.'}
              </div>
            );
          }

          return (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4 w-12 text-center">No</th>
                    <th className="py-2.5 px-4">Waktu Masuk (WITA)</th>
                    <th className="py-2.5 px-4">Nama Petugas / Pengakses</th>
                    <th className="py-2.5 px-4">Akun Kelompok / Masjid</th>
                    <th className="py-2.5 px-4">Role Akun</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-4 text-center tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {formatWitaDateTime(log.timestamp)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatRelativeTime(log.timestamp)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{log.officerName || log.userName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        <div className="font-semibold text-slate-900">
                          {log.groupName || (log.role === 'master' ? 'Admin Master Pusat' : log.groupId)}
                        </div>
                        {log.role === 'kelompok' && (
                          <div className="text-[11px] text-slate-400">
                            Kelompok ID: {log.groupId}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.role === 'master'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {log.role === 'master' ? 'Master Pusat' : 'Akun Kelompok'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Berhasil Masuk
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </section>

      {/* Pengaturan PIN / Password Akun (Khusus Master Saja) */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
            <Key className="w-4 h-4 text-emerald-600" />
            <span>Hak Akses Khusus Master</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pengaturan Password Master & PIN Akun Kelompok
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sesuai ketentuan, hanya Akun Master yang dapat mengubah password master maupun PIN setiap akun kelompok/masjid.
          </p>
        </div>

        <form onSubmit={handleSaveAllPasswords} className="space-y-6">
          {/* Section 1: Ubah Password Master */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-slate-900" />
              <span>Ubah Password Akun Master</span>
            </h3>
            <p className="text-xs text-slate-500">
              Kosongkan bagian ini jika tidak ingin mengubah password master saat ini.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Master Baru
                </label>
                <div className="relative">
                  <input
                    type={showMasterPass ? 'text' : 'password'}
                    value={newMasterPassword}
                    onChange={(e) => setNewMasterPassword(e.target.value)}
                    placeholder="Masukkan password master baru"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-700 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPass(!showMasterPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showMasterPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ulangi Password Master Baru
                </label>
                <input
                  type={showMasterPass ? 'text' : 'password'}
                  value={confirmMasterPassword}
                  onChange={(e) => setConfirmMasterPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-700 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Ubah PIN / Password Masing-Masing Kelompok */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kelola PIN / Password Kelompok & Masjid</span>
            </h3>
            <p className="text-xs text-slate-500">
              Admin kelompok menggunakan PIN ini untuk masuk ke akun absensi masing-masing.
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Nama Kelompok</th>
                    <th className="py-3 px-4">Masjid</th>
                    <th className="py-3 px-4">Penanggung Jawab</th>
                    <th className="py-3 px-4 w-52">PIN / Password Masuk</th>
                    <th className="py-3 px-4 text-center w-28">Aksi Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((grp) => {
                    const isShown = showGroupPins[grp.id] || false;
                    return (
                      <tr key={grp.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {grp.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {grp.masjidName}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {grp.adminName}
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <input
                              type={isShown ? 'text' : 'password'}
                              value={groupPins[grp.id] ?? grp.pin}
                              onChange={(e) =>
                                setGroupPins({
                                  ...groupPins,
                                  [grp.id]: e.target.value,
                                })
                              }
                              className="w-full px-3 py-1.5 pr-8 text-xs font-mono font-bold text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowGroupPins({
                                  ...showGroupPins,
                                  [grp.id]: !isShown,
                                })
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleStartEditGroup(grp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                            title="Edit data lengkap kelompok & masjid ini"
                          >
                            <Pencil className="w-3 h-3 text-emerald-700" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Passwords Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan PIN & Password'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Modal Add Group */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Tambah Kelompok / Masjid Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Buat akun kelompok pengajian baru
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kelompok *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupForm.name}
                  onChange={(e) =>
                    setNewGroupForm({ ...newGroupForm, name: e.target.value })
                  }
                  placeholder="Contoh: Kelompok 4 (Al-Falah)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Masjid *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupForm.masjidName}
                  onChange={(e) =>
                    setNewGroupForm({ ...newGroupForm, masjidName: e.target.value })
                  }
                  placeholder="Contoh: Masjid Al-Falah"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Masjid
                </label>
                <input
                  type="text"
                  value={newGroupForm.address}
                  onChange={(e) =>
                    setNewGroupForm({ ...newGroupForm, address: e.target.value })
                  }
                  placeholder="Contoh: Jl. Pahlawan No. 10"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={newGroupForm.adminName}
                    onChange={(e) =>
                      setNewGroupForm({ ...newGroupForm, adminName: e.target.value })
                    }
                    placeholder="Contoh: Ust. Hamdan"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Awal Masuk
                  </label>
                  <input
                    type="text"
                    value={newGroupForm.pin}
                    onChange={(e) =>
                      setNewGroupForm({ ...newGroupForm, pin: e.target.value })
                    }
                    placeholder="1234"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Tambahkan Kelompok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Group Modal (Khusus Hak Akses Admin Master) */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Pencil className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Edit Data Kelompok & Masjid
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Hak Akses Admin Master: Ubah identitas, alamat, penanggung jawab, dan PIN
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateGroup} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Perubahan akan langsung disimpan ke database aplikasi dan otomatis berlaku untuk sesi login akun kelompok yang bersangkutan.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kelompok *
                </label>
                <input
                  type="text"
                  required
                  value={editingGroup.name}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, name: e.target.value })
                  }
                  placeholder="Contoh: Kelompok 1 (Al-Muhajirin)"
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Masjid / Musholla *
                </label>
                <input
                  type="text"
                  required
                  value={editingGroup.masjidName}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, masjidName: e.target.value })
                  }
                  placeholder="Contoh: Masjid Al-Muhajirin"
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Masjid / Kelompok
                </label>
                <input
                  type="text"
                  value={editingGroup.address}
                  onChange={(e) =>
                    setEditingGroup({ ...editingGroup, address: e.target.value })
                  }
                  placeholder="Contoh: Jl. Pahlawan No. 10, Penajam"
                  className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Penanggung Jawab (PJ)
                  </label>
                  <input
                    type="text"
                    value={editingGroup.adminName}
                    onChange={(e) =>
                      setEditingGroup({ ...editingGroup, adminName: e.target.value })
                    }
                    placeholder="Contoh: Ust. Hamdan"
                    className="w-full px-3 py-2 text-xs text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Masuk Akun Kelompok *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGroup.pin}
                    onChange={(e) =>
                      setEditingGroup({ ...editingGroup, pin: e.target.value })
                    }
                    placeholder="1234"
                    className="w-full px-3 py-2 text-xs font-mono font-bold tracking-wider text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Digunakan untuk login akun kelompok ini
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  ID: {editingGroup.id}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingGroup(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
