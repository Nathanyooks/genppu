import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { INITIAL_DATABASE } from './src/data/initialData';
import { AppDatabase, AttendanceSession, Jamaah, PengajianGroup, PengajianMaterial, WeeklyScheduleDay } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Read database from file or initialize with seed data
function readDatabase(): AppDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content) as AppDatabase;
    }
  } catch (err) {
    console.error('Error reading DB_FILE, falling back to seed:', err);
  }
  // If not existing or error, save initial data
  saveDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

function saveDatabase(db: AppDatabase): void {
  try {
    db.settings.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB_FILE:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API ROUTES ---

  // 1. Get entire database
  app.get('/api/data', (_req: Request, res: Response) => {
    const db = readDatabase();
    res.json({ success: true, data: db });
  });

  // 2. Login endpoint
  app.post('/api/login', (req: Request, res: Response) => {
    const { role, username, password, groupId, pin } = req.body;
    const db = readDatabase();

    if (role === 'master') {
      if (
        username === db.settings.masterUsername &&
        password === db.settings.masterPassword
      ) {
        return res.json({
          success: true,
          user: {
            role: 'master',
            username: db.settings.masterUsername,
          },
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Username atau password Akun Master salah!',
      });
    }

    if (role === 'kelompok') {
      const { userName, officerName } = req.body;
      const group = db.groups.find((g) => g.id === groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Kelompok/Masjid tidak ditemukan!',
        });
      }

      if (group.pin === pin) {
        const activeUserName = (userName || officerName || '').trim() || group.adminName || 'Petugas Kelompok';
        const now = new Date().toISOString();

        // Update group last login info
        group.lastLoginUser = activeUserName;
        group.lastLoginAt = now;

        // Record in db.loginActivities
        if (!db.loginActivities) {
          db.loginActivities = [];
        }

        const activity = {
          id: 'log-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
          timestamp: now,
          groupId: group.id,
          groupName: `${group.name} (${group.masjidName})`,
          userName: activeUserName,
          role: 'kelompok' as const,
          deviceInfo: (req.headers['user-agent'] as string) || 'Web Browser',
        };

        db.loginActivities.unshift(activity);
        // Retain recent 150 login logs
        if (db.loginActivities.length > 150) {
          db.loginActivities = db.loginActivities.slice(0, 150);
        }

        saveDatabase(db);

        return res.json({
          success: true,
          user: {
            role: 'kelompok',
            groupId: group.id,
            groupName: group.name,
            username: activeUserName,
            officerName: activeUserName,
          },
        });
      }
      return res.status(401).json({
        success: false,
        message: `PIN/Password untuk ${group.name} tidak sesuai!`,
      });
    }

    return res.status(400).json({ success: false, message: 'Role tidak valid' });
  });

  // Clear login activity logs (Admin Master only)
  app.post('/api/login-activities/clear', (_req: Request, res: Response) => {
    const db = readDatabase();
    db.loginActivities = [];
    saveDatabase(db);
    return res.json({ success: true, message: 'Riwayat login berhasil dibersihkan' });
  });

  // 3. Save / Submit Attendance Session
  app.post('/api/attendance/save', (req: Request, res: Response) => {
    const session: AttendanceSession = req.body;
    if (!session || !session.groupId || !session.date) {
      return res.status(400).json({ success: false, message: 'Data absensi tidak lengkap' });
    }

    const db = readDatabase();
    const existingIndex = db.attendanceSessions.findIndex(
      (s) => s.groupId === session.groupId && s.date === session.date
    );

    if (existingIndex >= 0) {
      db.attendanceSessions[existingIndex] = {
        ...db.attendanceSessions[existingIndex],
        ...session,
        submittedAt: new Date().toISOString(),
      };
    } else {
      db.attendanceSessions.push({
        ...session,
        id: session.id || `${session.groupId}-${session.date}`,
        submittedAt: new Date().toISOString(),
      });
    }

    saveDatabase(db);
    return res.json({ success: true, message: 'Absensi berhasil disimpan ke database!', data: db.attendanceSessions });
  });

  // 4. Reset Attendance Session
  app.post('/api/attendance/reset', (req: Request, res: Response) => {
    const { groupId, date } = req.body;
    if (!groupId || !date) {
      return res.status(400).json({ success: false, message: 'GroupId dan date diperlukan' });
    }

    const db = readDatabase();
    db.attendanceSessions = db.attendanceSessions.filter(
      (s) => !(s.groupId === groupId && s.date === date)
    );

    saveDatabase(db);
    return res.json({ success: true, message: 'Absensi tanggal tersebut berhasil direset.' });
  });

  // 5. Add / Update Jamaah
  app.post('/api/members', (req: Request, res: Response) => {
    const member: Jamaah = req.body;
    if (!member.name || !member.groupId || !member.gender) {
      return res.status(400).json({ success: false, message: 'Nama, kelompok, dan jenis kelamin wajib diisi' });
    }

    const db = readDatabase();
    if (member.id) {
      const idx = db.jamaahList.findIndex((m) => m.id === member.id);
      if (idx >= 0) {
        db.jamaahList[idx] = { ...db.jamaahList[idx], ...member };
      } else {
        db.jamaahList.push(member);
      }
    } else {
      const newMember: Jamaah = {
        ...member,
        id: 'j-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
        isActive: member.isActive ?? true,
      };
      db.jamaahList.push(newMember);
    }

    saveDatabase(db);
    return res.json({ success: true, message: 'Data jamaah berhasil diperbarui', data: db.jamaahList });
  });

  // 6. Delete Jamaah
  app.delete('/api/members/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDatabase();
    db.jamaahList = db.jamaahList.filter((m) => m.id !== id);
    saveDatabase(db);
    return res.json({ success: true, message: 'Jamaah berhasil dihapus' });
  });

  // 7. Add / Update Group
  app.post('/api/groups', (req: Request, res: Response) => {
    const group: PengajianGroup = req.body;
    if (!group.name) {
      return res.status(400).json({ success: false, message: 'Nama kelompok wajib diisi' });
    }

    const db = readDatabase();
    if (group.id) {
      const idx = db.groups.findIndex((g) => g.id === group.id);
      if (idx >= 0) {
        db.groups[idx] = { ...db.groups[idx], ...group };
      } else {
        db.groups.push(group);
      }
    } else {
      const newGroup: PengajianGroup = {
        ...group,
        id: 'grp-' + Date.now().toString(36),
        pin: group.pin || '1234',
      };
      db.groups.push(newGroup);
      // Initialize default schedule for new group
      if (!db.schedules[newGroup.id]) {
        db.schedules[newGroup.id] = JSON.parse(JSON.stringify(db.schedules['grp-1'] || []));
      }
    }

    saveDatabase(db);
    return res.json({ success: true, message: 'Data kelompok berhasil diperbarui', data: db.groups });
  });

  // 8. Update Schedule
  app.post('/api/schedule', (req: Request, res: Response) => {
    const { groupId, schedules }: { groupId: string; schedules: WeeklyScheduleDay[] } = req.body;
    if (!groupId || !Array.isArray(schedules)) {
      return res.status(400).json({ success: false, message: 'Data jadwal tidak valid' });
    }

    const db = readDatabase();
    db.schedules[groupId] = schedules;
    saveDatabase(db);
    return res.json({ success: true, message: 'Jadwal pengajian berhasil diperbarui', data: schedules });
  });

  // 9. Update Materials List
  app.post('/api/materials', (req: Request, res: Response) => {
    const materials: PengajianMaterial[] = req.body;
    if (!Array.isArray(materials)) {
      return res.status(400).json({ success: false, message: 'Daftar materi tidak valid' });
    }

    const db = readDatabase();
    db.materials = materials;
    saveDatabase(db);
    return res.json({ success: true, message: 'Daftar materi berhasil diperbarui', data: materials });
  });

  // 10. Update Passwords & PINs (Master Admin feature only)
  app.post('/api/settings/passwords', (req: Request, res: Response) => {
    const { masterPassword, groupPins } = req.body;
    const db = readDatabase();

    if (masterPassword && typeof masterPassword === 'string') {
      db.settings.masterPassword = masterPassword.trim();
    }

    if (groupPins && typeof groupPins === 'object') {
      Object.entries(groupPins).forEach(([gId, pin]) => {
        const grp = db.groups.find((g) => g.id === gId);
        if (grp && typeof pin === 'string') {
          grp.pin = pin.trim();
        }
      });
    }

    saveDatabase(db);
    return res.json({ success: true, message: 'Password Master dan PIN Kelompok berhasil diperbarui!' });
  });

  // 11. Reset Database to Default Seed
  app.post('/api/database/reset', (_req: Request, res: Response) => {
    saveDatabase(INITIAL_DATABASE);
    return res.json({ success: true, message: 'Database berhasil dikembalikan ke data awal', data: INITIAL_DATABASE });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Pengajian Absensi Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
