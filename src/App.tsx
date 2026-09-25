/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppDatabase, AttendanceSession, CurrentUser, Jamaah, PengajianGroup, PengajianMaterial, WeeklyScheduleDay } from './types';
import { INITIAL_DATABASE } from './data/initialData';
import {
  clearLoginActivities,
  deleteMember,
  fetchDatabase,
  getSavedUser,
  loginUser,
  resetAttendance,
  saveAttendance,
  saveAuthUser,
  saveGroup,
  saveMaterials,
  saveMember,
  savePasswords,
  saveSchedule,
} from './services/api';
import { LoginView } from './components/LoginView';
import { Navbar, NavTab } from './components/Navbar';
import { AttendanceGridView } from './components/AttendanceGridView';
import { JamaahManagementView } from './components/JamaahManagementView';
import { ScheduleMaterialsView } from './components/ScheduleMaterialsView';
import { RecapChartsView } from './components/RecapChartsView';
import { MasterAdminView } from './components/MasterAdminView';

export default function App() {
  const [db, setDb] = useState<AppDatabase>(INITIAL_DATABASE);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => getSavedUser());
  const [activeTab, setActiveTab] = useState<NavTab>('absensi');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // If master wants to inspect a particular group's attendance
  const [inspectedGroupId, setInspectedGroupId] = useState<string>('');

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        const data = await fetchDatabase();
        if (data) {
          setDb(data);
        }
      } catch (e) {
        console.error('Error during initial fetch:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // When user logs in, set proper initial tab
  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    saveAuthUser(user);
    if (user.role === 'master') {
      setActiveTab('master_control');
    } else {
      setActiveTab('absensi');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveAuthUser(null);
    setActiveTab('absensi');
    setInspectedGroupId('');
  };

  // Determine active group for attendance
  const activeGroupId =
    currentUser?.role === 'master'
      ? inspectedGroupId || db.groups[0]?.id || 'grp-1'
      : currentUser?.groupId || db.groups[0]?.id || 'grp-1';

  const currentGroup = db.groups.find((g) => g.id === activeGroupId) || db.groups[0];

  // Actions
  const handleSaveAttendance = async (session: AttendanceSession): Promise<boolean> => {
    const ok = await saveAttendance(session);
    if (ok) {
      // Refresh local state
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleResetAttendance = async (groupId: string, date: string): Promise<boolean> => {
    const ok = await resetAttendance(groupId, date);
    if (ok) {
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleSaveMember = async (member: Jamaah): Promise<boolean> => {
    const ok = await saveMember(member);
    if (ok) {
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleDeleteMember = async (id: string): Promise<boolean> => {
    const ok = await deleteMember(id);
    if (ok) {
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleSaveSchedule = async (groupId: string, schedules: WeeklyScheduleDay[]): Promise<boolean> => {
    const ok = await saveSchedule(groupId, schedules);
    if (ok) {
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleSaveMaterials = async (materials: PengajianMaterial[]): Promise<boolean> => {
    const ok = await saveMaterials(materials);
    if (ok) {
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleSavePasswords = async (payload: {
    masterPassword?: string;
    groupPins?: Record<string, string>;
  }): Promise<boolean> => {
    const ok = await savePasswords(payload);
    if (ok) {
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleSaveGroup = async (group: PengajianGroup): Promise<boolean> => {
    const ok = await saveGroup(group);
    if (ok) {
      const fresh = await fetchDatabase();
      setDb(fresh);
    }
    return ok;
  };

  const handleClearLoginActivities = async (): Promise<boolean> => {
    const ok = await clearLoginActivities();
    if (ok) {
      setDb((prev) => ({
        ...prev,
        loginActivities: [],
      }));
    }
    return ok;
  };

  // If not logged in, render the login view first as per requirement:
  // "setiap membuka link maka yang pertama adalah tampilan login baik itu admin master maupun admin kelompok, dan terdapat pilihan nama2 kelompok nya"
  if (!currentUser) {
    return (
      <LoginView
        groups={db.groups}
        onLoginSuccess={handleLoginSuccess}
        onLoginAttempt={loginUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        onLogout={handleLogout}
      />

      {/* Main Container Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Master Control Tab */}
        {currentUser.role === 'master' && (activeTab === 'master_control' || activeTab === 'pengaturan') && (
          <MasterAdminView
            settings={db.settings}
            groups={db.groups}
            allMembers={db.jamaahList}
            sessions={db.attendanceSessions}
            loginActivities={db.loginActivities || []}
            onClearLoginActivities={handleClearLoginActivities}
            onSavePasswords={handleSavePasswords}
            onSaveGroup={handleSaveGroup}
            onSelectGroupForAttendance={(groupId) => {
              setInspectedGroupId(groupId);
              setActiveTab('absensi');
            }}
          />
        )}

        {/* Absensi Hari Ini Tab */}
        {activeTab === 'absensi' && (
          <div className="space-y-4">
            {/* If Master is inspecting, provide a group switcher bar */}
            {currentUser.role === 'master' && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Inspeksi Absensi Kelompok:</span>
                </div>
                <select
                  value={activeGroupId}
                  onChange={(e) => setInspectedGroupId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  {db.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.masjidName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <AttendanceGridView
              group={currentGroup}
              currentUser={currentUser}
              allMembers={db.jamaahList}
              materials={db.materials}
              existingSession={
                db.attendanceSessions.find(
                  (s) => s.groupId === currentGroup.id && s.date === new Date().toISOString().split('T')[0]
                ) || null
              }
              allSessions={db.attendanceSessions}
              onSaveSession={handleSaveAttendance}
              onResetSession={handleResetAttendance}
              onNavigateToJamaah={() => setActiveTab('jamaah')}
            />
          </div>
        )}

        {/* Data Jamaah Tab */}
        {activeTab === 'jamaah' && (
          <JamaahManagementView
            currentGroupId={currentUser.role === 'kelompok' ? currentUser.groupId : undefined}
            isMaster={currentUser.role === 'master'}
            groups={db.groups}
            allMembers={db.jamaahList}
            onSaveMember={handleSaveMember}
            onDeleteMember={handleDeleteMember}
          />
        )}

        {/* Jadwal & Materi Tab */}
        {activeTab === 'jadwal' && (
          <ScheduleMaterialsView
            currentGroupId={currentUser.role === 'kelompok' ? currentUser.groupId : undefined}
            isMaster={currentUser.role === 'master'}
            groups={db.groups}
            materials={db.materials}
            schedules={db.schedules}
            onSaveSchedule={handleSaveSchedule}
            onSaveMaterials={handleSaveMaterials}
          />
        )}

        {/* Diagram Rekap Kehadiran Tab */}
        {activeTab === 'rekap' && (
          <RecapChartsView
            currentGroupId={currentUser.role === 'kelompok' ? currentUser.groupId : undefined}
            isMaster={currentUser.role === 'master'}
            groups={db.groups}
            allMembers={db.jamaahList}
            materials={db.materials}
            sessions={db.attendanceSessions}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sistem Absensi Online Pengajian Masjid & Kelompok</span>
          <span className="tabular-nums">
            Pembaruan Terakhir: {new Date(db.settings.lastUpdated).toLocaleDateString('id-ID')}
          </span>
        </div>
      </footer>
    </div>
  );
}
