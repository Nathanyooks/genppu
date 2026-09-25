import React, { useState } from 'react';
import { Gender, Jamaah, PengajianGroup } from '../types';
import { Plus, Edit2, Trash2, Search, UserCheck, X, Calendar } from 'lucide-react';
import { calculateAge, formatIndonesianBirthDate } from '../utils/helpers';

interface JamaahManagementViewProps {
  currentGroupId?: string;
  isMaster: boolean;
  groups: PengajianGroup[];
  allMembers: Jamaah[];
  onSaveMember: (member: Jamaah) => Promise<boolean>;
  onDeleteMember: (id: string) => Promise<boolean>;
}

export const JamaahManagementView: React.FC<JamaahManagementViewProps> = ({
  currentGroupId,
  isMaster,
  groups,
  allMembers,
  onSaveMember,
  onDeleteMember,
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>(
    currentGroupId || 'ALL'
  );
  const [genderFilter, setGenderFilter] = useState<'ALL' | Gender>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<Jamaah | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    groupId: string;
    name: string;
    gender: Gender;
    category: 'bapak' | 'ibu' | 'pemuda' | 'pemudi';
    birthDate: string;
    age: string;
    phone: string;
    address: string;
    notes: string;
    isActive: boolean;
  }>({
    groupId: currentGroupId || groups[0]?.id || '',
    name: '',
    gender: 'L',
    category: 'bapak',
    birthDate: '',
    age: '',
    phone: '',
    address: '',
    notes: '',
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingMember(null);
    setFormData({
      groupId: (currentGroupId && currentGroupId !== 'ALL') ? currentGroupId : groups[0]?.id || '',
      name: '',
      gender: 'L',
      category: 'bapak',
      birthDate: '',
      age: '',
      phone: '',
      address: '',
      notes: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (member: Jamaah) => {
    setEditingMember(member);
    setFormData({
      id: member.id,
      groupId: member.groupId,
      name: member.name,
      gender: member.gender,
      category: member.category || 'bapak',
      birthDate: member.birthDate || '',
      age: member.age !== undefined ? String(member.age) : (member.birthDate ? String(calculateAge(member.birthDate) || '') : ''),
      phone: member.phone || '',
      address: member.address || '',
      notes: member.notes || '',
      isActive: member.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  // Submit Save/Update
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama jamaah wajib diisi!');
      return;
    }
    setIsSubmitting(true);
    try {
      const parsedAge = formData.age.trim() !== ''
        ? parseInt(formData.age, 10)
        : (formData.birthDate ? calculateAge(formData.birthDate) ?? undefined : undefined);

      const memberToSave: Jamaah = {
        id: formData.id || '',
        groupId: formData.groupId,
        name: formData.name.trim(),
        gender: formData.gender,
        category: formData.category,
        birthDate: formData.birthDate.trim() || undefined,
        age: parsedAge !== undefined && !isNaN(parsedAge) ? parsedAge : undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
      };
      const ok = await onSaveMember(memberToSave);
      if (ok) {
        setIsModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Member
  const handleDelete = async (member: Jamaah) => {
    if (confirm(`Yakin ingin menghapus data jamaah "${member.name}"?`)) {
      await onDeleteMember(member.id);
    }
  };

  // Filter members
  const filteredMembers = allMembers.filter((m) => {
    const matchesGroup =
      !isMaster || selectedGroupFilter === 'ALL'
        ? currentGroupId
          ? m.groupId === currentGroupId
          : true
        : m.groupId === selectedGroupFilter;

    const matchesGender = genderFilter === 'ALL' || m.gender === genderFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      m.name.toLowerCase().includes(query) ||
      (m.phone && m.phone.includes(query)) ||
      (m.category && m.category.toLowerCase().includes(query)) ||
      (m.age !== undefined && String(m.age).includes(query)) ||
      (m.birthDate && m.birthDate.includes(query));

    return matchesGroup && matchesGender && matchesSearch;
  });

  const totalLaki = filteredMembers.filter((m) => m.gender === 'L').length;
  const totalPerempuan = filteredMembers.filter((m) => m.gender === 'P').length;
  const membersWithAge = filteredMembers.filter((m) => m.age !== undefined || m.birthDate);
  const avgAge =
    membersWithAge.length > 0
      ? Math.round(
          membersWithAge.reduce((acc, m) => {
            const age = m.age !== undefined ? m.age : (m.birthDate ? calculateAge(m.birthDate) || 0 : 0);
            return acc + age;
          }, 0) / membersWithAge.length
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Manajemen Data Jamaah
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Data jamaah laki-laki (ikhwan) dan perempuan (akhwat) lengkap dengan tanggal lahir & usia.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jamaah Baru</span>
          </button>
        </div>

        {/* Counter Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-lg">
            <span className="text-[11px] font-medium text-slate-500">Total Jamaah</span>
            <div className="text-lg font-bold text-slate-900 tabular-nums">
              {filteredMembers.length} <span className="text-xs font-normal text-slate-400">orang</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
            <span className="text-[11px] font-semibold text-blue-800">Laki-laki (Ikhwan)</span>
            <div className="text-lg font-bold text-blue-700 tabular-nums">
              {totalLaki} <span className="text-xs font-normal text-blue-600">orang</span>
            </div>
          </div>
          <div className="p-3 bg-pink-50/70 border border-pink-100 rounded-lg">
            <span className="text-[11px] font-semibold text-pink-800">Perempuan (Akhwat)</span>
            <div className="text-lg font-bold text-pink-700 tabular-nums">
              {totalPerempuan} <span className="text-xs font-normal text-pink-600">orang</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
            <span className="text-[11px] font-semibold text-indigo-800">Data Usia Jamaah</span>
            <div className="text-lg font-bold text-indigo-700 tabular-nums">
              {avgAge ? `${avgAge} thn` : `${membersWithAge.length} terdata`}
              <span className="text-xs font-normal text-indigo-600 ml-1">
                {avgAge ? `(rata-rata)` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Gender Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setGenderFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              genderFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({allMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('L')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              genderFilter === 'L'
                ? 'bg-white text-blue-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Laki-laki ({totalLaki})
          </button>
          <button
            type="button"
            onClick={() => setGenderFilter('P')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              genderFilter === 'P'
                ? 'bg-white text-pink-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Perempuan ({totalPerempuan})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Group Filter for Master */}
          {isMaster && (
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">Semua Kelompok</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, usia, hp..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Jamaah List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Jamaah</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Tgl Lahir & Usia</th>
                {isMaster && <th className="py-3 px-4">Kelompok / Masjid</th>}
                <th className="py-3 px-4">No. HP / WA</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={isMaster ? 9 : 8}
                    className="py-10 text-center text-slate-400 text-xs"
                  >
                    Tidak ada data jamaah yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member, idx) => {
                  const grp = groups.find((g) => g.id === member.groupId);
                  const effectiveAge =
                    member.age !== undefined
                      ? member.age
                      : member.birthDate
                      ? calculateAge(member.birthDate)
                      : null;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 text-center tabular-nums text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {member.name}
                        </div>
                        {member.address && (
                          <div className="text-[11px] text-slate-400">
                            {member.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            member.gender === 'L'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-pink-50 text-pink-800 border border-pink-200'
                          }`}
                        >
                          {member.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-600">
                        {member.category || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {effectiveAge !== null || member.birthDate ? (
                          <div className="space-y-0.5">
                            {effectiveAge !== null && (
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {effectiveAge} thn
                              </span>
                            )}
                            {member.birthDate && (
                              <div className="text-[11px] text-slate-500 tabular-nums">
                                {formatIndonesianBirthDate(member.birthDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">-</span>
                        )}
                      </td>
                      {isMaster && (
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-medium text-slate-800">
                            {grp?.name || member.groupId}
                          </span>
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-600 tabular-nums">
                        {member.phone || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            member.isActive ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          {member.isActive ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                            title="Edit data jamaah"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(member)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus jamaah"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Jamaah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingMember ? 'Edit Data Jamaah' : 'Tambah Jamaah Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Data jamaah tersimpan langsung di database kelompok
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Jamaah *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: H. Ahmad Subagio / Siti Aminah"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gender: e.target.value as Gender,
                        category: e.target.value === 'L' ? 'bapak' : 'ibu',
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="L">Laki-laki (Ikhwan)</option>
                    <option value="P">Perempuan (Akhwat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Jamaah
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {formData.gender === 'L' ? (
                      <>
                        <option value="bapak">Bapak-bapak</option>
                        <option value="pemuda">Pemuda</option>
                      </>
                    ) : (
                      <>
                        <option value="ibu">Ibu-ibu</option>
                        <option value="pemudi">Remaja Putri / Pemudi</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Tanggal Lahir & Usia */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tanggal Lahir
                    </label>
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const calcAge = calculateAge(newDate);
                      setFormData({
                        ...formData,
                        birthDate: newDate,
                        age: calcAge !== null ? String(calcAge) : formData.age,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Format: Hari/Bulan/Tahun
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Usia (Tahun)
                    </label>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      Otomatis/Manual
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="130"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Contoh: 35"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formData.birthDate && calculateAge(formData.birthDate) !== null
                      ? `Terhitung: ${calculateAge(formData.birthDate)} tahun`
                      : 'Isi jika tgl lahir belum ada'}
                  </span>
                </div>
              </div>

              {/* Group selection if master */}
              {isMaster && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelompok / Masjid *
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} - {g.masjidName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Jamaah
                  </label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.value === 'true' })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Non-aktif / Pindah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat / Catatan Khusus
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="RT/RW atau peran di kepengurusan"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Jamaah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
