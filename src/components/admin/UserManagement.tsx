import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import {
  apiAdminGetUsers,
  apiAdminCreateUser,
  apiAdminUpdateUser,
  apiAdminSetUserStatus,
  apiAdminExtendLicense,
  apiAdminDeleteUser,
  apiAdminGetUserMachines,
  apiAdminRemoveMachine,
  apiAdminResetMachines,
  apiAdminSetMaxMachines
} from '../../lib/api';
import { formatDate, formatDateTime } from '../../lib/utils';
import { useToast } from '../ui/Toast';
import {
  Search,
  UserPlus,
  Edit2,
  Calendar,
  Lock,
  Unlock,
  Trash2,
  Shield,
  User as UserIcon,
  RefreshCw,
  X,
  Laptop,
  AlertTriangle,
  RotateCcw,
  Save,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Pagination state (20 users / page)
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [extendUser, setExtendUser] = useState<any | null>(null);
  const [lockUser, setLockUser] = useState<any | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Machine Management Modal states
  const [machineUser, setMachineUser] = useState<any | null>(null);
  const [userMachines, setUserMachines] = useState<any[]>([]);
  const [machineLoading, setMachineLoading] = useState<boolean>(false);
  const [maxMachinesInput, setMaxMachinesInput] = useState<number>(1);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState<boolean>(false);

  // Create Form states
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newMonths, setNewMonths] = useState(1);

  const [extendMonths, setExtendMonths] = useState(1);
  const [extendDays, setExtendDays] = useState<number | null>(null); // <-- Thêm dòng này
  const [lockReason, setLockReason] = useState('Vi phạm quy định sử dụng tool');

  const { showToast } = useToast();

  const fetchUsers = async (targetPage: number = page) => {
    setLoading(true);
    try {
      const res = await apiAdminGetUsers(search, statusFilter, roleFilter, targetPage, 20);
      setUsers(res.users);
      setTotalCount(res.total);
      setTotalPages(res.total_pages || 1);
      setPage(res.page || 1);
    } catch (err: any) {
      showToast('Không thể tải danh sách tài khoản', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, [statusFilter, roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1);
  };

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      showToast('Vui lòng nhập tài khoản và mật khẩu', 'error');
      return;
    }

    try {
      await apiAdminCreateUser({
        username: newUsername,
        password: newPassword,
        full_name: newFullName,
        email: newEmail,
        phone: newPhone,
        role: newRole,
        initial_months: newMonths
      });
      showToast(`Đã tạo thành công tài khoản ${newUsername}`, 'success');
      setIsCreateOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewFullName('');
      setNewEmail('');
      setNewPhone('');
      fetchUsers(1);
    } catch (err: any) {
      showToast(err.message || 'Tạo tài khoản thất bại', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    try {
      await apiAdminUpdateUser(editUser.id, {
        full_name: editUser.full_name,
        email: editUser.email,
        phone: editUser.phone,
        role: editUser.role,
        note: editUser.note,
        max_machines: editUser.max_machines
      });
      showToast('Cập nhật tài khoản thành công', 'success');
      setEditUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Cập nhật thất bại', 'error');
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendUser) return;

    try {
      // Truyền thêm extendDays vào API
      await apiAdminExtendLicense(extendUser.id, extendMonths, extendDays || undefined);
      
      const actionText = extendDays ? `Test ${extendDays} ngày` : `${extendMonths} tháng`;
      showToast(`Đã gia hạn thành công ${actionText} cho ${extendUser.username}`, 'success');
      
      setExtendUser(null);
      setExtendDays(null); // Reset lại state
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Gia hạn thất bại', 'error');
    }
  };

  const handleLockToggle = async (userId: string, currentStatus: number) => {
    if (currentStatus === 1) {
      const target = users.find(u => u.id === userId);
      setLockUser(target);
    } else {
      try {
        await apiAdminSetUserStatus(userId, 1);
        showToast('Đã mở khoá tài khoản thành công', 'success');
        fetchUsers();
      } catch (err: any) {
        showToast(err.message || 'Mở khoá thất bại', 'error');
      }
    }
  };

  const handleConfirmLock = async () => {
    if (!lockUser) return;
    try {
      await apiAdminSetUserStatus(lockUser.id, 0, lockReason);
      showToast(`Đã khoá tài khoản ${lockUser.username}`, 'success');
      setLockUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Khoá tài khoản thất bại', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUserId) return;
    try {
      await apiAdminDeleteUser(deleteUserId);
      showToast('Đã xoá tài khoản thành công', 'success');
      setDeleteUserId(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Xoá thất bại', 'error');
    }
  };

  // Machine Management handlers
  const handleOpenMachines = async (user: any) => {
    setMachineUser(user);
    setMaxMachinesInput(user.max_machines || 1);
    setMachineLoading(true);
    try {
      const list = await apiAdminGetUserMachines(user.username);
      setUserMachines(list);
    } catch (err: any) {
      showToast('Không thể tải danh sách thiết bị', 'error');
    } finally {
      setMachineLoading(false);
    }
  };

  const handleRemoveSingleMachine = async (machineId: string) => {
    if (!machineUser) return;
    try {
      await apiAdminRemoveMachine(machineUser.username, machineId);
      showToast('Đã gỡ thiết bị khỏi tài khoản', 'success');
      const list = await apiAdminGetUserMachines(machineUser.username);
      setUserMachines(list);
    } catch (err: any) {
      showToast(err.message || 'Gỡ thiết bị thất bại', 'error');
    }
  };

  const handleResetAllMachines = async () => {
    if (!machineUser) return;
    try {
      await apiAdminResetMachines(machineUser.username);
      showToast('Đã đặt lại toàn bộ thiết bị', 'success');
      setIsConfirmResetOpen(false);
      const list = await apiAdminGetUserMachines(machineUser.username);
      setUserMachines(list);
    } catch (err: any) {
      showToast(err.message || 'Đặt lại thiết bị thất bại', 'error');
    }
  };

  const handleSaveMaxMachines = async () => {
    if (!machineUser) return;
    try {
      await apiAdminSetMaxMachines(machineUser.username, maxMachinesInput);
      showToast(`Đã cập nhật số máy tối đa thành ${maxMachinesInput}`, 'success');
      fetchUsers();
    } catch (err: any) {
      showToast(err.message || 'Cập nhật thất bại', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in font-sans">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Quản Lý Người Dùng & Bản Quyền</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Quản trị viên có toàn quyền thêm, sửa, gia hạn, quản lý máy HWID, khoá hoặc xoá tài khoản
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm User Mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo username, họ tên, email hoặc SĐT..."
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </form>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="1">Đang hoạt động</option>
            <option value="0">Đang bị khoá</option>
          </select>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="user">User thường</option>
            <option value="admin">Quản trị viên (Admin)</option>
          </select>

          <button
            onClick={() => fetchUsers(page)}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="py-3.5 px-4 font-medium">Tài Khoản</th>
                <th className="py-3.5 px-4 font-medium">Họ Tên / Liên Hệ</th>
                <th className="py-3.5 px-4 font-medium">Vai Trò</th>
                <th className="py-3.5 px-4 font-medium">Trạng Thái</th>
                <th className="py-3.5 px-4 font-medium">Ngày Hết Hạn</th>
                <th className="py-3.5 px-4 font-medium text-center">Còn Lại</th>
                <th className="py-3.5 px-4 font-medium">IP Đăng Ký / Login</th>
                <th className="py-3.5 px-4 font-medium text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    Không tìm thấy tài khoản nào khớp với điều kiện lọc
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isLicExpired = u.license ? u.license.is_expired : true;
                  const daysLeft = u.license ? u.license.days_left : 0;

                  return (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Username */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-200">{u.username}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">
                          Max: {u.max_machines || 1} máy
                        </div>
                      </td>

                      {/* Full Name & Contact */}
                      <td className="py-3 px-4 text-zinc-300">
                        <div className="font-medium text-zinc-200">{u.full_name || '—'}</div>
                        <div className="text-[11px] text-zinc-400">
                          {u.email || ''} {u.phone ? `· ${u.phone}` : ''}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
                            <UserIcon className="w-3 h-3" /> User
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {u.status === 0 ? (
                          <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md" title={u.locked_reason || 'Đang khoá'}>
                            Đã khoá
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* End Date */}
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {u.license ? formatDate(u.license.end_date) : 'Chưa có'}
                      </td>

                      {/* Days Left */}
                      <td className="py-3 px-4 text-center">
                        {isLicExpired ? (
                          <span className="text-[11px] text-rose-400 font-semibold">Hết hạn</span>
                        ) : (
                          <span className="font-mono font-bold text-amber-400">{daysLeft} ngày</span>
                        )}
                      </td>

                      {/* Register IP & Last Login */}
                      <td className="py-3 px-4 text-[11px] text-zinc-400">
                        <div>ĐK: <span className="font-mono text-zinc-300">{u.register_ip || '127.0.0.1'}</span></div>
                        <div className="font-mono text-zinc-500">
                          Login: {u.last_login_at ? formatDateTime(u.last_login_at) : 'Chưa đăng nhập'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quản lý máy */}
                          <button
                            onClick={() => handleOpenMachines(u)}
                            className="p-1.5 text-zinc-400 hover:text-sky-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Quản lý máy (HWID Machine)"
                          >
                            <Laptop className="w-4 h-4" />
                          </button>

                          {/* Gia hạn */}
                          <button
                            onClick={() => setExtendUser(u)}
                            className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Gia hạn license"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>

                          {/* Chỉnh sửa */}
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Khoá / Mở khoá */}
                          <button
                            onClick={() => handleLockToggle(u.id, u.status)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.status === 0
                                ? 'text-amber-400 hover:bg-zinc-800'
                                : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-800'
                            }`}
                            title={u.status === 0 ? 'Mở khoá tài khoản' : 'Khoá tài khoản'}
                          >
                            {u.status === 0 ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>

                          {/* Xoá */}
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => setDeleteUserId(u.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Xoá tài khoản (Soft Delete)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div>
            Hiển thị <span className="text-zinc-200 font-semibold">{users.length}</span> / <span className="text-zinc-200 font-semibold">{totalCount}</span> tài khoản (Trang {page}/{totalPages})
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(page - 1)}
              disabled={page <= 1}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl disabled:opacity-30 hover:border-zinc-700 transition-colors"
              title="Trang trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-zinc-300">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => fetchUsers(page + 1)}
              disabled={page >= totalPages}
              className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl disabled:opacity-30 hover:border-zinc-700 transition-colors"
              title="Trang sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Quản Lý Máy HWID Machine */}
      {machineUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setMachineUser(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Quản Lý Máy: <span className="text-amber-400">{machineUser.username}</span>
                </h3>
                <p className="text-xs text-zinc-400">Danh sách thiết bị kết nối và giới hạn số máy tối đa</p>
              </div>
            </div>

            {/* Set max machines form */}
            <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800/80 mb-4 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-zinc-200">Giới Hạn Số Máy Tối Đa (max_machines)</div>
                <div className="text-[11px] text-zinc-500">Số máy đồng thời được phép chạy tool automation</div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxMachinesInput}
                  onChange={e => setMaxMachinesInput(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-center font-mono text-zinc-100 font-semibold"
                />
                <button
                  type="button"
                  onClick={handleSaveMaxMachines}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl flex items-center gap-1 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu</span>
                </button>
              </div>
            </div>

            {/* Machines list */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">
                  Danh Sách Thiết Bị ({userMachines.length} máy)
                </span>
                {userMachines.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmResetOpen(true)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Toàn Bộ Máy</span>
                  </button>
                )}
              </div>

              {machineLoading ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Đang tải danh sách thiết bị...
                </div>
              ) : userMachines.length === 0 ? (
                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-xs text-zinc-500">
                  Tài khoản này chưa ghép nối máy nào trên tool desktop.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {userMachines.map((m: any, idx: number) => (
                    <div
                      key={m.machine_id || idx}
                      className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-mono text-amber-400 font-semibold">
                          {m.machine_id}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          IP: {m.ip_address || '—'} · {m.label || m.note || 'Thiết bị Windows'}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          Lần cuối: {m.last_seen_at ? formatDateTime(m.last_seen_at) : 'Gần đây'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSingleMachine(m.machine_id)}
                        className="px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 rounded-lg transition-colors"
                      >
                        Gỡ máy
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-5">
              <button
                type="button"
                onClick={() => setMachineUser(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Create Account */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Thêm Người Dùng Mới</h3>
                <p className="text-xs text-zinc-400">Khởi tạo tài khoản và license ban đầu</p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Username *</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="Tên đăng nhập"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Mật Khẩu *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu khởi tạo"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Họ Và Tên</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="Họ tên người dùng"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="Email liên hệ"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Số Điện Thoại</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="SĐT"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Vai Trò</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
                  >
                    <option value="user">User thường</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Số Tháng License</label>
                  <input
                    type="number"
                    min="0"
                    max="36"
                    value={newMonths}
                    onChange={e => setNewMonths(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit User */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setEditUser(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-zinc-100 mb-4">
              Sửa Thông Tin: <span className="text-amber-400">{editUser.username}</span>
            </h3>

            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Họ Và Tên</label>
                <input
                  type="text"
                  value={editUser.full_name || ''}
                  onChange={e => setEditUser({ ...editUser, full_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    value={editUser.email || ''}
                    onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Số Điện Thoại</label>
                  <input
                    type="tel"
                    value={editUser.phone || ''}
                    onChange={e => setEditUser({ ...editUser, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Vai Trò</label>
                  <select
                    value={editUser.role}
                    onChange={e => setEditUser({ ...editUser, role: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
                  >
                    <option value="user">User thường</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">Số Máy Tối Đa (max_machines)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editUser.max_machines || 1}
                    onChange={e => setEditUser({ ...editUser, max_machines: Number(e.target.value) })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Ghi Chú</label>
                <textarea
                  value={editUser.note || ''}
                  onChange={e => setEditUser({ ...editUser, note: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl"
                >
                  Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Extend License */}
      {extendUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setExtendUser(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-zinc-100 mb-1">Gia Hạn License Thủ Công</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Cộng thêm thời gian sử dụng cho tài khoản <span className="text-amber-400 font-semibold">{extendUser.username}</span>
            </p>

            <form onSubmit={handleExtend} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1.5 font-medium">Số Tháng Gia Hạn</label>
                <select
                  value={extendMonths}
                  disabled={!!extendDays} // Vô hiệu hóa nếu đang chọn Test Ngày
                  onChange={e => setExtendMonths(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-zinc-100 font-medium disabled:opacity-50"
                >
                  <option value={1}>1 Tháng (30 ngày)</option>
                  <option value={3}>3 Tháng (90 ngày)</option>
                  <option value={6}>6 Tháng (180 ngày)</option>
                  <option value={12}>1 Năm (365 ngày)</option>
                </select>
              </div>

              {/* THÊM 2 NÚT TEST VÀO ĐÂY */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExtendDays(1)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    extendDays === 1 
                      ? 'bg-amber-500 text-zinc-950 border-amber-500' 
                      : 'bg-zinc-900 text-amber-400 border-zinc-700 hover:border-amber-500'
                  }`}
                >
                  Test 1 Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setExtendDays(3)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    extendDays === 3 
                      ? 'bg-amber-500 text-zinc-950 border-amber-500' 
                      : 'bg-zinc-900 text-amber-400 border-zinc-700 hover:border-amber-500'
                  }`}
                >
                  Test 3 Ngày
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                {extendDays 
                  ? `Đang chọn gia hạn Test ${extendDays} ngày.` 
                  : 'Nếu còn hạn, hệ thống sẽ tự động cộng tiếp từ ngày hết hạn hiện tại.'}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setExtendUser(null); setExtendDays(null); }}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl"
                >
                  Xác Nhận Gia Hạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Lock Account with Reason */}
      {lockUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setLockUser(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-200 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-zinc-100">Khoá Tài Khoản {lockUser.username}</h3>
            <p className="text-xs text-zinc-400 mt-0.5 mb-4">
              Tài khoản bị khoá sẽ không thể đăng nhập trên tool lẫn web app.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 mb-1 font-medium">Lý Do Khoá</label>
                <input
                  type="text"
                  value={lockReason}
                  onChange={e => setLockReason(e.target.value)}
                  placeholder="Nhập lý do khoá"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLockUser(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLock}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl"
                >
                  Khoá Tài Khoản
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Delete Confirm */}
      {deleteUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-zinc-100">Xác Nhận Xoá Người Dùng?</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-5">
              Hành động này sẽ xoá mềm tài khoản (delflag=true). Bạn có chắc chắn muốn tiếp tục?
            </p>

            <div className="flex justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setDeleteUserId(null)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl"
              >
                Xác Nhận Xoá
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Reset All Machines Confirm */}
      {isConfirmResetOpen && machineUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <RotateCcw className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-zinc-100">Reset Toàn Bộ Thiết Bị?</h3>
            <p className="text-xs text-zinc-400 mt-1 mb-5">
              Bạn có chắc chắn muốn gỡ toàn bộ thiết bị đã đăng ký của tài khoản <span className="text-amber-400 font-semibold">{machineUser.username}</span>? Người dùng sẽ có thể đăng ký máy mới ở lần đăng nhập tiếp theo trên tool desktop.
            </p>

            <div className="flex justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setIsConfirmResetOpen(false)}
                className="px-4 py-2 text-zinc-400 hover:text-zinc-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetAllMachines}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Xác Nhận Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
