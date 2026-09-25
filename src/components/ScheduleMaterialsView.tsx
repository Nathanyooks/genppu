import React, { useState } from 'react';
import { PengajianGroup, PengajianMaterial, WeeklyScheduleDay } from '../types';
import { Calendar, BookOpen, Edit2, Plus, Check, Clock, User, X, Sparkles, Timer } from 'lucide-react';
import { calculateSessionDuration } from '../utils/helpers';

interface ScheduleMaterialsViewProps {
  currentGroupId?: string;
  isMaster: boolean;
  groups: PengajianGroup[];
  materials: PengajianMaterial[];
  schedules: Record<string, WeeklyScheduleDay[]>;
  onSaveSchedule: (groupId: string, schedules: WeeklyScheduleDay[]) => Promise<boolean>;
  onSaveMaterials: (materials: PengajianMaterial[]) => Promise<boolean>;
}

export const ScheduleMaterialsView: React.FC<ScheduleMaterialsViewProps> = ({
  currentGroupId,
  isMaster,
  groups,
  materials,
  schedules,
  onSaveSchedule,
  onSaveMaterials,
}) => {
  const [activeGroupId, setActiveGroupId] = useState<string>(
    currentGroupId || groups[0]?.id || 'grp-1'
  );

  const currentGroupSchedules: WeeklyScheduleDay[] = schedules[activeGroupId] || [
    {
      id: 'sch-senin',
      dayName: 'Senin',
      time: '19:30 - 21:00',
      startTime: '19:30',
      endTime: '21:00',
      isActive: true,
      defaultMateriIds: ['mat-1', 'mat-2', 'mat-4'],
      instructor: 'Ustadz Abdullah / Ust. Ridwan',
      notes: 'Kajian Al-Quran & Al-Hadist rutin ba’da Isya',
    },
    {
      id: 'sch-rabu',
      dayName: 'Rabu',
      time: '19:30 - 21:15',
      startTime: '19:30',
      endTime: '21:15',
      isActive: true,
      defaultMateriIds: ['mat-1', 'mat-3', 'mat-5'],
      instructor: 'Ust. Hendra & Dewan Penasihat',
      notes: 'Kajian Al-Quran, Makalah CAI, dan Keorganisasian',
    },
    {
      id: 'sch-jumat',
      dayName: 'Jumat',
      time: '19:30 - 21:30',
      startTime: '19:30',
      endTime: '21:30',
      isActive: true,
      defaultMateriIds: ['mat-2', 'mat-6', 'mat-7'],
      instructor: 'Ust. Fajar & Pembina ASAD',
      notes: 'Kajian Hadist, Persinas ASAD & Musyawarah 5 Unsur',
    },
  ];

  // Schedule Edit Modal State
  const [editingDay, setEditingDay] = useState<WeeklyScheduleDay | null>(null);
  const [dayForm, setDayForm] = useState<{
    startTime: string;
    endTime: string;
    instructor: string;
    notes: string;
    selectedMateriIds: string[];
    isActive: boolean;
  }>({
    startTime: '19:30',
    endTime: '21:00',
    instructor: '',
    notes: '',
    selectedMateriIds: [],
    isActive: true,
  });

  // Material Edit Modal State
  const [editingMaterial, setEditingMaterial] = useState<PengajianMaterial | null>(null);
  const [isNewMaterial, setIsNewMaterial] = useState<boolean>(false);
  const [materialForm, setMaterialForm] = useState<{
    number: number;
    title: string;
    description: string;
  }>({
    number: 1,
    title: '',
    description: '',
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Open Edit Schedule Day
  const handleOpenEditDay = (day: WeeklyScheduleDay) => {
    setEditingDay(day);
    const sStart =
      day.startTime ||
      (day.time ? day.time.split('-')[0]?.trim() : '19:30') ||
      '19:30';
    const sEnd =
      day.endTime ||
      (day.time ? day.time.split('-')[1]?.trim() : '21:00') ||
      '21:00';

    setDayForm({
      startTime: sStart,
      endTime: sEnd,
      instructor: day.instructor || '',
      notes: day.notes || '',
      selectedMateriIds: day.defaultMateriIds || [],
      isActive: day.isActive ?? true,
    });
  };

  // Submit Schedule Day
  const handleSaveDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay) return;
    setIsSaving(true);
    try {
      const compositeTime = `${dayForm.startTime} - ${dayForm.endTime}`;
      const updatedList = currentGroupSchedules.map((s) => {
        if (s.id === editingDay.id || s.dayName === editingDay.dayName) {
          return {
            ...s,
            startTime: dayForm.startTime,
            endTime: dayForm.endTime,
            time: compositeTime,
            instructor: dayForm.instructor,
            notes: dayForm.notes,
            defaultMateriIds: dayForm.selectedMateriIds,
            isActive: dayForm.isActive,
          };
        }
        return s;
      });
      await onSaveSchedule(activeGroupId, updatedList);
      setEditingDay(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Edit/Create Material
  const handleOpenEditMaterial = (mat: PengajianMaterial) => {
    setEditingMaterial(mat);
    setIsNewMaterial(false);
    setMaterialForm({
      number: mat.number,
      title: mat.title,
      description: mat.description || '',
    });
  };

  const handleOpenCreateMaterial = () => {
    setEditingMaterial(null);
    setIsNewMaterial(true);
    setMaterialForm({
      number: materials.length + 1,
      title: '',
      description: '',
    });
  };

  // Save Material
  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.title.trim()) return;

    setIsSaving(true);
    try {
      let updatedMaterials: PengajianMaterial[];
      if (isNewMaterial) {
        const newM: PengajianMaterial = {
          id: 'mat-' + Date.now().toString(36),
          number: Number(materialForm.number),
          title: materialForm.title.trim(),
          description: materialForm.description.trim(),
        };
        updatedMaterials = [...materials, newM];
      } else if (editingMaterial) {
        updatedMaterials = materials.map((m) =>
          m.id === editingMaterial.id
            ? {
                ...m,
                number: Number(materialForm.number),
                title: materialForm.title.trim(),
                description: materialForm.description.trim(),
              }
            : m
        );
      } else {
        return;
      }

      await onSaveMaterials(updatedMaterials);
      setEditingMaterial(null);
      setIsNewMaterial(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate live duration in modal
  const editDayDuration = calculateSessionDuration(dayForm.startTime, dayForm.endTime);

  // Distinct day theme colors
  const getDayTheme = (dayName: string) => {
    switch (dayName) {
      case 'Senin':
        return {
          headerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700',
          badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          accent: 'emerald',
          dot: 'bg-emerald-400',
        };
      case 'Rabu':
        return {
          headerBg: 'bg-gradient-to-r from-teal-700 via-cyan-700 to-teal-800',
          badgeBg: 'bg-teal-100 text-teal-900 border-teal-300',
          accent: 'teal',
          dot: 'bg-cyan-400',
        };
      case 'Jumat':
        return {
          headerBg: 'bg-gradient-to-r from-indigo-700 via-indigo-800 to-amber-700',
          badgeBg: 'bg-amber-100 text-amber-950 border-amber-300',
          accent: 'indigo',
          dot: 'bg-amber-400',
        };
      default:
        return {
          headerBg: 'bg-gradient-to-r from-slate-700 to-slate-800',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
          accent: 'slate',
          dot: 'bg-slate-400',
        };
    }
  };

  const currentGroup = groups.find((g) => g.id === activeGroupId) || groups[0];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 p-6 sm:p-7 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full border border-white/20 text-xs font-semibold text-emerald-100 mb-2">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>3x Pertemuan Sepekan (Senin, Rabu & Jumat)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Jadwal & Kurikulum Materi Pengajian
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Atur jam mulai pengajian, jam selesai pengajian, durasi waktu, serta 9 materi pengajian di kelompok{' '}
              <span className="font-bold text-amber-300">{currentGroup?.name}</span> ({currentGroup?.masjidName}).
            </p>
          </div>

          {isMaster && (
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 flex flex-col gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-emerald-200">Ganti Kelompok:</span>
              <select
                value={activeGroupId}
                onChange={(e) => setActiveGroupId(e.target.value)}
                className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold outline-none cursor-pointer"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} - {g.masjidName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3x Pertemuan Seminggu Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <span>Jadwal Pengajian Rutin (Jam Mulai & Jam Selesai)</span>
          </h2>
          <span className="text-xs text-slate-500">Klik "Edit Jadwal" untuk mengatur waktu & materi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {['Senin', 'Rabu', 'Jumat'].map((dayName) => {
            const daySched: WeeklyScheduleDay = currentGroupSchedules.find((s) => s.dayName === dayName) || {
              id: `sch-${dayName.toLowerCase()}`,
              dayName: dayName as any,
              time: '19:30 - 21:00',
              startTime: '19:30',
              endTime: '21:00',
              isActive: true,
              defaultMateriIds: [] as string[],
              instructor: 'Pengurus Pengajian',
              notes: '',
            };

            const startT =
              daySched.startTime ||
              (daySched.time ? daySched.time.split('-')[0]?.trim() : '19:30') ||
              '19:30';
            const endT =
              daySched.endTime ||
              (daySched.time ? daySched.time.split('-')[1]?.trim() : '21:00') ||
              '21:00';
            const dur = calculateSessionDuration(startT, endT);

            const assignedMaterials = materials.filter((m) =>
              daySched.defaultMateriIds?.includes(m.id)
            );

            const theme = getDayTheme(dayName);

            return (
              <div
                key={dayName}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Colorful Card Header */}
                  <div className={`p-4 text-white ${theme.headerBg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} animate-pulse`} />
                        <h3 className="font-extrabold text-lg tracking-tight">
                          Hari {dayName}
                        </h3>
                      </div>
                      {dayName === 'Jumat' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                          Jumat Berkah
                        </span>
                      )}
                    </div>

                    {/* Time & Duration highlight pill */}
                    <div className="mt-3 p-2.5 bg-black/20 backdrop-blur-md rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-white">
                        <Clock className="w-3.5 h-3.5 text-amber-300" />
                        <span>{startT} - {endT} WITA</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold text-amber-200">
                        {dur.text}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3.5 text-xs">
                    {/* Jam Mulai & Selesai Explicit Breakdown */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Jam Mulai</span>
                        <span className="font-mono font-bold text-emerald-800 text-sm">{startT} WITA</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Jam Selesai</span>
                        <span className="font-mono font-bold text-teal-800 text-sm">{endT} WITA</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-600">
                      <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">Pemateri / Guru:</span>
                        <p className="text-slate-600 mt-0.5 font-medium">{daySched.instructor || 'Belum ditentukan'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-600">
                      <BookOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-bold text-slate-800">Materi Terjadwal:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {assignedMaterials.length > 0 ? (
                            assignedMaterials.map((m) => (
                              <span
                                key={m.id}
                                className="px-2.5 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 border border-emerald-200 rounded-lg text-[11px] font-semibold"
                              >
                                {m.number}. {m.title}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Materi belum diatur</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {daySched.notes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl italic border border-slate-100">
                        "{daySched.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditDay(daySched)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-emerald-800 hover:text-white hover:bg-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Jadwal Hari {dayName}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 9 Daftar Materi Pengajian Standard (Editable) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>Daftar 9 Materi Utama Pengajian</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar silabus kurikulum materi pengajian. Anda dapat mengedit judul, deskripsi, atau menambah materi baru.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateMaterial}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Materi Baru</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => {
            // Colors for material numbers
            const colorPalette = [
              'from-emerald-500 to-emerald-700 text-white',
              'from-teal-500 to-teal-700 text-white',
              'from-cyan-500 to-blue-700 text-white',
              'from-indigo-500 to-indigo-700 text-white',
              'from-amber-500 to-amber-700 text-white',
              'from-rose-500 to-rose-700 text-white',
              'from-purple-500 to-purple-700 text-white',
              'from-emerald-600 to-teal-800 text-white',
              'from-orange-500 to-red-600 text-white',
            ];
            const numBg = colorPalette[(mat.number - 1) % colorPalette.length];

            return (
              <div
                key={mat.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${numBg} flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm`}
                      >
                        {mat.number}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">
                          {mat.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Kurikulum Materi #{mat.number}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenEditMaterial(mat)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit materi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    {mat.description || 'Kajian materi pengajian kelompok.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Edit Schedule Day (With Jam Mulai & Jam Selesai) */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  Edit Jadwal Pengajian Hari {editingDay.dayName}
                </h3>
                <p className="text-xs text-emerald-100">
                  Kelompok: {currentGroup?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDay} className="p-6 space-y-4">
              {/* Jam Mulai & Jam Selesai Inputs */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    Pengaturan Jam Pengajian (WITA)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    ⏱ {editDayDuration.text}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jam Mulai (WITA) *
                    </label>
                    <input
                      type="time"
                      required
                      value={dayForm.startTime}
                      onChange={(e) => setDayForm({ ...dayForm, startTime: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jam Selesai (WITA) *
                    </label>
                    <input
                      type="time"
                      required
                      value={dayForm.endTime}
                      onChange={(e) => setDayForm({ ...dayForm, endTime: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pemateri / Pengajar *
                </label>
                <input
                  type="text"
                  required
                  value={dayForm.instructor}
                  onChange={(e) => setDayForm({ ...dayForm, instructor: e.target.value })}
                  placeholder="Contoh: Ustadz Abdullah / Ust. Ridwan"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Materi Default untuk Hari {editingDay.dayName}:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {materials.map((mat) => {
                    const isChecked = dayForm.selectedMateriIds.includes(mat.id);
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setDayForm({
                              ...dayForm,
                              selectedMateriIds: dayForm.selectedMateriIds.filter(
                                (id) => id !== mat.id
                              ),
                            });
                          } else {
                            setDayForm({
                              ...dayForm,
                              selectedMateriIds: [...dayForm.selectedMateriIds, mat.id],
                            });
                          }
                        }}
                        className={`p-2.5 rounded-xl text-left text-xs border transition-all flex items-center justify-between cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">
                          {mat.number}. {mat.title}
                        </span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan Tambahan
                </label>
                <input
                  type="text"
                  value={dayForm.notes}
                  onChange={(e) => setDayForm({ ...dayForm, notes: e.target.value })}
                  placeholder="Kajian rutin ba'da Isya..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Jadwal Pengajian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit / Tambah Materi */}
      {(editingMaterial || isNewMaterial) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {isNewMaterial ? 'Tambah Materi Pengajian Baru' : 'Edit Materi Pengajian'}
                </h3>
                <p className="text-xs text-emerald-100">
                  Kurikulum silabus pengajian
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMaterial(null);
                  setIsNewMaterial(false);
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Urut
                  </label>
                  <input
                    type="number"
                    value={materialForm.number}
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, number: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Materi *
                  </label>
                  <input
                    type="text"
                    required
                    value={materialForm.title}
                    onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                    placeholder="Contoh: Al-Quran / Makalah CAI"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Penjelasan Singkat
                </label>
                <textarea
                  rows={3}
                  value={materialForm.description}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, description: e.target.value })
                  }
                  placeholder="Keterangan materi yang disampaikan..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMaterial(null);
                    setIsNewMaterial(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Materi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
