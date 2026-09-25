import { AppDatabase, AttendanceSession, CurrentUser, Jamaah, PengajianGroup, PengajianMaterial, WeeklyScheduleDay } from '../types';
import { INITIAL_DATABASE } from '../data/initialData';

const LOCAL_STORAGE_KEY = 'pengajian_absensi_db_v1';
const SESSION_AUTH_KEY = 'pengajian_auth_user_v1';

// Fallback local storage helpers
export function getLocalDb(): AppDatabase {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AppDatabase;
    }
  } catch (e) {
    console.error('Failed to parse localStorage db:', e);
  }
  return INITIAL_DATABASE;
}

export function saveLocalDb(db: AppDatabase): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to write to localStorage:', e);
  }
}

export function getSavedUser(): CurrentUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_AUTH_KEY) || localStorage.getItem(SESSION_AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved user:', e);
  }
  return null;
}

export function saveAuthUser(user: CurrentUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(user));
      localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_AUTH_KEY);
      localStorage.removeItem(SESSION_AUTH_KEY);
    }
  } catch (e) {
    console.error('Failed to update auth storage:', e);
  }
}

// API Methods with automatic offline / fallback resilience
export async function fetchDatabase(): Promise<AppDatabase> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        saveLocalDb(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn('Backend fetch failed, using local storage cache:', err);
  }
  return getLocalDb();
}

export async function loginUser(payload: {
  role: 'master' | 'kelompok';
  username?: string;
  password?: string;
  groupId?: string;
  pin?: string;
  userName?: string;
  officerName?: string;
}): Promise<{ success: boolean; user?: CurrentUser; message?: string }> {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (res.ok && json.success) {
      saveAuthUser(json.user);
      return json;
    }
    return { success: false, message: json.message || 'Login gagal' };
  } catch (err) {
    console.warn('Backend login fetch failed, checking local credentials fallback:', err);
    // Offline local check fallback
    const db = getLocalDb();
    if (payload.role === 'master') {
      if (
        payload.username === db.settings.masterUsername &&
        payload.password === db.settings.masterPassword
      ) {
        const user: CurrentUser = { role: 'master', username: db.settings.masterUsername };
        saveAuthUser(user);
        return { success: true, user };
      }
      return { success: false, message: 'Username atau password Akun Master salah!' };
    } else {
      const grp = db.groups.find((g) => g.id === payload.groupId);
      if (grp && grp.pin === payload.pin) {
        const activeName = (payload.userName || payload.officerName || '').trim() || grp.adminName || 'Petugas Kelompok';
        const now = new Date().toISOString();

        grp.lastLoginUser = activeName;
        grp.lastLoginAt = now;

        if (!db.loginActivities) {
          db.loginActivities = [];
        }
        db.loginActivities.unshift({
          id: 'log-' + Date.now().toString(36),
          timestamp: now,
          groupId: grp.id,
          groupName: `${grp.name} (${grp.masjidName})`,
          userName: activeName,
          role: 'kelompok',
          deviceInfo: 'Browser Lokal',
        });
        saveLocalDb(db);

        const user: CurrentUser = {
          role: 'kelompok',
          groupId: grp.id,
          groupName: grp.name,
          username: activeName,
          officerName: activeName,
        };
        saveAuthUser(user);
        return { success: true, user };
      }
      return { success: false, message: 'PIN/Password kelompok tidak sesuai!' };
    }
  }
}

export async function clearLoginActivities(): Promise<boolean> {
  const local = getLocalDb();
  local.loginActivities = [];
  saveLocalDb(local);

  try {
    const res = await fetch('/api/login-activities/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return true;
  }
}

export async function saveAttendance(session: AttendanceSession): Promise<boolean> {
  // Update local DB right away
  const local = getLocalDb();
  const idx = local.attendanceSessions.findIndex(
    (s) => s.groupId === session.groupId && s.date === session.date
  );
  if (idx >= 0) {
    local.attendanceSessions[idx] = session;
  } else {
    local.attendanceSessions.push(session);
  }
  saveLocalDb(local);

  try {
    const res = await fetch('/api/attendance/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend saveAttendance failed, saved locally:', err);
    return true;
  }
}

export async function resetAttendance(groupId: string, date: string): Promise<boolean> {
  const local = getLocalDb();
  local.attendanceSessions = local.attendanceSessions.filter(
    (s) => !(s.groupId === groupId && s.date === date)
  );
  saveLocalDb(local);

  try {
    const res = await fetch('/api/attendance/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, date }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend resetAttendance failed, reset locally:', err);
    return true;
  }
}

export async function saveMember(member: Jamaah): Promise<boolean> {
  const local = getLocalDb();
  if (member.id) {
    const idx = local.jamaahList.findIndex((m) => m.id === member.id);
    if (idx >= 0) {
      local.jamaahList[idx] = member;
    } else {
      local.jamaahList.push(member);
    }
  } else {
    const newM: Jamaah = {
      ...member,
      id: 'j-' + Date.now().toString(36),
    };
    local.jamaahList.push(newM);
  }
  saveLocalDb(local);

  try {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend saveMember failed, saved locally:', err);
    return true;
  }
}

export async function deleteMember(id: string): Promise<boolean> {
  const local = getLocalDb();
  local.jamaahList = local.jamaahList.filter((m) => m.id !== id);
  saveLocalDb(local);

  try {
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Backend deleteMember failed, deleted locally:', err);
    return true;
  }
}

export async function saveSchedule(groupId: string, schedules: WeeklyScheduleDay[]): Promise<boolean> {
  const local = getLocalDb();
  local.schedules[groupId] = schedules;
  saveLocalDb(local);

  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, schedules }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend saveSchedule failed, saved locally:', err);
    return true;
  }
}

export async function saveMaterials(materials: PengajianMaterial[]): Promise<boolean> {
  const local = getLocalDb();
  local.materials = materials;
  saveLocalDb(local);

  try {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(materials),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend saveMaterials failed, saved locally:', err);
    return true;
  }
}

export async function savePasswords(payload: { masterPassword?: string; groupPins?: Record<string, string> }): Promise<boolean> {
  const local = getLocalDb();
  if (payload.masterPassword) {
    local.settings.masterPassword = payload.masterPassword;
  }
  if (payload.groupPins) {
    Object.entries(payload.groupPins).forEach(([gid, pin]) => {
      const g = local.groups.find((grp) => grp.id === gid);
      if (g) g.pin = pin;
    });
  }
  saveLocalDb(local);

  try {
    const res = await fetch('/api/settings/passwords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend savePasswords failed, saved locally:', err);
    return true;
  }
}

export async function saveGroup(group: PengajianGroup): Promise<boolean> {
  const local = getLocalDb();
  if (group.id) {
    const idx = local.groups.findIndex((g) => g.id === group.id);
    if (idx >= 0) local.groups[idx] = group;
    else local.groups.push(group);
  } else {
    local.groups.push({
      ...group,
      id: 'grp-' + Date.now().toString(36),
    });
  }
  saveLocalDb(local);

  try {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    return res.ok;
  } catch (err) {
    console.warn('Backend saveGroup failed, saved locally:', err);
    return true;
  }
}
