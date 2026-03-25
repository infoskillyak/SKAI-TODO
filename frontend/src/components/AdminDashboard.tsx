import { useState, useEffect } from 'react';
import { Users, Shield, CreditCard, Activity, Search, UserPlus, Trash2, Edit, X, Check, AlertTriangle } from 'lucide-react';
import { adminApi } from '../services/adminService';
import type { User as UserType, AdminStats } from '../services/adminService';

interface UserData extends UserType {
  isEditing?: boolean;
  editRole?: string;
  editPlan?: string;
}

const initialStats: AdminStats = {
  totalUsers: 0,
  activeUsers: 0,
  usersByPlan: [],
  usersByRole: [],
  mrr: 0,
};

export function AdminDashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'users' | 'organizations' | 'billing'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [stats, setStats] = useState<AdminStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [editOrgId, setEditOrgId] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'USER', orgId: '' });
  const [newOrg, setNewOrg] = useState({ name: '', id: '' });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Fetch users when search changes
  useEffect(() => {
    if (activeTab === 'users') {
      const debounce = setTimeout(() => {
        fetchUsers(searchQuery);
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [searchQuery, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'users') {
        const [statsData, usersData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getUsers(),
        ]);
        setStats(statsData);
        setUsers(usersData.users || []);
      } else if (activeTab === 'organizations') {
        const orgs = await adminApi.getOrganizations();
        setOrganizations(orgs || []);
      } else if (activeTab === 'billing') {
        const billing = await adminApi.getOrgBilling();
        setBillingInfo(billing);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch administrative data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (search?: string) => {
    try {
      const response = await adminApi.getUsers({ search });
      setUsers(response.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user.id);
    setEditRole(user.role);
    setEditPlan(user.plan);
    setEditOrgId(user.orgId || '');
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      await adminApi.updateUser(userId, {
        role: editRole as any,
        plan: editPlan as any,
        orgId: editOrgId || null,
      });
      setEditingUser(null);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert(error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminApi.deleteUser(userId);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createOrganization(newOrg);
      setIsOrgModalOpen(false);
      setNewOrg({ name: '', id: '' });
      fetchData();
    } catch (error) {
      alert('Failed to create organization');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createUser(newUser);
      setIsUserModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'USER', orgId: '' });
      fetchData();
    } catch (error) {
      alert('Failed to create user');
    }
  };

  const handleUpdateOrgPlan = async (orgId: string, plan: string) => {
    try {
      await adminApi.updateOrgPlan({ orgId, plan });
      fetchData();
    } catch (error) {
      alert('Failed to update organization plan');
    }
  };

  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editOrgName, setEditOrgName] = useState('');

  const handleEditOrg = (org: any) => {
    setEditingOrg(org.id);
    setEditOrgName(org.name);
  };

  const handleSaveOrgEdit = async (orgId: string) => {
    try {
      await adminApi.updateOrganization(orgId, { name: editOrgName });
      setEditingOrg(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update organization:', error);
      alert('Failed to update organization');
    }
  };

  const handleCancelOrgEdit = () => {
    setEditingOrg(null);
    setEditOrgName('');
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization? This will also delete all users in the organization.')) return;

    try {
      await adminApi.deleteOrganization(orgId);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Failed to delete organization:', error);
      alert('Failed to delete organization');
    }
  };

  const adminStats = [
    { label: 'Total Users', value: stats.totalUsers.toString(), icon: Users, color: 'text-blue-400' },
    { label: 'Active Now', value: stats.activeUsers.toString(), icon: Activity, color: 'text-green-400' },
    { label: 'Team Plans', value: stats.usersByPlan.find(p => p.plan === 'TEAM')?.count.toString() || '0', icon: Shield, color: 'text-emerald-400' },
    { label: 'MRR', value: `$${stats.mrr.toFixed(2)}`, icon: CreditCard, color: 'text-emerald-400' },
  ];

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
          Admin Command Center
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-slate-500">Manage your multi-tenant environment and billing</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${user?.role === 'SUPERADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
            {user?.role} Mode
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertTriangle size={20} />
          <div>
            <p className="font-bold text-sm">Access Denied or System Error</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
          <button onClick={() => fetchData()} className="ml-auto text-xs font-bold underline bg-red-500/20 px-3 py-1 rounded">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-800/40 p-1 rounded-lg w-max border border-slate-700/50">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Users
        </button>
        {user?.role?.toUpperCase() === 'SUPERADMIN' && (
          <button
            onClick={() => setActiveTab('organizations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'organizations' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Organizations
          </button>
        )}
        <button
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'billing' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
        >
          System Billing
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {adminStats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className={s.color} />
                    <span className="text-xs text-slate-500 font-medium">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                </div>
              );
            })}
          </div>

          {/* User Management Table */}
          <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/30">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Users size={16} /> User Management
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-3 py-1.5 border border-slate-700/50">
                  <Search size={14} className="text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="bg-transparent text-sm text-slate-300 placeholder-slate-500 outline-none w-48"
                  />
                </div>
                {user?.role?.toUpperCase() === 'SUPERADMIN' && (
                  <button
                    onClick={() => setIsUserModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <UserPlus size={14} /> Add User
                  </button>
                )}
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30 text-xs text-slate-500 uppercase tracking-wider bg-slate-800/20">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Org ID</th>
                  <th className="text-right p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-700/20 hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {editingUser === user.id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                          <option value="SUPERADMIN">Super Admin</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded ${user.role === 'ADMIN' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {editingUser === user.id ? (
                        <select
                          value={editPlan}
                          onChange={(e) => setEditPlan(e.target.value)}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="FREE">Free</option>
                          <option value="PRO">Pro</option>
                          <option value="TEAM">Team</option>
                          <option value="ENTERPRISE">Enterprise</option>
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">{user.plan}</span>
                      )}
                    </td>
                    <td className="p-4">
                      {editingUser === user.id ? (
                        <select
                          value={editOrgId}
                          onChange={(e) => setEditOrgId(e.target.value)}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="">No Organization</option>
                          {organizations.map(org => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono">{user.orgId?.split('-')[0] || 'None'}...</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingUser === user.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleSaveEdit(user.id)} className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors">
                              <Check size={18} />
                            </button>
                            <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300 transition-colors">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditUser(user)} className="text-slate-500 hover:text-slate-300"><Edit size={16} /></button>
                        )}
                        <button onClick={() => handleDeleteUser(user.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'organizations' && (
        <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/30">
            <h2 className="text-base font-semibold text-white">Organization Management</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/30 text-xs text-slate-500 uppercase tracking-wider bg-slate-800/20">
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Org ID</th>
                <th className="text-left p-4 font-medium">Billing Plan</th>
                <th className="text-left p-4 font-medium">Users</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-b border-slate-700/20">
                  <td className="p-4 text-sm font-medium text-slate-200">{org.name}</td>
                  <td className="p-4 text-xs text-slate-500 font-mono">{org.id}</td>
                  <td className="p-4">
                    <select
                      value={org.billingPlan}
                      onChange={(e) => handleUpdateOrgPlan(org.id, e.target.value)}
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="FREE">Free</option>
                      <option value="PRO">Pro</option>
                      <option value="TEAM">Team</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </td>
                  <td className="p-4 text-sm text-slate-400">{org._count.users}</td>
                  <td className="p-4 text-right">
                    {editingOrg === org.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input
                          type="text"
                          value={editOrgName}
                          onChange={(e) => setEditOrgName(e.target.value)}
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 w-24"
                        />
                        <button onClick={() => handleSaveOrgEdit(org.id)} className="text-green-500 hover:text-green-400"><Check size={14} /></button>
                        <button onClick={handleCancelOrgEdit} className="text-red-500 hover:text-red-400"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleEditOrg(org)} className="text-slate-500 hover:text-slate-300"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteOrg(org.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-800/20">
            {user?.role?.toUpperCase() === 'SUPERADMIN' && (
              <button
                onClick={() => setIsOrgModalOpen(true)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                + Create New Organization
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'billing' && billingInfo && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Plan Overview</h3>
              <div className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Global Subscription Status</p>
                  <p className="text-xl font-bold text-white uppercase">{billingInfo.plan}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-skai-card)] border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Usage Limits</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">User Slots</span>
                    <span className="text-white">{billingInfo.usage.users} / {billingInfo.limits.maxUsers}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${(billingInfo.usage.users / billingInfo.limits.maxUsers) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Task Limit</span>
                    <span className="text-white">{billingInfo.usage.tasks} / {billingInfo.limits.maxTasks}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min((billingInfo.usage.tasks / billingInfo.limits.maxTasks) * 100, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[var(--color-skai-accent)]/20 to-blue-500/20 border border-[var(--color-skai-accent)]/30 rounded-xl p-6">
            <h3 className="font-bold text-white mb-2">Pro-Tip</h3>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              "Moving organizations to the TEAM plan enables organization-wide task sharing and advanced AI prioritization."
            </p>
            <div className="mt-8">
              <button className="w-full bg-white text-slate-900 py-2 rounded-lg font-bold text-sm shadow-lg shadow-cyan-500/20">
                Upgrade My Plan
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modals */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Add New User</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPERADMIN">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Org ID</label>
                  <select
                    required
                    value={newUser.orgId}
                    onChange={(e) => setNewUser({ ...newUser, orgId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-2 rounded-lg mt-6 shadow-lg shadow-cyan-500/20">
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {isOrgModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Create Organization</h3>
              <button onClick={() => setIsOrgModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Custom ID (Optional)</label>
                <input
                  type="text"
                  value={newOrg.id}
                  onChange={(e) => setNewOrg({ ...newOrg, id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white"
                  placeholder="org_acme"
                />
              </div>
              <button type="submit" className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 rounded-lg mt-6 shadow-lg shadow-blue-500/20">
                Create Organization
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

