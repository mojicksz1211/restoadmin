import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Shield, Key, Search, UserPlus,
  MoreVertical, Check, ShieldCheck,
  Clock, Loader2, X, Trash2, Edit, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, Mail, ChevronRight
} from 'lucide-react';
import { SystemUser, Role, AuthUser } from '../types';
import {
  getUsers,
  getRoles,
  createUser,
  updateUser,
  deleteUser,
  createRole,
  updateRole,
  deleteRole,
  CreateUserPayload,
  UpdateUserPayload,
  CreateRolePayload,
  UpdateRolePayload,
} from '../services/userManagementService';
import { getBranchOptions } from '../services/branchService';
import type { BranchOption } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionGate } from '../components/PermissionGate';
import { PERMISSION_LEVELS } from '../utils/permissions';
import { getMe } from '../services/authService';

// Color mapping for roles - soft pastel colors matching screenshot style
const getRoleColor = (roleId: string, roleName: string): {
  bg: string;
  tagBg: string;
  tagText: string;
  text: string;
  border: string;
} => {
  const colors: Record<string, { bg: string; tagBg: string; tagText: string; text: string; border: string }> = {
    '1': { // Administrator
      bg: 'bg-purple-50',
      tagBg: 'bg-purple-100',
      tagText: 'text-purple-700',
      text: 'text-slate-900',
      border: 'border-purple-200',
    },
    '2': { // Table-TabletMenu
      bg: 'bg-blue-50',
      tagBg: 'bg-blue-100',
      tagText: 'text-blue-700',
      text: 'text-slate-900',
      border: 'border-blue-200',
    },
    '3': { // Manager
      bg: 'bg-emerald-50',
      tagBg: 'bg-emerald-100',
      tagText: 'text-emerald-700',
      text: 'text-slate-900',
      border: 'border-emerald-200',
    },
    '14': { // Waiter/Waitress
      bg: 'bg-cyan-50',
      tagBg: 'bg-cyan-100',
      tagText: 'text-cyan-700',
      text: 'text-slate-900',
      border: 'border-cyan-200',
    },
    '15': { // Cashier
      bg: 'bg-amber-50',
      tagBg: 'bg-amber-100',
      tagText: 'text-amber-700',
      text: 'text-slate-900',
      border: 'border-amber-200',
    },
    '16': { // Kitchen
      bg: 'bg-orange-50',
      tagBg: 'bg-orange-100',
      tagText: 'text-orange-700',
      text: 'text-slate-900',
      border: 'border-orange-200',
    },
  };

  // Try to get color by ID first, then by role name
  if (colors[roleId]) {
    return colors[roleId];
  }

  // Fallback: assign color based on role name
  const nameLower = roleName.toLowerCase();
  if (nameLower.includes('admin') || nameLower.includes('administrator')) {
    return colors['1'];
  } else if (nameLower.includes('table') || nameLower.includes('tablet')) {
    return colors['2'];
  } else if (nameLower.includes('manager')) {
    return colors['3'];
  } else if (nameLower.includes('waiter') || nameLower.includes('waitress')) {
    return colors['14'];
  } else if (nameLower.includes('cashier')) {
    return colors['15'];
  } else if (nameLower.includes('kitchen') || nameLower.includes('chef')) {
    return colors['16'];
  }

  // Default: use a hash-based color for unknown roles
  const hash = roleId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const defaultColors: { bg: string; tagBg: string; tagText: string; text: string; border: string }[] = [
    { bg: 'bg-indigo-50', tagBg: 'bg-indigo-100', tagText: 'text-indigo-700', text: 'text-slate-900', border: 'border-indigo-200' },
    { bg: 'bg-pink-50', tagBg: 'bg-pink-100', tagText: 'text-pink-700', text: 'text-slate-900', border: 'border-pink-200' },
    { bg: 'bg-teal-50', tagBg: 'bg-teal-100', tagText: 'text-teal-700', text: 'text-slate-900', border: 'border-teal-200' },
    { bg: 'bg-rose-50', tagBg: 'bg-rose-100', tagText: 'text-rose-700', text: 'text-slate-900', border: 'border-rose-200' },
  ];
  return defaultColors[hash % defaultColors.length];
};

const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  
  // Get current user permissions
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getMe();
        setCurrentUser(user);
      } catch (err) {
        console.error('Failed to load current user:', err);
      }
    };
    loadCurrentUser();
  }, []);
  
  const { isAdmin, canManageUsers } = usePermissions(currentUser);
  
  // SweetAlert-style dialogs
  const [swal, setSwal] = useState<{
    type: 'question' | 'success' | 'error' | 'warning';
    title: string;
    text: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  } | null>(null);

  // User modal: null = closed, 'add' = add, user id = edit
  const [userModalMode, setUserModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState<Partial<CreateUserPayload>>({
    firstname: '', lastname: '', username: '', email: '', password: '', passwordConfirm: '',
    roleId: '', branch_id: '', table_id: undefined,
  });
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);

  // Role modal
  const [roleModalMode, setRoleModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<Partial<CreateRolePayload>>({ name: '', description: '', permissions: [] });
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleFormError, setRoleFormError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'role'; id: string; name: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
      const branchRes = await getBranchOptions();
      setBranchOptions(branchRes.options.filter(o => o.value !== 'all'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort users by latest activity (most recent first)
  const filteredUsers = useMemo(() => {
    const filtered = users.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort by latest activity (most recent first)
    return filtered.sort((a, b) => {
      // Parse lastActive dates for sorting
      const parseDate = (dateStr: string): number => {
        if (!dateStr) return 0;
        
        // Handle "X hour(s) ago", "X minute(s) ago", etc.
        if (dateStr.toLowerCase().includes('ago')) {
          const hoursMatch = dateStr.match(/(\d+)\s*hour/i);
          if (hoursMatch) {
            return Date.now() - parseInt(hoursMatch[1]) * 60 * 60 * 1000;
          }
          const minutesMatch = dateStr.match(/(\d+)\s*minute/i);
          if (minutesMatch) {
            return Date.now() - parseInt(minutesMatch[1]) * 60 * 1000;
          }
          const daysMatch = dateStr.match(/(\d+)\s*day/i);
          if (daysMatch) {
            return Date.now() - parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
          }
          // If it says "ago" but we can't parse, treat as very recent
          return Date.now();
        }
        
        // Handle date strings like "1/27/2026", "4/12/2024" (M/D/YYYY)
        const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          const [, month, day, year] = dateMatch;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
        }
        
        // Try parsing as ISO date or standard date format
        const parsed = Date.parse(dateStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
        
        // Unknown format, put at bottom
        return 0;
      };
      
      const dateA = parseDate(a.lastActive);
      const dateB = parseDate(b.lastActive);
      
      // Sort descending (most recent first)
      // If dates are equal or both 0, maintain original order
      if (dateA === dateB) return 0;
      return dateB - dateA;
    });
  }, [users, searchTerm]);
  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddUser = () => {
    if (roles.length === 0) {
      setError('Please wait for roles to load before creating a user.');
      return;
    }
    setEditingUser(null);
    setUserForm({
      firstname: '', lastname: '', username: '', email: '',
      password: '', passwordConfirm: '',
      roleId: roles[0]?.id ?? '', branch_id: '', table_id: undefined,
    });
    setUserFormError(null);
    setUserModalMode('add');
  };

  const openEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setUserForm({
      firstname: user.firstname ?? user.name.split(' ')[0] ?? '',
      lastname: user.lastname ?? user.name.split(' ').slice(1).join(' ') ?? '',
      username: user.username ?? user.email ?? '',
      email: user.email ?? '',
      roleId: user.roleId ?? '',
      branch_id: '',
      table_id: undefined,
    });
    setUserFormError(null);
    setUserModalMode('edit');
  };

  const closeUserModal = () => {
    setUserModalMode(null);
    setEditingUser(null);
    setUserFormError(null);
  };

  const submitUser = async () => {
    setUserFormError(null);
    if (!userForm.firstname?.trim() || !userForm.lastname?.trim() || !userForm.username?.trim()) {
      setUserFormError('First name, last name, and username are required.');
      return;
    }
    if (userModalMode === 'add') {
      if (!userForm.password || userForm.password.length < 4) {
        setUserFormError('Password must be at least 4 characters.');
        return;
      }
      if (userForm.password !== userForm.passwordConfirm) {
        setUserFormError('Passwords do not match.');
        return;
      }
    }
    
    // Show SweetAlert confirmation before submitting
    const actionTitle = userModalMode === 'add' ? 'Create User?' : 'Update User?';
    const actionText = userModalMode === 'add'
      ? `Are you sure you want to create user "${userForm.firstname} ${userForm.lastname}"?`
      : `Are you sure you want to update user "${userForm.firstname} ${userForm.lastname}"?`;
    
    setSwal({
      type: 'question',
      title: actionTitle,
      text: actionText,
      showCancel: true,
      confirmText: 'Yes, Continue',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSwal(null);
        setUserSubmitting(true);
        setError(null);
        setSuccessMessage(null);
        try {
          if (userModalMode === 'add') {
            const selectedRoleId = userForm.roleId || (roles[0]?.id ?? '');
            
            // Only admin can create Administrator accounts
            if (selectedRoleId === '1' && !isAdmin) {
              setSwal({
                type: 'error',
                title: 'Permission Denied',
                text: 'Only administrators can create Administrator accounts.',
                onConfirm: () => setSwal(null),
              });
              setUserSubmitting(false);
              return;
            }
            
            await createUser({
              firstname: userForm.firstname!,
              lastname: userForm.lastname!,
              username: userForm.username!,
              email: userForm.email || undefined,
              password: userForm.password!,
              passwordConfirm: userForm.passwordConfirm!,
              roleId: selectedRoleId,
              branch_id: userForm.branch_id || undefined,
              table_id: userForm.table_id,
            });
            await loadData();
            closeUserModal();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `User "${userForm.firstname} ${userForm.lastname}" created successfully!`,
              onConfirm: () => setSwal(null),
            });
          } else if (editingUser) {
            const selectedRoleId = userForm.roleId || editingUser.roleId || '';
            
            // Only admin can change users to Administrator role
            if (selectedRoleId === '1' && !isAdmin) {
              setSwal({
                type: 'error',
                title: 'Permission Denied',
                text: 'Only administrators can assign Administrator role.',
                onConfirm: () => setSwal(null),
              });
              setUserSubmitting(false);
              return;
            }
            
            await updateUser(editingUser.id, {
              firstname: userForm.firstname!,
              lastname: userForm.lastname!,
              username: userForm.username!,
              email: userForm.email || undefined,
              roleId: selectedRoleId,
              table_id: userForm.table_id,
            });
            await loadData();
            closeUserModal();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `User "${userForm.firstname} ${userForm.lastname}" updated successfully!`,
              onConfirm: () => setSwal(null),
            });
          }
        } catch (e) {
          setSwal({
            type: 'error',
            title: 'Error!',
            text: e instanceof Error ? e.message : 'Request failed',
            onConfirm: () => setSwal(null),
          });
        } finally {
          setUserSubmitting(false);
        }
      },
      onCancel: () => setSwal(null),
    });
  };

  const openAddRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '', permissions: [] });
    setRoleFormError(null);
    setRoleModalMode('add');
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description ?? '',
      permissions: role.permissions ?? [],
    });
    setRoleFormError(null);
    setRoleModalMode('edit');
  };

  const closeRoleModal = () => {
    setRoleModalMode(null);
    setEditingRole(null);
    setRoleFormError(null);
  };

  const submitRole = async () => {
    setRoleFormError(null);
    if (!roleForm.name?.trim()) {
      setRoleFormError('Role name is required.');
      return;
    }
    
    // Show SweetAlert confirmation before submitting
    const actionTitle = roleModalMode === 'add' ? 'Create Role?' : 'Update Role?';
    const actionText = roleModalMode === 'add'
      ? `Are you sure you want to create role "${roleForm.name.trim()}"?`
      : `Are you sure you want to update role "${roleForm.name.trim()}"?`;
    
    setSwal({
      type: 'question',
      title: actionTitle,
      text: actionText,
      showCancel: true,
      confirmText: 'Yes, Continue',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSwal(null);
        setRoleSubmitting(true);
        setError(null);
        setSuccessMessage(null);
        try {
          if (roleModalMode === 'add') {
            await createRole({
              name: roleForm.name.trim(),
              description: roleForm.description || undefined,
              permissions: Array.isArray(roleForm.permissions) && roleForm.permissions.length > 0 ? roleForm.permissions : undefined,
            });
            await loadData();
            closeRoleModal();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `Role "${roleForm.name.trim()}" created successfully!`,
              onConfirm: () => setSwal(null),
            });
          } else if (editingRole) {
            await updateRole(editingRole.id, {
              name: roleForm.name.trim(),
              description: roleForm.description || undefined,
              permissions: Array.isArray(roleForm.permissions) ? roleForm.permissions : [],
            });
            await loadData();
            closeRoleModal();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `Role "${roleForm.name.trim()}" updated successfully!`,
              onConfirm: () => setSwal(null),
            });
          }
        } catch (e) {
          setSwal({
            type: 'error',
            title: 'Error!',
            text: e instanceof Error ? e.message : 'Request failed',
            onConfirm: () => setSwal(null),
          });
        } finally {
          setRoleSubmitting(false);
        }
      },
      onCancel: () => setSwal(null),
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    // Check permissions for deleting users
    if (deleteTarget.type === 'user') {
      const userToDelete = users.find(u => u.id === deleteTarget.id);
      // Only admin can delete Administrator users
      if (userToDelete?.roleId === '1' && !isAdmin) {
        setSwal({
          type: 'error',
          title: 'Permission Denied',
          text: 'Only administrators can delete Administrator accounts.',
          onConfirm: () => {
            setSwal(null);
            setDeleteTarget(null);
          },
        });
        return;
      }
    }
    
    // Only admin can delete roles
    if (deleteTarget.type === 'role' && !isAdmin) {
      setSwal({
        type: 'error',
        title: 'Permission Denied',
        text: 'Only administrators can delete roles.',
        onConfirm: () => {
          setSwal(null);
          setDeleteTarget(null);
        },
      });
      return;
    }
    
    setDeleteSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (deleteTarget.type === 'user') {
        await deleteUser(deleteTarget.id);
        await loadData();
        setDeleteTarget(null);
        setSwal({
          type: 'success',
          title: 'Deleted!',
          text: `User "${deleteTarget.name}" deleted successfully!`,
          onConfirm: () => setSwal(null),
        });
      } else {
        await deleteRole(deleteTarget.id);
        await loadData();
        setDeleteTarget(null);
        setSwal({
          type: 'success',
          title: 'Deleted!',
          text: `Role "${deleteTarget.name}" deleted successfully!`,
          onConfirm: () => setSwal(null),
        });
      }
    } catch (e) {
      setSwal({
        type: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Delete failed',
        onConfirm: () => setSwal(null),
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User & Access</h1>
          <p className="text-slate-500">Manage system administrators, managers, and their permissions.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Users List
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'roles' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Roles & Permissions
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={activeTab === 'users' ? 'Search users...' : 'Search roles...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm"
          />
        </div>
        <PermissionGate user={currentUser} requiredPermissions={canManageUsers ? undefined : PERMISSION_LEVELS.ADMIN}>
          <button
            onClick={activeTab === 'users' ? openAddUser : openAddRole}
            className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
          >
            {activeTab === 'users' ? <UserPlus className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            <span>{activeTab === 'users' ? 'Invite User' : 'Create Role'}</span>
          </button>
        </PermissionGate>
      </div>


      {activeTab === 'users' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Last Activity</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                        <span className="ml-2 text-sm text-slate-500">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="text-red-500 text-sm">
                        <p className="font-medium">Error loading users</p>
                        <p className="text-xs mt-1">{error}</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const role = roles.find(r => r.id === user.roleId);
                    const roleColor = getRoleColor(user.roleId ?? '', role?.name ?? '');
                    const displayEmail = user.email || user.username || user.name.split(' ')[0].toLowerCase();
                    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=40&background=random`;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={avatarUrl}
                              alt={user.name}
                              className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=40&background=random`;
                              }}
                            />
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                              <div className="flex items-center text-[11px] text-slate-400 mt-0.5">
                                <Mail className="w-3 h-3 mr-1" />
                                {displayEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${roleColor.tagBg} ${roleColor.tagText} ${roleColor.border}`}>
                            {role?.name ?? (user.roleId || '—')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-slate-600 font-medium">
                            <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {user.lastActive}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditUser(user)}
                              className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {!(user.roleId === '1' && !isAdmin) && (
                              <button
                                onClick={() => {
                                  setDeleteTarget({ type: 'user', id: user.id, name: user.name });
                                  setSwal({
                                    type: 'question',
                                    title: 'Delete User?',
                                    text: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
                                    showCancel: true,
                                    confirmText: 'Yes, Delete',
                                    cancelText: 'Cancel',
                                    onConfirm: confirmDelete,
                                    onCancel: () => {
                                      setSwal(null);
                                      setDeleteTarget(null);
                                    },
                                  });
                                }}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-slate-100 p-4 rounded-full mb-4">
                          <Users className="w-12 h-12 opacity-20" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">No users found</p>
                        <p className="text-sm">Try widening your search or add a new user.</p>
                        <button
                          onClick={() => setSearchTerm('')}
                          className="mt-4 text-orange-500 font-bold hover:underline"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <p className="text-xs font-medium text-slate-500">
                Showing <span className="text-slate-900 font-bold">{filteredUsers.length}</span> users
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <div className="flex space-x-1">
                <button className="w-8 h-8 rounded-lg bg-orange-500 text-white text-xs font-bold shadow-sm shadow-orange-500/20">1</button>
              </div>
              <button className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : (
            filteredRoles.map((role) => {
              const roleColor = getRoleColor(role.id, role.name);
              return (
              <div key={role.id} className={`group ${roleColor.bg} ${roleColor.border} border-2 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 relative`}>
                {/* Title */}
                <h3 className={`font-bold ${roleColor.text} text-lg mb-1.5`}>{role.name}</h3>
                
                {/* Description */}
                <p className={`${roleColor.text} opacity-70 text-xs mb-3 leading-snug line-clamp-2`}>
                  {role.description || 'Manage permissions and access for this role.'}
                </p>
                
                {/* Permissions as Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {role.permissions.length === 0 ? (
                    <span className={`${roleColor.tagBg} ${roleColor.tagText} px-2 py-1 rounded-full text-[10px] font-medium`}>
                      No permissions
                    </span>
                  ) : role.permissions.includes('all') ? (
                    <span className={`${roleColor.tagBg} ${roleColor.tagText} px-2 py-1 rounded-full text-[10px] font-medium`}>
                      Full Access
                    </span>
                  ) : (
                    role.permissions.slice(0, 4).map((p, i) => (
                      <span
                        key={i}
                        className={`${roleColor.tagBg} ${roleColor.tagText} px-2 py-1 rounded-full text-[10px] font-medium`}
                      >
                        {p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    ))
                  )}
                  {role.permissions.length > 4 && (
                    <span className={`${roleColor.tagBg} ${roleColor.tagText} px-2 py-1 rounded-full text-[10px] font-medium opacity-60`}>
                      +{role.permissions.length - 4} more
                    </span>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/50">
                  <button
                    onClick={() => openEditRole(role)}
                    className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium text-xs transition-colors group/explore"
                  >
                    <span>Edit Role</span>
                    <ArrowRight className="w-3 h-3 group-hover/explore:translate-x-1 transition-transform" />
                  </button>
                  {/* Only admin can delete roles */}
                  {isAdmin ? (
                    <button
                      onClick={() => setDeleteTarget({ type: 'role', id: role.id, name: role.name })}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete Role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="p-1.5 text-slate-300 cursor-not-allowed" title="Admin only">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      {/* User modal */}
      {userModalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {userModalMode === 'add' ? 'Invite User' : 'Edit User'}
              </h2>
              <button onClick={closeUserModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {userFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {userFormError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First name</label>
                  <input
                    value={userForm.firstname ?? ''}
                    onChange={(e) => setUserForm(f => ({ ...f, firstname: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last name</label>
                  <input
                    value={userForm.lastname ?? ''}
                    onChange={(e) => setUserForm(f => ({ ...f, lastname: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="Last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  value={userForm.username ?? ''}
                  onChange={(e) => setUserForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="Username"
                  readOnly={userModalMode === 'edit'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={userForm.email ?? ''}
                  onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="email@example.com"
                />
              </div>
              {userModalMode === 'add' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={userForm.password ?? ''}
                      onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
                    <input
                      type="password"
                      value={userForm.passwordConfirm ?? ''}
                      onChange={(e) => setUserForm(f => ({ ...f, passwordConfirm: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                      placeholder="••••••••"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
                {roles.length === 0 ? (
                  <div className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400">
                    Loading roles...
                  </div>
                ) : (
                  <select
                    value={userForm.roleId ?? ''}
                    onChange={(e) => setUserForm(f => ({ ...f, roleId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    required
                  >
                  <option value="">— Select Role —</option>
                  {roles
                    .filter(r => {
                      // Non-admin users cannot select Administrator role (id === '1')
                      if (r.id === '1' && !isAdmin) return false;
                      return true;
                    })
                    .map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {branchOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch (optional)</label>
                  <select
                    value={userForm.branch_id ?? ''}
                    onChange={(e) => setUserForm(f => ({ ...f, branch_id: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="">— Select branch —</option>
                    {branchOptions.map(b => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={closeUserModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancel
              </button>
              <button
                onClick={submitUser}
                disabled={userSubmitting}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {userSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {userModalMode === 'add' ? 'Create User' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role modal */}
      {roleModalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">
                {roleModalMode === 'add' ? 'Create Role' : 'Edit Role'}
              </h2>
              <button onClick={closeRoleModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {roleFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {roleFormError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role name</label>
                <input
                  value={roleForm.name ?? ''}
                  onChange={(e) => setRoleForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="e.g. Branch Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  value={roleForm.description ?? ''}
                  onChange={(e) => setRoleForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  rows={2}
                  placeholder="Short description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Permissions</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <label className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={roleForm.permissions?.includes('all') || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleForm(f => ({ ...f, permissions: ['all'] }));
                        } else {
                          setRoleForm(f => ({ ...f, permissions: [] }));
                        }
                      }}
                      className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-green-700">Full Access (all permissions)</span>
                  </label>
                  {!roleForm.permissions?.includes('all') && (
                    <>
                      {[
                        'manage_branch',
                        'manage_inventory',
                        'manage_staff',
                        'manage_menu',
                        'manage_orders',
                        'manage_billing',
                        'view_reports',
                        'export_data',
                        'manage_users',
                        'manage_settings',
                      ].map((perm) => (
                        <label key={perm} className="flex items-center gap-2 p-2 hover:bg-white rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={roleForm.permissions?.includes(perm) || false}
                            onChange={(e) => {
                              const current = roleForm.permissions || [];
                              if (e.target.checked) {
                                setRoleForm(f => ({ ...f, permissions: [...current, perm] }));
                              } else {
                                setRoleForm(f => ({ ...f, permissions: current.filter(p => p !== perm) }));
                              }
                            }}
                            className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm text-slate-700">
                            {perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </label>
                      ))}
                    </>
                  )}
                  {roleForm.permissions && roleForm.permissions.length > 0 && !roleForm.permissions.includes('all') && (
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <p className="text-xs text-slate-500 mb-1">Selected: {roleForm.permissions.length} permission{roleForm.permissions.length > 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={closeRoleModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
                Cancel
              </button>
              <button
                onClick={submitRole}
                disabled={roleSubmitting}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {roleSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {roleModalMode === 'add' ? 'Create Role' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SweetAlert-style popup */}
      {swal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-6">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                {swal.type === 'question' && (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <AlertCircle className="w-10 h-10 text-blue-500" />
                  </div>
                )}
                {swal.type === 'success' && (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                )}
                {swal.type === 'error' && (
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-10 h-10 text-red-500" />
                  </div>
                )}
                {swal.type === 'warning' && (
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertTriangle className="w-10 h-10 text-yellow-500" />
                  </div>
                )}
              </div>
              
              {/* Title */}
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
                {swal.title}
              </h3>
              
              {/* Text */}
              <p className="text-slate-600 text-center mb-6">
                {swal.text}
              </p>
              
              {/* Buttons */}
              <div className="flex justify-center gap-3">
                {swal.showCancel && (
                  <button
                    onClick={() => {
                      swal.onCancel?.();
                      setSwal(null);
                    }}
                    className="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                  >
                    {swal.cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (swal.onConfirm) {
                      await swal.onConfirm();
                    }
                  }}
                  disabled={userSubmitting || roleSubmitting || deleteSubmitting}
                  className={`px-6 py-2.5 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                    swal.type === 'error'
                      ? 'bg-red-500 hover:bg-red-600'
                      : swal.type === 'warning'
                      ? 'bg-yellow-500 hover:bg-yellow-600'
                      : swal.type === 'success'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                  } disabled:opacity-50`}
                >
                  {(userSubmitting || roleSubmitting || deleteSubmitting) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {swal.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm - trigger SweetAlert */}
      {deleteTarget && !swal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
                Are you sure?
              </h3>
              <p className="text-slate-600 text-center mb-6">
                Are you sure you want to remove <strong>{deleteTarget.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-6 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteSubmitting}
                  className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {deleteSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Yes, Delete!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
