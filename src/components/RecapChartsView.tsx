import React, { useState } from 'react';
import { AttendanceSession, Jamaah, PengajianGroup, PengajianMaterial } from '../types';
import {
  PieChart,
  BarChart3,
  Calendar,
  Share2,
  Printer,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  calculateAttendanceStats,
  formatIndonesianDate,
  generateWhatsAppReport,
} from '../utils/helpers';

interface RecapChartsViewProps {
  currentGroupId?: string;
  isMaster: boolean;
  groups: PengajianGroup[];
  allMembers: Jamaah[];
  materials: PengajianMaterial[];
  sessions: AttendanceSession[];
}

export const RecapChartsView: React.FC<RecapChartsViewProps> = ({
  currentGroupId,
  isMaster,
  groups,
  allMembers,
  materials,
  sessions,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    currentGroupId || groups[0]?.id || ''
  );
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedSessionDate, setSelectedSessionDate] = useState<string>('LATEST');

  // Filter sessions by selected group
  const groupSessions = sessions
    .filter((s) => s.groupId === selectedGroupId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const groupMembers = allMembers.filter((m) => m.groupId === selectedGroupId && m.isActive);

  // Active session for deep stats
  const activeSession =
    selectedSessionDate === 'LATEST'
      ? groupSessions[0] || null
      : groupSessions.find((s) => s.date === selectedSessionDate) || null;

  const stats = calculateAttendanceStats(groupMembers, activeSession);

  // Calculate cumulative stats across all sessions for this group
  let cumHadir = 0;
  let cumSakit = 0;
  let cumIzin = 0;
  let cumAlpa = 0;
  let cumTotalPossible = 0;

  groupSessions.forEach((sess) => {
    Object.values(sess.records || {}).forEach((rec) => {
      cumTotalPossible++;
      if (rec.status === 'hadir') cumHadir++;
      else if (rec.status === 'sakit') cumSakit++;
      else if (rec.status === 'izin') cumIzin++;
      else if (rec.status === 'alpa') cumAlpa++;
    });
  });

  const totalStatusRecorded = stats.hadir + stats.sakit + stats.izin + stats.alpa;
  const hadirPct = totalStatusRecorded > 0 ? Math.round((stats.hadir / totalStatusRecorded) * 100) : 0;
  const sakitPct = totalStatusRecorded > 0 ? Math.round((stats.sakit / totalStatusRecorded) * 100) : 0;
  const izinPct = totalStatusRecorded > 0 ? Math.round((stats.izin / totalStatusRecorded) * 100) : 0;
  const alpaPct = totalStatusRecorded > 0 ? Math.round((stats.alpa / totalStatusRecorded) * 100) : 0;

  // Donut chart stroke dashes (circumference = 2 * PI * 40 ≈ 251.2)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const hadirDash = (hadirPct / 100) * circumference;
  const sakitDash = (sakitPct / 100) * circumference;
  const izinDash = (izinPct / 100) * circumference;
  const alpaDash = (alpaPct / 100) * circumference;

  const hadirOffset = 0;
  const sakitOffset = -hadirDash;
  const izinOffset = -(hadirDash + sakitDash);
  const alpaOffset = -(hadirDash + sakitDash + izinDash);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
              <PieChart className="w-4 h-4" />
              <span>Analisis & Statistik Pengajian</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Diagram Rekap Kehadiran
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisasi persentase kehadiran, grafik tren sesi pertemuan, dan riwayat absensi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isMaster && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Pilih Kelompok:</span>
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setSelectedSessionDate('LATEST');
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} - {g.masjidName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date / Session Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-slate-700">Tampilkan Sesi:</span>
          <select
            value={selectedSessionDate}
            onChange={(e) => setSelectedSessionDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none"
          >
            <option value="LATEST">Sesi Terakhir ({groupSessions[0]?.date ? formatIndonesianDate(groupSessions[0].date) : 'Belum ada'})</option>
            {groupSessions.map((s) => (
              <option key={s.id} value={s.date}>
                {formatIndonesianDate(s.date)} ({s.dayName})
              </option>
            ))}
          </select>
        </div>

        {activeSession && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const text = generateWhatsAppReport(
                  currentGroup,
                  activeSession,
                  groupMembers,
                  materials
                );
                navigator.clipboard.writeText(text);
                alert('Teks laporan berhasil disalin untuk WhatsApp!');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Salin Laporan WA</span>
            </button>
          </div>
        )}
      </div>

      {groupSessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-sm">Belum ada riwayat absensi tersimpan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Silakan buka tab "Absensi Hari Ini" lalu klik tombol "Kirim Absensi" untuk menyimpan sesi pertama.
          </p>
        </div>
      ) : (
        <>
          {/* Visual Diagrams Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart: Komposisi Kehadiran */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  <span>Diagram Komposisi Kehadiran</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {activeSession ? formatIndonesianDate(activeSession.date) : ''}
                </span>
              </div>

              <div className="py-6 flex flex-col sm:flex-row items-center justify-around gap-6">
                {/* SVG Donut Chart */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="text-slate-100 stroke-current"
                      strokeWidth="14"
                      fill="transparent"
                    />
                    {/* Hadir segment (Emerald) */}
                    {hadirPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#059669"
                        strokeWidth="14"
                        strokeDasharray={`${hadirDash} ${circumference}`}
                        strokeDashoffset={hadirOffset}
                        fill="transparent"
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {/* Sakit segment (Blue) */}
                    {sakitPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#2563eb"
                        strokeWidth="14"
                        strokeDasharray={`${sakitDash} ${circumference}`}
                        strokeDashoffset={sakitOffset}
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {/* Izin segment (Amber) */}
                    {izinPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#d97706"
                        strokeWidth="14"
                        strokeDasharray={`${izinDash} ${circumference}`}
                        strokeDashoffset={izinOffset}
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {/* Alpa segment (Rose) */}
                    {alpaPct > 0 && (
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#e11d48"
                        strokeWidth="14"
                        strokeDasharray={`${alpaDash} ${circumference}`}
                        strokeDashoffset={alpaOffset}
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </svg>
                  {/* Center percentage label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-2xl font-bold text-slate-900 tabular-nums">
                      {stats.persenHadir}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Kehadiran
                    </span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-2.5 text-xs w-full sm:w-48">
                  <div className="flex items-center justify-between p-2 rounded bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span className="font-medium text-emerald-900">Hadir</span>
                    </div>
                    <span className="font-bold text-emerald-800 tabular-nums">
                      {stats.hadir} org ({hadirPct}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span className="font-medium text-blue-900">Sakit</span>
                    </div>
                    <span className="font-bold text-blue-800 tabular-nums">
                      {stats.sakit} org ({sakitPct}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-amber-50/60 border border-amber-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      <span className="font-medium text-amber-900">Izin</span>
                    </div>
                    <span className="font-bold text-amber-800 tabular-nums">
                      {stats.izin} org ({izinPct}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded bg-rose-50/60 border border-rose-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      <span className="font-medium text-rose-900">Alpa / TK</span>
                    </div>
                    <span className="font-bold text-rose-800 tabular-nums">
                      {stats.alpa} org ({alpaPct}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Gender Participation Bar */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-medium">
                  <span>Partisipasi Ikhwan (L) vs Akhwat (P):</span>
                  <span>
                    L: {stats.hadirLaki}/{stats.laki} · P: {stats.hadirPerempuan}/{stats.perempuan}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${stats.laki > 0 ? (stats.hadirLaki / stats.laki) * 50 : 0}%`,
                    }}
                    className="bg-emerald-600 transition-all"
                    title={`Ikhwan: ${stats.hadirLaki} orang`}
                  />
                  <div
                    style={{
                      width: `${stats.perempuan > 0 ? (stats.hadirPerempuan / stats.perempuan) * 50 : 0}%`,
                    }}
                    className="bg-teal-500 transition-all"
                    title={`Akhwat: ${stats.hadirPerempuan} orang`}
                  />
                </div>
              </div>
            </div>

            {/* Bar Chart: Tren Kehadiran per Pertemuan */}
            <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Diagram Tren Kehadiran (Sesi Pengajian)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {groupSessions.length} sesi tercatat
                  </span>
                </div>

                <div className="pt-6 pb-2">
                  <div className="flex items-end justify-around gap-2 h-44 border-b border-slate-200 px-2">
                    {groupSessions.slice(0, 6).map((sess) => {
                      const sessStats = calculateAttendanceStats(groupMembers, sess);
                      const heightPercent = Math.max(10, sessStats.persenHadir);

                      return (
                        <div
                          key={sess.id}
                          className="flex flex-col items-center flex-1 max-w-[50px] group cursor-pointer"
                          onClick={() => setSelectedSessionDate(sess.date)}
                        >
                          <span className="text-[11px] font-bold text-slate-700 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                            {sessStats.persenHadir}%
                          </span>
                          <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-32">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className={`w-full transition-all duration-500 rounded-t-lg ${
                                sess.date === (activeSession?.date)
                                  ? 'bg-emerald-600'
                                  : 'bg-emerald-400 group-hover:bg-emerald-500'
                              }`}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-slate-500 mt-2 truncate w-full text-center">
                            {sess.dayName}
                          </span>
                          <span className="text-[9px] text-slate-400 tabular-nums">
                            {sess.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Rata-rata kumulatif kehadiran:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {cumTotalPossible > 0 ? Math.round((cumHadir / cumTotalPossible) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Attendance History Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Riwayat Pertemuan & Daftar Kehadiran Jamaah
                </h3>
                <p className="text-xs text-slate-500">
                  Klik pada baris untuk melihat rincian nama jamaah hadir, sakit, atau izin
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {groupSessions.map((sess) => {
                const sStats = calculateAttendanceStats(groupMembers, sess);
                const isExpanded = expandedSessionId === sess.id;
                const sessMaterials = materials.filter((m) => sess.materiIds?.includes(m.id));

                return (
                  <div key={sess.id} className="transition-colors">
                    <div
                      onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {sess.dayName}, {formatIndonesianDate(sess.date)}
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            Pukul: {sess.time || '19:30'} WITA · Materi:{' '}
                            <span className="font-medium text-slate-700">
                              {sessMaterials.map((m) => m.title).join(', ') || 'Rutin'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stat pills */}
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <div className="font-bold text-emerald-700 tabular-nums">
                            {sStats.hadir}/{sStats.total} Hadir ({sStats.persenHadir}%)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Sakit: {sStats.sakit} · Izin: {sStats.izin} · Alpa: {sStats.alpa}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                        {sess.materiNote && (
                          <div className="p-2.5 bg-white rounded border border-slate-200 text-slate-700">
                            <span className="font-semibold text-slate-800">Catatan Materi: </span>
                            {sess.materiNote}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Hadir List */}
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <span className="font-bold text-emerald-800 flex items-center justify-between mb-2">
                              <span>Jamaah Hadir ({sStats.hadir})</span>
                            </span>
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                              {groupMembers
                                .filter((m) => sess.records[m.id]?.status === 'hadir')
                                .map((m) => (
                                  <div key={m.id} className="text-slate-700 flex justify-between">
                                    <span>{m.name}</span>
                                    <span className="text-slate-400 text-[10px]">
                                      {m.gender === 'L' ? 'Ikhwan' : 'Akhwat'}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>

                          {/* Izin List */}
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <span className="font-bold text-amber-800 flex items-center justify-between mb-2">
                              <span>Jamaah Izin ({sStats.izin})</span>
                            </span>
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                              {groupMembers
                                .filter((m) => sess.records[m.id]?.status === 'izin')
                                .map((m) => (
                                  <div key={m.id} className="text-slate-700">
                                    <span className="font-medium">{m.name}</span>
                                    <div className="text-[11px] text-amber-700 italic">
                                      ({sess.records[m.id]?.permissionReason || 'Izin'})
                                    </div>
                                  </div>
                                ))}
                              {sStats.izin === 0 && (
                                <span className="text-slate-400 italic">Nihil</span>
                              )}
                            </div>
                          </div>

                          {/* Sakit & Alpa List */}
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-800 mb-2 block">
                              Sakit ({sStats.sakit}) & Alpa ({sStats.alpa})
                            </span>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {groupMembers
                                .filter((m) => sess.records[m.id]?.status === 'sakit')
                                .map((m) => (
                                  <div key={m.id} className="text-blue-900">
                                    <span className="font-medium">{m.name}</span>
                                    <span className="text-xs text-blue-700 ml-1">
                                      (Sakit{sess.records[m.id]?.note ? `: ${sess.records[m.id]?.note}` : ''})
                                    </span>
                                  </div>
                                ))}
                              {groupMembers
                                .filter((m) => sess.records[m.id]?.status === 'alpa')
                                .map((m) => (
                                  <div key={m.id} className="text-rose-900">
                                    <span>{m.name}</span>
                                    <span className="text-[10px] text-rose-600 ml-1 font-semibold">
                                      [Tanpa Keterangan]
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
