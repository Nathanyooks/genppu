import React from 'react';
import { CurrentUser } from '../types';
import { LogOut, Shield, Users } from 'lucide-react';

export type NavTab = 'absensi' | 'jamaah' | 'jadwal' | 'rekap' | 'master_control' | 'pengaturan';

interface NavbarProps {
  currentUser: CurrentUser;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  onLogout,
}) => {
  const isMaster = currentUser.role === 'master';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange(isMaster ? 'master_control' : 'absensi')}
              className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
                <span className="text-base font-serif">🕌</span>
              </div>
              <div className="text-left">
                <span className="block leading-none text-slate-900 font-extrabold text-sm sm:text-base">
                  Absensi Pengajian
                </span>
                <span className="block text-[10px] text-emerald-700 font-semibold tracking-wide">
                  Masjid & Kelompok
                </span>
              </div>
            </button>
            <span className="hidden sm:inline-block text-slate-300">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold">
              {isMaster ? (
                <span className="flex items-center gap-1.5 text-indigo-900 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-full shadow-xs">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  Admin Master Pusat
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-900 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full shadow-xs">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    {currentUser.groupName || 'Akun Kelompok'}
                  </span>
                  {currentUser.officerName && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200 truncate max-w-[140px]" title={`Petugas: ${currentUser.officerName}`}>
                      👤 {currentUser.officerName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Zone 2: 4-6 clean text navigation links */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-semibold">
            {!isMaster ? (
              <>
                <button
                  type="button"
                  onClick={() => onTabChange('absensi')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'absensi'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Absensi Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('jamaah')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'jamaah'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Data Jamaah
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('jadwal')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'jadwal'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Jadwal & Materi
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('rekap')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'rekap'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Diagram Rekap
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onTabChange('master_control')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'master_control'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Monitoring Kelompok
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('rekap')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'rekap'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Rekap & Diagram
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('jamaah')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'jamaah'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Data Semua Jamaah
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('jadwal')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'jadwal'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Jadwal & 9 Materi
                </button>
                <button
                  type="button"
                  onClick={() => onTabChange('pengaturan')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'pengaturan'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  PIN / Password
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center gap-1 py-2 overflow-x-auto border-t border-slate-100 text-xs font-medium">
          {!isMaster ? (
            <>
              <button
                type="button"
                onClick={() => onTabChange('absensi')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'absensi' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                Absensi
              </button>
              <button
                type="button"
                onClick={() => onTabChange('jamaah')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'jamaah' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                Jamaah
              </button>
              <button
                type="button"
                onClick={() => onTabChange('jadwal')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'jadwal' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                Jadwal
              </button>
              <button
                type="button"
                onClick={() => onTabChange('rekap')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'rekap' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                }`}
              >
                Diagram
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onTabChange('master_control')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'master_control' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Monitoring
              </button>
              <button
                type="button"
                onClick={() => onTabChange('rekap')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'rekap' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Rekap
              </button>
              <button
                type="button"
                onClick={() => onTabChange('jamaah')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'jamaah' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Jamaah
              </button>
              <button
                type="button"
                onClick={() => onTabChange('jadwal')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'jadwal' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                Jadwal
              </button>
              <button
                type="button"
                onClick={() => onTabChange('pengaturan')}
                className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
                  activeTab === 'pengaturan' ? 'bg-slate-900 text-white' : 'text-slate-600'
                }`}
              >
                PIN/Password
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
