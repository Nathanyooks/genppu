import { AttendanceSession, Jamaah, PengajianGroup, PengajianMaterial } from '../types';

export const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function getIndonesianDayName(dateString: string): string {
  const d = new Date(dateString + 'T00:00:00');
  return INDONESIAN_DAYS[d.getDay()] || 'Senin';
}

export function formatIndonesianDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString + 'T00:00:00');
  const dayName = INDONESIAN_DAYS[d.getDay()];
  const date = d.getDate();
  const month = INDONESIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${date} ${month} ${year}`;
}

/**
 * Format tanggal lahir ke format Indonesia (contoh: 17 Agustus 1995)
 */
export function formatIndonesianBirthDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(monthIdx) && !isNaN(day)) {
        const monthName = INDONESIAN_MONTHS[monthIdx] || parts[1];
        return `${day} ${monthName} ${year}`;
      }
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    // Fallback
  }
  return dateString;
}

/**
 * Hitung usia (tahun) secara akurat dari tanggal lahir YYYY-MM-DD
 */
export function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  try {
    const parts = birthDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

      const birth = new Date(year, month, day);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 && age < 150 ? age : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Format tanggal dan waktu ke standar WITA (Asia/Makassar)
 */
export function formatWitaDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return (
      date.toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) + ' WITA'
    );
  } catch {
    return isoString;
  }
}

/**
 * Format waktu relatif sederhana (contoh: Baru saja, 5 mnt lalu, 2 jam lalu)
 */
export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return 'Kemarin';
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return formatWitaDateTime(isoString);
  } catch {
    return isoString;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateAttendanceStats(
  members: Jamaah[],
  session?: AttendanceSession | null
) {
  const total = members.length;
  const laki = members.filter((m) => m.gender === 'L').length;
  const perempuan = members.filter((m) => m.gender === 'P').length;

  if (!session || !session.records) {
    return {
      total,
      laki,
      perempuan,
      hadir: 0,
      sakit: 0,
      izin: 0,
      alpa: 0,
      belumAbsen: total,
      persenHadir: 0,
      hadirLaki: 0,
      hadirPerempuan: 0,
    };
  }

  let hadir = 0;
  let sakit = 0;
  let izin = 0;
  let alpa = 0;
  let hadirLaki = 0;
  let hadirPerempuan = 0;

  members.forEach((m) => {
    const rec = session.records[m.id];
    if (rec) {
      if (rec.status === 'hadir') {
        hadir++;
        if (m.gender === 'L') hadirLaki++;
        else hadirPerempuan++;
      } else if (rec.status === 'sakit') {
        sakit++;
      } else if (rec.status === 'izin') {
        izin++;
      } else if (rec.status === 'alpa') {
        alpa++;
      }
    }
  });

  const belumAbsen = Math.max(0, total - (hadir + sakit + izin + alpa));
  const persenHadir = total > 0 ? Math.round((hadir / total) * 100) : 0;

  return {
    total,
    laki,
    perempuan,
    hadir,
    sakit,
    izin,
    alpa,
    belumAbsen,
    persenHadir,
    hadirLaki,
    hadirPerempuan,
  };
}

export function calculateSessionDuration(startTime?: string, endTime?: string): { minutes: number; text: string } {
  if (!startTime || !endTime) {
    return { minutes: 90, text: '90 Menit' };
  }
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
    return { minutes: 90, text: '90 Menit' };
  }

  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;
  if (endTotal < startTotal) {
    // Cross midnight
    endTotal += 24 * 60;
  }
  const diff = endTotal - startTotal;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  let text = '';
  if (hours > 0 && mins > 0) {
    text = `${hours} Jam ${mins} Menit (${diff} Menit)`;
  } else if (hours > 0) {
    text = `${hours} Jam (${diff} Menit)`;
  } else {
    text = `${mins} Menit`;
  }

  return { minutes: diff, text };
}

export function generateWhatsAppReport(
  group: PengajianGroup,
  session: AttendanceSession,
  members: Jamaah[],
  materials: PengajianMaterial[]
): string {
  const stats = calculateAttendanceStats(members, session);
  const formattedDate = formatIndonesianDate(session.date);

  const selectedMats = materials
    .filter((m) => session.materiIds?.includes(m.id))
    .map((m) => `• ${m.title}`)
    .join('\n');

  const hadirList = members
    .filter((m) => session.records[m.id]?.status === 'hadir')
    .map((m) => m.name);

  const izinList = members
    .filter((m) => session.records[m.id]?.status === 'izin')
    .map((m) => {
      const reason = session.records[m.id]?.permissionReason;
      return `• ${m.name} (${reason || 'Izin'})`;
    });

  const sakitList = members
    .filter((m) => session.records[m.id]?.status === 'sakit')
    .map((m) => {
      const note = session.records[m.id]?.note;
      return `• ${m.name}${note ? ` (${note})` : ''}`;
    });

  const alpaList = members
    .filter((m) => session.records[m.id]?.status === 'alpa')
    .map((m) => `• ${m.name}`);

  const start = session.startTime || session.time?.split('-')[0]?.trim() || '19:30';
  const end = session.endTime || session.time?.split('-')[1]?.trim() || '21:00';
  const durationInfo = calculateSessionDuration(start, end);

  let text = `*LAPORAN ABSENSI PENGAJIAN*\n`;
  text += `🏛 *${group.masjidName}* (${group.name})\n`;
  text += `📅 *Hari/Tanggal:* ${formattedDate}\n`;
  text += `⏰ *Jam Mulai:* ${start} WITA\n`;
  text += `🏁 *Jam Selesai:* ${end} WITA (Durasi: ${durationInfo.text})\n\n`;

  text += `*MATERI PENGAJIAN:*\n`;
  text += selectedMats || '• Sesuai Jadwal Rutin';
  if (session.materiNote) {
    text += `\n_Catatan materi: ${session.materiNote}_`;
  }
  text += `\n\n`;

  text += `*REKAPITULASI KEHADIRAN:*\n`;
  text += `👥 Total Jamaah : ${stats.total} orang\n`;
  text += `✅ Hadir : ${stats.hadir} orang (${stats.persenHadir}%)\n`;
  text += `   - Ikhwan (L) : ${stats.hadirLaki}/${stats.laki}\n`;
  text += `   - Akhwat (P) : ${stats.hadirPerempuan}/${stats.perempuan}\n`;
  text += `🩹 Sakit : ${stats.sakit} orang\n`;
  text += `📝 Izin : ${stats.izin} orang\n`;
  text += `❌ Alpa / TK : ${stats.alpa} orang\n\n`;

  if (sakitList.length > 0) {
    text += `*Jamaah Sakit:*\n${sakitList.join('\n')}\n\n`;
  }

  if (izinList.length > 0) {
    text += `*Jamaah Izin:*\n${izinList.join('\n')}\n\n`;
  }

  if (alpaList.length > 0) {
    text += `*Tanpa Keterangan:*\n${alpaList.join('\n')}\n\n`;
  }

  text += `_Dilaporkan oleh: ${session.submittedBy || group.adminName}_\n`;
  text += `_Alhamdulillah Jazakumullohu Khoiro._`;

  return text;
}
