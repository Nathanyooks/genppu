import React, { useState, useEffect } from 'react';
import {
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  CurrentUser,
  Gender,
  Jamaah,
  PengajianGroup,
  PengajianMaterial,
} from '../types';
import {
  Check,
  CheckCheck,
  RotateCcw,
  Send,
  Calendar,
  Clock,
  Search,
  Users,
  HeartPulse,
  Share2,
  Copy,
  Edit2,
  BookOpen,
  Sparkles,
  Timer,
  AlertCircle,
  XCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  calculateAttendanceStats,
  calculateSessionDuration,
  calculateAge,
  formatIndonesianBirthDate,
  formatIndonesianDate,
  getIndonesianDayName,
  getTodayDateString,
  generateWhatsAppReport,
} from '../utils/helpers';
import { PermissionModal } from './PermissionModal';

interface AttendanceGridViewProps {
  group: PengajianGroup;
  currentUser?: CurrentUser;
  allMembers: Jamaah[];
  materials: PengajianMaterial[];
  existingSession?: AttendanceSession | null;
  allSessions?: AttendanceSession[];
  onSaveSession: (session: AttendanceSession) => Promise<boolean>;
  onResetSession: (groupId: string, date: string) => Promise<boolean>;
  onNavigateToJamaah?: () => void;
}

export const AttendanceGridView: React.FC<AttendanceGridViewProps> = ({
  group,
  currentUser,
  allMembers,
  materials,
  existingSession,
  allSessions = [],
  onSaveSession,
  onResetSession,
  onNavigateToJamaah,
}) => {
  // Current date state
  const [selectedDate, setSelectedDate] = useState<string>(
    existingSession?.date || getTodayDateString()
  );

  // Start Time & End Time states (Jam Mulai & Jam Selesai Pengajian)
  const initialStart =
    existingSession?.startTime ||
    (existingSession?.time ? existingSession.time.split('-')[0]?.trim() : '19:30') ||
    '19:30';
  const initialEnd =
    existingSession?.endTime ||
    (existingSession?.time ? existingSession.time.split('-')[1]?.trim() : '21:00') ||
    '21:00';

  const [startTime, setStartTime] = useState<string>(initialStart);
  const [endTime, setEndTime] = useState<string>(initialEnd);
  const [currentTime, setCurrentTime] = useState<string>('19:30');

  // Materials & Notes
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(
    existingSession?.materiIds || ['mat-1', 'mat-2']
  );
  const [materiNote, setMateriNote] = useState<string>(
    existingSession?.materiNote || ''
  );

  // Active attendance records state: jamaahId -> record
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>(
    existingSession?.records || {}
  );

  // Filters & search
  const [genderFilter, setGenderFilter] = useState<'ALL' | Gender>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI status states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copiedWA, setCopiedWA] = useState<boolean>(false);

  // Permission / Illness modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    jamaahId: string;
    jamaahName: string;
    type: 'izin' | 'sakit';
    initialValue?: string;
  }>({
    isOpen: false,
    jamaahId: '',
    jamaahName: '',
    type: 'izin',
  });

  // Calculate session duration dynamically
  const sessionDuration = calculateSessionDuration(startTime, endTime);

  // Real-time ticking clock (WITA - UTC+8)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const witaTime = now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        setCurrentTime(witaTime);
      } catch {
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        setCurrentTime(`${hours}:${mins}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // When date changes or session changes, look for stored session in allSessions or existingSession
  useEffect(() => {
    const matchedSession =
      allSessions.find((s) => s.groupId === group.id && s.date === selectedDate) ||
      (existingSession?.date === selectedDate ? existingSession : null);

    if (matchedSession) {
      setRecords(matchedSession.records || {});
      const sStart =
        matchedSession.startTime ||
        (matchedSession.time ? matchedSession.time.split('-')[0]?.trim() : '19:30') ||
        '19:30';
      const sEnd =
        matchedSession.endTime ||
        (matchedSession.time ? matchedSession.time.split('-')[1]?.trim() : '21:00') ||
        '21:00';
      setStartTime(sStart);
      setEndTime(sEnd);
      setSelectedMaterials(matchedSession.materiIds || ['mat-1', 'mat-2']);
      setMateriNote(matchedSession.materiNote || '');
    } else {
      // New session for this date
      setRecords({});
      setMateriNote('');
    }
  }, [selectedDate, group.id, allSessions, existingSession]);

  // Filter active members belonging to this group
  const groupMembers = allMembers.filter(
    (m) => m.groupId === group.id && m.isActive
  );

  // Calculate real-time stats
  const currentSessionForStats: AttendanceSession = {
    id: `${group.id}-${selectedDate}`,
    groupId: group.id,
    date: selectedDate,
    dayName: getIndonesianDayName(selectedDate),
    time: `${startTime} - ${endTime}`,
    startTime,
    endTime,
    materiIds: selectedMaterials,
    materiNote,
    records,
    submittedAt: existingSession?.submittedAt || '',
    submittedBy: group.adminName,
  };

  const stats = calculateAttendanceStats(groupMembers, currentSessionForStats);

  // Filtered members for display
  const displayedMembers = groupMembers.filter((m) => {
    const matchesGender = genderFilter === 'ALL' || m.gender === genderFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(searchQuery)) ||
      (m.category && m.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGender && matchesSearch;
  });

  // Action: Mark single status
  const handleSetStatus = (
    jamaahId: string,
    status: AttendanceStatus,
    reason?: string,
    note?: string
  ) => {
    setRecords((prev) => ({
      ...prev,
      [jamaahId]: {
        jamaahId,
        status,
        permissionReason: reason,
        note,
        time: currentTime,
      },
    }));
  };

  // Action: Open Modal for Izin
  const handleOpenIzinModal = (jamaah: Jamaah) => {
    const currentRec = records[jamaah.id];
    setModalState({
      isOpen: true,
      jamaahId: jamaah.id,
      jamaahName: jamaah.name,
      type: 'izin',
      initialValue: currentRec?.permissionReason || '',
    });
  };

  // Action: Open Modal for Sakit
  const handleOpenSakitModal = (jamaah: Jamaah) => {
    const currentRec = records[jamaah.id];
    setModalState({
      isOpen: true,
      jamaahId: jamaah.id,
      jamaahName: jamaah.name,
      type: 'sakit',
      initialValue: currentRec?.note || '',
    });
  };

  // Action: "Hadir Semua"
  const handleMarkAllHadir = () => {
    const updated: Record<string, AttendanceRecord> = { ...records };
    groupMembers.forEach((m) => {
      updated[m.id] = {
        jamaahId: m.id,
        status: 'hadir',
        time: currentTime,
      };
    });
    setRecords(updated);
    setSaveSuccessNotice('Semua jamaah berhasil ditandai Hadir! Keterangan tetap bisa diedit.');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  // Action: Reset Absensi
  const handleResetAttendance = async () => {
    setRecords({});
    setShowResetConfirm(false);
    await onResetSession(group.id, selectedDate);
    setSaveSuccessNotice('Data absensi sesi ini berhasil direset.');
    setTimeout(() => setSaveSuccessNotice(null), 3000);
  };

  // Action: Kirim / Simpan Absensi
  const handleSendAttendance = async () => {
    setIsSaving(true);
    const dayName = getIndonesianDayName(selectedDate);
    const sessionData: AttendanceSession = {
      id: `${group.id}-${selectedDate}`,
      groupId: group.id,
      date: selectedDate,
      dayName,
      time: `${startTime} - ${endTime}`,
      startTime,
      endTime,
      materiIds: selectedMaterials,
      materiNote,
      records,
      submittedAt: new Date().toISOString(),
      submittedBy: currentUser?.officerName || currentUser?.username || group.adminName,
    };

    const success = await onSaveSession(sessionData);
    setIsSaving(false);
    if (success) {
      setSaveSuccessNotice(
        `Absensi ${dayName}, ${formatIndonesianDate(selectedDate)} (${startTime} - ${endTime} WITA) berhasil tersimpan!`
      );
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    }
  };

  // Preset time helper
  const applyTimePreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'bapak':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ibu':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'pemuda':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pemudi':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Vibrant Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-5 sm:p-7 text-white shadow-xl">
        {/* Subtle decorative arabesque lighting */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-teal-300/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full border border-white/20 text-xs font-semibold text-emerald-100 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{group.name}</span>
              <span className="opacity-60">•</span>
              <span className="text-amber-300 font-bold">{group.masjidName}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Absensi Pengajian</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-amber-400/25 border border-amber-300/40 text-amber-200">
                Online Sync
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl leading-relaxed">
              Pencatatan kehadiran jamaah ikhwan & akhwat, waktu mulai & selesai pengajian, serta materi kajian terpadu.
            </p>
          </div>

          {/* Quick WhatsApp Share & Live Time (WITA) */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <div className="px-3.5 py-1.5 rounded-xl bg-black/25 backdrop-blur-md border border-white/10 text-xs flex items-center gap-2">
              <Timer className="w-4 h-4 text-emerald-300" />
              <div className="text-left">
                <span className="text-[10px] text-emerald-200/80 block">Jam Sekarang (WITA)</span>
                <span className="font-mono font-bold text-white tabular-nums text-sm">
                  {currentTime} <span className="text-[10px] font-bold text-emerald-300">WITA</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowShareModal(true);
                setCopiedWA(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-slate-950" />
              <span>Format Laporan WA</span>
            </button>
          </div>
        </div>

        {/* Floating Session Bar (Date, Jam Mulai, Jam Selesai, Durasi - WITA) */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* Tanggal Pengajian */}
          <div className="lg:col-span-4 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <label className="block text-[11px] font-semibold text-emerald-200 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Tanggal & Hari Pengajian</span>
            </label>
            <div className="flex items-center justify-between">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
              />
              <span className="ml-2 text-xs font-bold text-amber-300 whitespace-nowrap">
                {getIndonesianDayName(selectedDate)}
              </span>
            </div>
          </div>

          {/* Jam Mulai Pengajian (WITA) */}
          <div className="lg:col-span-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <label className="block text-[11px] font-semibold text-emerald-200 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>Jam Mulai Pengajian (WITA)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-white text-slate-900 font-mono font-bold text-xs px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
              />
              <span className="text-xs font-bold text-white">WITA</span>
            </div>
          </div>

          {/* Jam Selesai Pengajian (WITA) */}
          <div className="lg:col-span-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
            <label className="block text-[11px] font-semibold text-emerald-200 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Jam Selesai Pengajian (WITA)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-white text-slate-900 font-mono font-bold text-xs px-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-emerald-400 outline-none cursor-pointer"
              />
              <span className="text-xs font-bold text-white">WITA</span>
            </div>
          </div>

          {/* Durasi Badge */}
          <div className="lg:col-span-2 bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl p-3 text-slate-950 font-bold flex flex-col justify-center items-center shadow">
            <span className="text-[10px] uppercase tracking-wider text-amber-950 font-extrabold flex items-center gap-1">
              <Timer className="w-3 h-3 text-amber-950" />
              Durasi
            </span>
            <span className="text-sm font-extrabold mt-0.5 text-slate-950 tabular-nums">
              {sessionDuration.text}
            </span>
          </div>
        </div>

        {/* Quick Time Presets (WITA) */}
        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] text-emerald-200 font-medium">Pilihan Cepat Waktu WITA:</span>
          <button
            type="button"
            onClick={() => applyTimePreset('20:00', '21:30')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              startTime === '20:00' && endTime === '21:30'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            Ba'da Isya (20:00 - 21:30 WITA)
          </button>
          <button
            type="button"
            onClick={() => applyTimePreset('19:30', '21:00')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              startTime === '19:30' && endTime === '21:00'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            Ba'da Isya Awal (19:30 - 21:00 WITA)
          </button>
          <button
            type="button"
            onClick={() => applyTimePreset('18:45', '20:00')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              startTime === '18:45' && endTime === '20:00'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            Ba'da Maghrib (18:45 - 20:00 WITA)
          </button>
          <button
            type="button"
            onClick={() => applyTimePreset('20:30', '22:00')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              startTime === '20:30' && endTime === '22:00'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            Kajian Malam (20:30 - 22:00 WITA)
          </button>
          <button
            type="button"
            onClick={() => applyTimePreset('05:15', '06:45')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              startTime === '05:15' && endTime === '06:45'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-white/15 hover:bg-white/25 text-white'
            }`}
          >
            Kajian Subuh (05:15 - 06:45 WITA)
          </button>
        </div>
      </div>

      {/* Selected Materials Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 mr-1 text-xs">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              Materi Pengajian Pertemuan Ini:
            </span>
            {materials.map((mat) => {
              const isSelected = selectedMaterials.includes(mat.id);
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedMaterials(selectedMaterials.filter((id) => id !== mat.id));
                    } else {
                      setSelectedMaterials([...selectedMaterials, mat.id]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-1 ring-emerald-400'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
                    {mat.number}
                  </span>
                  <span>{mat.title}</span>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>
              );
            })}
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              value={materiNote}
              onChange={(e) => setMateriNote(e.target.value)}
              placeholder="Catatan surat/ayat/bab kajian..."
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Colorful Summary Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Total Jamaah Card (Royal Indigo) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-800 p-4 text-white shadow-md border border-indigo-700/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-200">Total Jamaah</span>
            <span className="p-1.5 bg-indigo-700/60 rounded-lg">
              <Users className="w-4 h-4 text-indigo-300" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-2">
            {stats.total} <span className="text-xs font-normal text-indigo-300">orang</span>
          </div>
          <div className="text-[11px] text-indigo-200 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
            <span>L: {stats.laki}</span>
            <span className="opacity-50">·</span>
            <span>P: {stats.perempuan}</span>
          </div>
        </div>

        {/* Hadir Card (Vibrant Emerald) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-4 text-white shadow-md border border-emerald-500/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-100">Hadir</span>
            <span className="p-1.5 bg-emerald-500/60 rounded-lg">
              <Check className="w-4 h-4 text-white" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-2">
            {stats.hadir} <span className="text-xs font-bold text-amber-300">({stats.persenHadir}%)</span>
          </div>
          <div className="text-[11px] text-emerald-100 mt-1 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping inline-block" />
            <span>L: {stats.hadirLaki}</span>
            <span className="opacity-50">·</span>
            <span>P: {stats.hadirPerempuan}</span>
          </div>
        </div>

        {/* Sakit Card (Vibrant Sky Blue) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-blue-600 to-blue-700 p-4 text-white shadow-md border border-blue-500/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-100">Sakit</span>
            <span className="p-1.5 bg-blue-500/60 rounded-lg">
              <HeartPulse className="w-4 h-4 text-white" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-2">
            {stats.sakit} <span className="text-xs font-normal text-blue-200">orang</span>
          </div>
          <div className="text-[11px] text-blue-100 mt-1 font-medium">
            Dengan riwayat / surat sakit
          </div>
        </div>

        {/* Izin Card (Vibrant Warm Amber) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-4 text-white shadow-md border border-amber-400/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-100">Izin</span>
            <span className="p-1.5 bg-amber-400/60 rounded-lg">
              <Clock className="w-4 h-4 text-white" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-2">
            {stats.izin} <span className="text-xs font-normal text-amber-100">orang</span>
          </div>
          <div className="text-[11px] text-amber-100 mt-1 font-medium">
            Ada alasan tertulis
          </div>
        </div>

        {/* Alpa / TK Card (Vibrant Rose Red) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-600 via-rose-700 to-red-800 p-4 text-white shadow-md border border-rose-500/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-100">Alpa / TK</span>
            <span className="p-1.5 bg-rose-500/60 rounded-lg">
              <XCircle className="w-4 h-4 text-white" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums mt-2">
            {stats.alpa} <span className="text-xs font-normal text-rose-200">orang</span>
          </div>
          <div className="text-[11px] text-rose-100 mt-1 font-medium">
            Tanpa keterangan
          </div>
        </div>
      </div>

      {/* Action Toolbar: Hadir Semua, Reset, Kirim */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hadirkan Semua Button */}
            <button
              type="button"
              onClick={handleMarkAllHadir}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Hadirkan Semua Jamaah</span>
            </button>

            {/* Reset Absensi Button */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Absensi</span>
            </button>
          </div>

          {/* Kirim & Simpan Button */}
          <div className="flex items-center gap-2.5">
            {existingSession?.submittedAt && (
              <span className="text-[11px] text-slate-400 hidden sm:inline tabular-nums">
                Tersimpan:{' '}
                {new Date(existingSession.submittedAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}

            <button
              type="button"
              onClick={handleSendAttendance}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4 text-emerald-400" />
              <span>{isSaving ? 'Menyimpan ke Database...' : 'Kirim & Simpan Data Absensi'}</span>
            </button>
          </div>
        </div>

        {/* Notice Alert */}
        {saveSuccessNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessNotice}</span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
              Database Tersinkron
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search Jamaah */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
        {/* Gender Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setGenderFilter('ALL')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              genderFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({groupMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('L')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              genderFilter === 'L'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-indigo-700'
            }`}
          >
            <span>Ikhwan / Laki-laki</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${genderFilter === 'L' ? 'bg-white/20' : 'bg-slate-200'}`}>
              {stats.laki}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('P')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              genderFilter === 'P'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-rose-700'
            }`}
          >
            <span>Akhwat / Perempuan</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${genderFilter === 'P' ? 'bg-white/20' : 'bg-slate-200'}`}>
              {stats.perempuan}
            </span>
          </button>
        </div>

        {/* Search Input & Shortcut */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau telepon jamaah..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {onNavigateToJamaah && (
            <button
              type="button"
              onClick={onNavigateToJamaah}
              className="px-3 py-2 text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              + Data Jamaah
            </button>
          )}
        </div>
      </div>

      {/* Visual Legend: Latar Biru Transparan untuk Laki-laki & Latar Pink Transparan untuk Perempuan */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <span className="text-base">🎨</span>
            <span>Format Warna Latar Form Absensi:</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/15 border border-blue-300 text-blue-900 font-bold text-xs shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs" />
            <span>Latar Biru Transparan (Ikhwan / Laki-laki)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/15 border border-pink-300 text-pink-900 font-bold text-xs shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block shadow-xs" />
            <span>Latar Pink Transparan (Akhwat / Perempuan)</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zona Waktu: <strong className="text-slate-900 font-bold">WITA (UTC+8)</strong></span>
        </div>
      </div>

      {/* Interactive Jamaah Attendance Grid */}
      {displayedMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">Tidak ada jamaah yang ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Silakan coba ganti kata kunci pencarian.'
              : 'Belum ada data jamaah terdaftar di kelompok ini.'}
          </p>
          {onNavigateToJamaah && (
            <button
              type="button"
              onClick={onNavigateToJamaah}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Tambah Jamaah Baru
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedMembers.map((member) => {
            const rec = records[member.id];
            const currentStatus = rec?.status;
            const isHadir = currentStatus === 'hadir';
            const isSakit = currentStatus === 'sakit';
            const isIzin = currentStatus === 'izin';
            const isAlpa = currentStatus === 'alpa';
            const isPerempuan = member.gender === 'P';

            // Distinct visual card styling based on gender transparency and attendance status
            let cardBorderBg = '';
            let innerDivider = '';
            let buttonDefaultStyle = '';

            if (isPerempuan) {
              // Latar pink transparan untuk jamaah perempuan (Akhwat)
              innerDivider = 'border-pink-200/70';
              buttonDefaultStyle =
                'bg-white/85 text-slate-700 hover:bg-pink-100 hover:text-pink-900 border border-pink-200/80';

              if (isHadir) {
                cardBorderBg =
                  'bg-gradient-to-br from-pink-500/20 via-rose-500/15 to-emerald-500/25 border-emerald-400 ring-2 ring-emerald-500/70 shadow-md backdrop-blur-xs';
              } else if (isSakit) {
                cardBorderBg =
                  'bg-gradient-to-br from-pink-500/20 via-rose-500/15 to-sky-500/25 border-sky-400 ring-2 ring-sky-500/70 shadow-md backdrop-blur-xs';
              } else if (isIzin) {
                cardBorderBg =
                  'bg-gradient-to-br from-pink-500/20 via-rose-500/15 to-amber-500/25 border-amber-400 ring-2 ring-amber-500/70 shadow-md backdrop-blur-xs';
              } else if (isAlpa) {
                cardBorderBg =
                  'bg-gradient-to-br from-pink-500/25 via-rose-500/20 to-red-500/30 border-rose-400 ring-2 ring-rose-500/70 shadow-md backdrop-blur-xs';
              } else {
                // Default: Latar pink transparan
                cardBorderBg =
                  'bg-pink-500/10 hover:bg-pink-500/15 border-pink-300/80 hover:border-pink-400 shadow-sm backdrop-blur-xs ring-1 ring-pink-200/60';
              }
            } else {
              // Latar biru transparan untuk jamaah laki-laki (Ikhwan)
              innerDivider = 'border-blue-200/70';
              buttonDefaultStyle =
                'bg-white/85 text-slate-700 hover:bg-blue-100 hover:text-blue-900 border border-blue-200/80';

              if (isHadir) {
                cardBorderBg =
                  'bg-gradient-to-br from-blue-500/20 via-sky-500/15 to-emerald-500/25 border-emerald-400 ring-2 ring-emerald-500/70 shadow-md backdrop-blur-xs';
              } else if (isSakit) {
                cardBorderBg =
                  'bg-gradient-to-br from-blue-500/20 via-sky-500/15 to-sky-500/25 border-sky-400 ring-2 ring-sky-500/70 shadow-md backdrop-blur-xs';
              } else if (isIzin) {
                cardBorderBg =
                  'bg-gradient-to-br from-blue-500/20 via-sky-500/15 to-amber-500/25 border-amber-400 ring-2 ring-amber-500/70 shadow-md backdrop-blur-xs';
              } else if (isAlpa) {
                cardBorderBg =
                  'bg-gradient-to-br from-blue-500/25 via-sky-500/20 to-red-500/30 border-rose-400 ring-2 ring-rose-500/70 shadow-md backdrop-blur-xs';
              } else {
                // Default: Latar biru transparan
                cardBorderBg =
                  'bg-blue-500/10 hover:bg-blue-500/15 border-blue-300/80 hover:border-blue-400 shadow-sm backdrop-blur-xs ring-1 ring-blue-200/60';
              }
            }

            return (
              <div
                key={member.id}
                className={`rounded-2xl border p-4 transition-all duration-200 ${cardBorderBg}`}
              >
                {/* Header card: Avatar, Name, Gender & Category */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Colorful Avatar Circle */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                      isPerempuan
                        ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white ring-2 ring-pink-300/70'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white ring-2 ring-blue-300/70'
                    }`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPerempuan
                              ? 'bg-pink-100 text-pink-800 border-pink-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {isPerempuan ? 'Akhwat (P)' : 'Ikhwan (L)'}
                        </span>
                        {member.category && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${getCategoryColor(
                              member.category
                            )}`}
                          >
                            {member.category}
                          </span>
                        )}
                      </div>

                      {/* Status indicator chip */}
                      {isHadir && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                          ✓ Hadir
                        </span>
                      )}
                      {isSakit && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white shadow-xs">
                          🩹 Sakit
                        </span>
                      )}
                      {isIzin && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white shadow-xs">
                          📝 Izin
                        </span>
                      )}
                      {isAlpa && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                          ✕ Alpa
                        </span>
                      )}
                      {!currentStatus && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/70 text-slate-500 border border-slate-200/80">
                          Belum Absen
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 truncate mt-1">
                      {member.name}
                    </h4>

                    {/* Birthdate & Age information badge */}
                    {(() => {
                      const effectiveAge =
                        member.age !== undefined
                          ? member.age
                          : member.birthDate
                          ? calculateAge(member.birthDate)
                          : null;

                      if (effectiveAge !== null || member.birthDate) {
                        return (
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600 mt-0.5">
                            {effectiveAge !== null && (
                              <span className="font-bold px-1.5 py-0.5 rounded bg-white/90 border border-slate-300 text-indigo-700 shadow-xs text-[10px]">
                                {effectiveAge} thn
                              </span>
                            )}
                            {member.birthDate && (
                              <span className="text-slate-500 text-[10px] truncate">
                                {formatIndonesianBirthDate(member.birthDate)}
                              </span>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {member.phone && (
                      <p className="text-[11px] text-slate-500 truncate tabular-nums mt-0.5">
                        {member.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Indicator Note if Izin or Sakit */}
                {isIzin && (
                  <div className="mb-3 px-3 py-1.5 bg-amber-100/90 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span className="truncate font-medium">
                      Alasan: {rec?.permissionReason || 'Izin'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenIzinModal(member)}
                      className="text-amber-800 hover:text-amber-950 ml-1 p-0.5 hover:bg-amber-200 rounded"
                      title="Ubah alasan izin"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {isSakit && (
                  <div className="mb-3 px-3 py-1.5 bg-sky-100/90 border border-sky-300 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                    <span className="truncate font-medium">
                      {rec?.note ? `Ket: ${rec.note}` : 'Sakit'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenSakitModal(member)}
                      className="text-blue-800 hover:text-blue-950 ml-1 p-0.5 hover:bg-blue-200 rounded"
                      title="Ubah keterangan sakit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 4 Interactive Colored Status Buttons */}
                <div className={`grid grid-cols-4 gap-1.5 pt-2 border-t ${innerDivider}`}>
                  {/* Hadir Button */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(member.id, 'hadir')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isHadir
                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm scale-102 ring-1 ring-emerald-400'
                        : buttonDefaultStyle
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px]">Hadir</span>
                  </button>

                  {/* Sakit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenSakitModal(member)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSakit
                        ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-sm scale-102 ring-1 ring-blue-400'
                        : buttonDefaultStyle
                    }`}
                  >
                    <HeartPulse className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px]">Sakit</span>
                  </button>

                  {/* Izin Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenIzinModal(member)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isIzin
                        ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-sm scale-102 ring-1 ring-amber-400'
                        : buttonDefaultStyle
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px]">Izin</span>
                  </button>

                  {/* Alpa / TK Button */}
                  <button
                    type="button"
                    onClick={() => handleSetStatus(member.id, 'alpa')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isAlpa
                        ? 'bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-sm scale-102 ring-1 ring-rose-400'
                        : buttonDefaultStyle
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 mb-0.5" />
                    <span className="text-[10px]">Alpa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-slate-200 text-center">
            <RotateCcw className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 text-base">Reset Absensi Pertemuan Ini?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Semua status hadir, sakit, izin, dan alpa untuk tanggal{' '}
              <span className="font-bold text-slate-800">{formatIndonesianDate(selectedDate)}</span>{' '}
              akan dikosongkan.
            </p>
            <div className="flex justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetAttendance}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Ya, Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Share Report Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm">Format Laporan WhatsApp Pengajian</h3>
                  <p className="text-[11px] text-emerald-200">Siap dikirim ke grup WA masjid / kelompok</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                Laporan ini mencakup: <strong>Jam Mulai ({startTime} WITA)</strong> s/d{' '}
                <strong>Jam Selesai ({endTime} WITA)</strong>, durasi ({sessionDuration.text}), daftar hadir ikhwan/akhwat, serta rincian jamaah sakit dan izin.
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={12}
                  value={generateWhatsAppReport(
                    group,
                    currentSessionForStats,
                    groupMembers,
                    materials
                  )}
                  className="w-full p-3 font-mono text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none select-all leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  {copiedWA ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4 text-emerald-600" /> Teks laporan berhasil disalin!
                    </span>
                  ) : (
                    'Klik tombol di kanan untuk menyalin teks'
                  )}
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = generateWhatsAppReport(
                        group,
                        currentSessionForStats,
                        groupMembers,
                        materials
                      );
                      navigator.clipboard.writeText(text);
                      setCopiedWA(true);
                      setTimeout(() => setCopiedWA(false), 3000);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedWA ? 'Tersalin!' : 'Salin Teks Laporan'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permission / Illness Modal */}
      <PermissionModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        jamaahName={modalState.jamaahName}
        type={modalState.type}
        initialValue={modalState.initialValue}
        onSave={(reasonOrNote) => {
          if (modalState.type === 'izin') {
            handleSetStatus(modalState.jamaahId, 'izin', reasonOrNote);
          } else {
            handleSetStatus(modalState.jamaahId, 'sakit', undefined, reasonOrNote);
          }
        }}
      />
    </div>
  );
};
