import React, { useState } from 'react';
import { PengajianGroup } from '../types';
import { Lock, Users, Shield, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, UserCheck } from 'lucide-react';
import mosqueBannerImg from '../assets/images/mosque_banner_1790137225113.jpg';

interface LoginViewProps {
  groups: PengajianGroup[];
  onLoginSuccess: (user: {
    role: 'master' | 'kelompok';
    groupId?: string;
    groupName?: string;
    username: string;
    officerName?: string;
  }) => void;
  onLoginAttempt: (payload: {
    role: 'master' | 'kelompok';
    username?: string;
    password?: string;
    groupId?: string;
    pin?: string;
    userName?: string;
    officerName?: string;
  }) => Promise<{ success: boolean; message?: string; user?: any }>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  groups,
  onLoginSuccess,
  onLoginAttempt,
}) => {
  const [activeTab, setActiveTab] = useState<'kelompok' | 'master'>('kelompok');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [officerName, setOfficerName] = useState<string>('');
  const [groupPin, setGroupPin] = useState<string>('');
  const [masterUsername, setMasterUsername] = useState<string>('admin');
  const [masterPassword, setMasterPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  const handleGroupLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedGroupId) {
      setErrorMessage('Silakan pilih kelompok/masjid terlebih dahulu.');
      return;
    }
    if (!officerName.trim()) {
      setErrorMessage('Silakan masukkan Nama Petugas / Pengguna yang mengakses akun kelompok.');
      return;
    }
    if (!groupPin.trim()) {
      setErrorMessage('Silakan masukkan PIN/Password kelompok.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await onLoginAttempt({
        role: 'kelompok',
        groupId: selectedGroupId,
        pin: groupPin.trim(),
        userName: officerName.trim(),
        officerName: officerName.trim(),
      });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.message || 'PIN/Password tidak cocok!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat masuk');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!masterUsername.trim() || !masterPassword.trim()) {
      setErrorMessage('Username dan Password Master wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await onLoginAttempt({
        role: 'master',
        username: masterUsername.trim(),
        password: masterPassword.trim(),
      });
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.message || 'Username atau password Master salah!');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan koneksi login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-500 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500 blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: Editorial Banner */}
        <div className="relative md:col-span-5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-6 sm:p-8 flex flex-col justify-between text-white overflow-hidden">
          <div className="absolute inset-0 opacity-25 mix-blend-overlay">
            <img
              src={mosqueBannerImg}
              alt="Masjid Interior"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-800/60 rounded-full border border-emerald-600/40 text-xs font-medium text-emerald-200 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Absensi Online
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 leading-tight">
              Absensi Pengajian
            </h1>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Platform pencatatan kehadiran jamaah, monitoring kelompok pengajian, dan jadwal materi terpadu.
            </p>
          </div>

          <div className="relative z-10 pt-8 border-t border-emerald-800/50 mt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pencatatan Hadir, Sakit, Izin, & Alpa cepat</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Jadwal 3x sepekan (Senin, Rabu, Jumat)</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Diagram rekap kehadiran interaktif & realtime</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Login Form */}
        <div className="md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Silakan pilih jenis akun untuk masuk ke aplikasi
            </p>

            {/* Segmented Tab Control */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mt-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('kelompok');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'kelompok'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Akun Kelompok</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('master');
                  setErrorMessage(null);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'master'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Master</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {activeTab === 'kelompok' ? (
            /* Kelompok / Masjid Form */
            <form onSubmit={handleGroupLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Kelompok / Masjid Pengajian
                </label>
                <div className="relative">
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                  >
                    {groups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        {grp.name} - {grp.masjidName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGroup && (
                  <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs text-slate-600 space-y-0.5">
                    <p className="font-semibold text-emerald-900">
                      {selectedGroup.masjidName}
                    </p>
                    <p className="text-slate-500 truncate">{selectedGroup.address}</p>
                    <p className="text-slate-500">
                      Penanggung Jawab: <span className="font-medium text-slate-700">{selectedGroup.adminName}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Petugas / Pengguna yang Masuk <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    (Wajib Diisi)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    placeholder="Contoh: Ust. Hamdan / Fajar Nugraha / Dewi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <UserCheck className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Nama ini dipantau langsung oleh Admin Master agar mengetahui siapa yang sedang mengakses akun kelompok.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    PIN / Password Kelompok
                  </label>
                  <span className="text-[11px] text-slate-400">
                    (Default: 1234, 2345, 3456)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={groupPin}
                    onChange={(e) => setGroupPin(e.target.value)}
                    placeholder="Masukkan PIN atau password kelompok"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white pr-10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <span>Buka Absensi Kelompok</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Admin Master Form */
            <form onSubmit={handleMasterLogin} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <span className="font-semibold">Peran Admin Master:</span> Mengontrol seluruh absensi masjid, memantau rekap wilayah, dan mengatur PIN/password semua akun.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username Master
                </label>
                <input
                  type="text"
                  value={masterUsername}
                  onChange={(e) => setMasterUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password Master
                  </label>
                  <span className="text-[11px] text-slate-400">
                    (Default: master123)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Masukkan password master"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:bg-white pr-10 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Masuk Admin Master</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Data tersimpan otomatis di database</span>
            <span>Versi Aplikasi 1.2</span>
          </div>
        </div>
      </div>
    </div>
  );
};
