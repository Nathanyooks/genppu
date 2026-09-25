export type Gender = 'L' | 'P'; // Laki-laki | Perempuan

export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpa';

export interface Jamaah {
  id: string;
  groupId: string;
  name: string;
  gender: Gender;
  category: 'bapak' | 'ibu' | 'pemuda' | 'pemudi';
  birthDate?: string; // "YYYY-MM-DD"
  age?: number; // Usia dalam tahun
  phone?: string;
  address?: string;
  isActive: boolean;
  notes?: string;
}

export interface AttendanceRecord {
  jamaahId: string;
  status: AttendanceStatus;
  permissionReason?: string; // Reason if 'izin'
  note?: string; // Custom note
  time?: string;
}

export interface AttendanceSession {
  id: string; // e.g. "grp1-2026-09-23"
  groupId: string;
  date: string; // "YYYY-MM-DD"
  dayName: string; // "Senin" | "Rabu" | "Jumat" | etc.
  time: string; // "19:30 - 21:00"
  startTime?: string; // "19:30"
  endTime?: string; // "21:00"
  materiIds: string[]; // selected materials for this session
  materiNote?: string; // e.g. "Surat Al-Baqarah ayat 1-20"
  records: Record<string, AttendanceRecord>; // jamaahId -> record
  submittedAt: string;
  submittedBy: string;
  notes?: string;
}

export interface PengajianGroup {
  id: string;
  name: string;
  masjidName: string;
  address: string;
  adminName: string;
  pin: string; // Password / PIN for this group
  totalJamaahCount?: number;
  lastLoginUser?: string; // Nama petugas/pengguna yang terakhir masuk
  lastLoginAt?: string; // Waktu terakhir login
}

export interface PengajianMaterial {
  id: string;
  number: number;
  title: string;
  description?: string;
  isDefault?: boolean;
}

export interface WeeklyScheduleDay {
  id: string;
  dayName: 'Senin' | 'Rabu' | 'Jumat' | 'Minggu' | 'Selasa' | 'Kamis' | 'Sabtu';
  time: string; // backwards compat e.g. "19:30 - 21:00"
  startTime?: string; // "19:30"
  endTime?: string; // "21:00"
  isActive: boolean;
  defaultMateriIds: string[];
  instructor?: string;
  notes?: string;
}

export interface SystemSettings {
  masterUsername: string;
  masterPassword: string;
  appName: string;
  allowEditPastDays: boolean;
  lastUpdated: string;
}

export interface LoginActivity {
  id: string;
  timestamp: string; // ISO string
  groupId: string;
  groupName: string;
  userName: string; // Nama orang yang masuk ke akun kelompok
  officerName?: string; // Nama petugas/pengguna spesifik
  role: 'kelompok' | 'master';
  deviceInfo?: string;
}

export interface AppDatabase {
  settings: SystemSettings;
  groups: PengajianGroup[];
  materials: PengajianMaterial[];
  schedules: Record<string, WeeklyScheduleDay[]>; // groupId -> schedules
  jamaahList: Jamaah[];
  attendanceSessions: AttendanceSession[];
  loginActivities?: LoginActivity[];
}

export type AuthRole = 'master' | 'kelompok';

export interface CurrentUser {
  role: AuthRole;
  groupId?: string;
  groupName?: string;
  username: string;
  officerName?: string; // Nama pengguna/petugas yang masuk
}
