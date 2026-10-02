import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { RoleBadge } from '../../components/ui/Badge';
import { employeeService, EmployeeWithRelations } from '../../services/employeeService';
import { profileService } from '../../services/profileService';
import { ProfileRow } from '../../types/database.types';

export const EmployeesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empData, profData] = await Promise.all([
        employeeService.getEmployees(),
        profileService.getActiveProfiles(),
      ]);
      setEmployees(empData);
      setProfiles(profData);
    } catch (err) {
      console.warn('Failed loading employee directory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Merge employees with profiles
  const displayList = employees.length > 0
    ? employees.map((emp) => ({
        id: emp.id,
        name: emp.full_name,
        nip: emp.nip || '—',
        email: emp.email || '—',
        department: (emp.departments as { name?: string } | null)?.name || 'Satuan Pendidikan',
        position: (emp.positions as { name?: string } | null)?.name || 'Tenaga Pendidik',
        role: profiles.find((p) => p.id === emp.profile_id)?.role || 'employee',
        phone: emp.phone || '—',
      }))
    : profiles.map((prof) => ({
        id: prof.id,
        name: prof.full_name || 'Pegawai',
        nip: '—',
        email: '—',
        department: 'SMK Negeri 1 Luwu Timur',
        position: prof.role === 'admin' ? 'Administrator' : prof.role === 'headmaster' ? 'Kepala Sekolah' : 'Guru / Pegawai',
        role: prof.role,
        phone: '—',
      }));

  const filteredList = displayList.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nip.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Manajemen Pengguna
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] mt-0.5">
              Data Pegawai & Guru
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Daftar tenaga pendidik dan kependidikan terdaftar di sistem presensi
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={loadData}
              disabled={isLoading}
            >
              Segarkan
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => alert('Modul pembuatan akun pegawai oleh administrator akan diimplementasikan pada Phase 6.')}
            >
              Tambah Pegawai
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, email, atau NIP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] placeholder:text-[#9CA3AF]"
          />
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Pegawai</th>
                <th className="py-3 px-4">NIP / Jabatan</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Hak Akses</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6B7280]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs">Memuat data pegawai dari database...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6B7280]">
                    <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-[#111827]">Tidak Ada Data Pegawai</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
                      Data pegawai akan bertambah seiring pengguna login atau didaftarkan administrator.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#FFF7ED] border border-orange-200 text-[#F97316] font-bold flex items-center justify-center shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#111827]">{item.name}</p>
                          <p className="text-[#6B7280]">{item.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <p className="font-semibold text-[#111827]">{item.nip}</p>
                      <p className="text-[11px] text-[#6B7280]">{item.position}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-[#111827]">{item.email}</p>
                      <p className="text-[#6B7280] text-[11px]">{item.phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <RoleBadge role={item.role} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
