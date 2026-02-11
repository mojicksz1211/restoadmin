
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  UserPlus, 
  Filter, 
  MoreVertical, 
  Star, 
  Mail, 
  Calendar, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  Moon,
  Store,
  Edit,
  Trash2,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Staff } from '../types';
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  getEmployeeById,
  getEmployeeRawData,
  getEmployeeMetadata,
  CreateEmployeePayload,
  UpdateEmployeePayload
} from '../services/employeeService';
import { getBranchOptions } from '../services/branchService';
import type { BranchOption } from '../types';

interface StaffPageProps {
  selectedBranchId: string;
}

const StaffPage: React.FC<StaffPageProps> = ({ selectedBranchId }) => {
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [employeeModalMode, setEmployeeModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Staff | null>(null);
  const [employeeForm, setEmployeeForm] = useState<Partial<CreateEmployeePayload & UpdateEmployeePayload>>({
    FIRSTNAME: '',
    LASTNAME: '',
    CONTACTNo: '',
    DEPARTMENT: '',
    ADDRESS: '',
    DATE_STARTED: '',
    SALARY: '',
    EMERGENCY_CONTACT_NAME: '',
    EMERGENCY_CONTACT_PHONE: '',
    BRANCH_ID: selectedBranchId === 'all' ? null : selectedBranchId,
    STATUS: 1,
    CREATE_USER_ACCOUNT: false,
    USERNAME: '',
    PASSWORD: '',
    PASSWORD2: '',
    PERMISSIONS: '',
  });
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);
  
  // Metadata for dropdowns
  const [metadata, setMetadata] = useState<{
    branches: Array<{ IDNo: number; BRANCH_NAME: string; BRANCH_CODE: string }>;
    users: Array<{ IDNo: number; USERNAME: string; FIRSTNAME: string; LASTNAME: string; FULLNAME: string }>;
    roles: Array<{ IDNo: number; ROLE: string }>;
    departments: string[];
  } | null>(null);
  
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load branches for branch name lookup
      const branchData = await getBranchOptions();
      setBranches(branchData.options);

      // Load employee metadata (for dropdowns)
      const meta = await getEmployeeMetadata();
      setMetadata(meta);

      // Load employees with branch filter
      const branchIdToFetch = selectedBranchId === 'all' ? null : selectedBranchId;
      const employees = await getEmployees(branchIdToFetch);
      setStaff(employees);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff data');
      console.error('Error loading staff:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStaff = staff.filter(person => {
    const matchesBranch = selectedBranchId === 'all' || person.branchId === selectedBranchId;
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          person.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          person.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const getStatusBadge = (status: Staff['status']) => {
    switch (status) {
      case 'Active':
        return { 
          bg: 'bg-green-100 text-green-700 border-green-200', 
          icon: <CheckCircle className="w-3 h-3 mr-1" />,
          labelKey: 'active' as const
        };
      case 'On Break':
        return { 
          bg: 'bg-orange-100 text-orange-700 border-orange-200', 
          icon: <Clock className="w-3 h-3 mr-1" />,
          labelKey: 'on_break' as const
        };
      case 'Off Duty':
        return { 
          bg: 'bg-slate-100 text-slate-500 border-slate-200', 
          icon: <Moon className="w-3 h-3 mr-1" />,
          labelKey: 'off_duty' as const
        };
    }
  };

  const getRoleColor = (role: Staff['role']) => {
    switch (role) {
      case 'Manager': return 'text-purple-600 bg-purple-50 border-purple-100';
      case 'Chef': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Server': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'Admin': return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const currentBranchName = selectedBranchId === 'all' 
    ? t('all_branches') 
    : branches.find(b => b.value === selectedBranchId)?.label || t('branch');

  // Form handlers
  const openAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      FIRSTNAME: '',
      LASTNAME: '',
      CONTACTNo: '',
      DEPARTMENT: '',
      ADDRESS: '',
      DATE_STARTED: '',
      SALARY: '',
      EMERGENCY_CONTACT_NAME: '',
      EMERGENCY_CONTACT_PHONE: '',
      BRANCH_ID: selectedBranchId === 'all' ? null : selectedBranchId,
      STATUS: 1,
      CREATE_USER_ACCOUNT: false,
      USERNAME: '',
      PASSWORD: '',
      PASSWORD2: '',
      PERMISSIONS: '',
    });
    setEmployeeFormError(null);
    setEmployeeModalMode('add');
  };

  const openEditEmployee = async (employee: Staff) => {
    try {
      setEmployeeFormError(null);
      setEmployeeSubmitting(true);
      
      // Fetch complete raw employee data from backend to get all fields (ADDRESS, SALARY, etc.)
      const rawData = await getEmployeeRawData(employee.id);
      
      // Also get mapped data for Staff interface
      const mappedData = await getEmployeeById(employee.id);
      setEditingEmployee(mappedData);
      
      // Parse employee data back to form format using raw API data
      setEmployeeForm({
        FIRSTNAME: rawData.FIRSTNAME || '',
        LASTNAME: rawData.LASTNAME || '',
        CONTACTNo: rawData.CONTACTNo || '',
        DEPARTMENT: rawData.DEPARTMENT || '',
        ADDRESS: rawData.ADDRESS || '',
        DATE_STARTED: rawData.DATE_STARTED || '',
        SALARY: rawData.SALARY ? String(rawData.SALARY) : '',
        EMERGENCY_CONTACT_NAME: rawData.EMERGENCY_CONTACT_NAME || '',
        EMERGENCY_CONTACT_PHONE: rawData.EMERGENCY_CONTACT_PHONE || '',
        BRANCH_ID: rawData.BRANCH_ID ? String(rawData.BRANCH_ID) : null,
        STATUS: rawData.STATUS === 1 || rawData.STATUS === '1' ? 1 : 0,
        USER_INFO_ID: rawData.USER_INFO_ID || null,
      });
      
      setEmployeeModalMode('edit');
    } catch (e) {
      setEmployeeFormError(e instanceof Error ? e.message : 'Failed to load employee data');
      console.error('Error loading employee for edit:', e);
      setSwal({
        type: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Failed to load employee data',
        onConfirm: () => setSwal(null),
      });
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  const closeEmployeeModal = () => {
    setEmployeeModalMode(null);
    setEditingEmployee(null);
    setEmployeeFormError(null);
  };

  const submitEmployee = async () => {
    setEmployeeFormError(null);
    
    if (!employeeForm.FIRSTNAME?.trim() && !employeeForm.LASTNAME?.trim()) {
      setEmployeeFormError('First name or last name is required.');
      return;
    }

    if (employeeForm.CREATE_USER_ACCOUNT) {
      if (!employeeForm.USERNAME?.trim()) {
        setEmployeeFormError('Username is required when creating user account.');
        return;
      }
      if (!employeeForm.PASSWORD || employeeForm.PASSWORD.length < 4) {
        setEmployeeFormError('Password must be at least 4 characters.');
        return;
      }
      if (employeeForm.PASSWORD !== employeeForm.PASSWORD2) {
        setEmployeeFormError('Passwords do not match.');
        return;
      }
    }

    // Show confirmation
    const actionTitle = employeeModalMode === 'add' ? 'Create Employee?' : 'Update Employee?';
    const actionText = employeeModalMode === 'add'
      ? `Are you sure you want to create employee "${employeeForm.FIRSTNAME} ${employeeForm.LASTNAME}"?`
      : `Are you sure you want to update employee "${employeeForm.FIRSTNAME} ${employeeForm.LASTNAME}"?`;
    
    setSwal({
      type: 'question',
      title: actionTitle,
      text: actionText,
      showCancel: true,
      confirmText: 'Yes, Continue',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSwal(null);
        setEmployeeSubmitting(true);
        setError(null);
        try {
          if (employeeModalMode === 'add') {
            await createEmployee({
              FIRSTNAME: employeeForm.FIRSTNAME!.trim(),
              LASTNAME: employeeForm.LASTNAME!.trim(),
              CONTACTNo: employeeForm.CONTACTNo || null,
              DEPARTMENT: employeeForm.DEPARTMENT || null,
              ADDRESS: employeeForm.ADDRESS || null,
              DATE_STARTED: employeeForm.DATE_STARTED || null,
              SALARY: employeeForm.SALARY ? parseFloat(String(employeeForm.SALARY).replace(/,/g, '')) : null,
              EMERGENCY_CONTACT_NAME: employeeForm.EMERGENCY_CONTACT_NAME || null,
              EMERGENCY_CONTACT_PHONE: employeeForm.EMERGENCY_CONTACT_PHONE || null,
              BRANCH_ID: employeeForm.BRANCH_ID || null,
              CREATE_USER_ACCOUNT: employeeForm.CREATE_USER_ACCOUNT || false,
              USERNAME: employeeForm.USERNAME || undefined,
              PASSWORD: employeeForm.PASSWORD || undefined,
              PASSWORD2: employeeForm.PASSWORD2 || undefined,
              PERMISSIONS: employeeForm.PERMISSIONS || undefined,
            });
            await loadData();
            closeEmployeeModal();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `Employee "${employeeForm.FIRSTNAME} ${employeeForm.LASTNAME}" created successfully!`,
              onConfirm: () => setSwal(null),
            });
          } else if (editingEmployee) {
            await updateEmployee(editingEmployee.id, {
              FIRSTNAME: employeeForm.FIRSTNAME!.trim(),
              LASTNAME: employeeForm.LASTNAME!.trim(),
              CONTACTNo: employeeForm.CONTACTNo || null,
              DEPARTMENT: employeeForm.DEPARTMENT || null,
              ADDRESS: employeeForm.ADDRESS || null,
              DATE_STARTED: employeeForm.DATE_STARTED || null,
              SALARY: employeeForm.SALARY ? parseFloat(String(employeeForm.SALARY).replace(/,/g, '')) : null,
              STATUS: employeeForm.STATUS !== undefined && employeeForm.STATUS !== null ? employeeForm.STATUS : 1,
              EMERGENCY_CONTACT_NAME: employeeForm.EMERGENCY_CONTACT_NAME || null,
              EMERGENCY_CONTACT_PHONE: employeeForm.EMERGENCY_CONTACT_PHONE || null,
              BRANCH_ID: employeeForm.BRANCH_ID || null,
              USER_INFO_ID: employeeForm.USER_INFO_ID || null,
            });
            await loadData();
            closeEmployeeModal();
            setSwal({
              type: 'success',
              title: 'Success!',
              text: `Employee "${employeeForm.FIRSTNAME} ${employeeForm.LASTNAME}" updated successfully!`,
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
          setEmployeeSubmitting(false);
        }
      },
      onCancel: () => setSwal(null),
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    setDeleteSubmitting(true);
    try {
      await deleteEmployee(deleteTarget.id);
      await loadData();
      setDeleteTarget(null);
      setSwal({
        type: 'success',
        title: 'Deleted!',
        text: `Employee "${deleteTarget.name}" deleted successfully!`,
        onConfirm: () => setSwal(null),
      });
    } catch (e) {
      setSwal({
        type: 'error',
        title: 'Error!',
        text: e instanceof Error ? e.message : 'Delete failed',
        onConfirm: () => {
          setSwal(null);
          setDeleteTarget(null);
        },
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('staff_members')}</h1>
          <p className="text-slate-500">{t('staff_subtitle', { branch: currentBranchName })}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold flex items-center space-x-2 hover:bg-slate-50 transition-colors shadow-sm">
            <Calendar className="w-4 h-4" />
            <span>{t('view_schedule')}</span>
          </button>
          <button 
            onClick={openAddEmployee}
            className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center space-x-2 shadow-md hover:bg-orange-600 transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span>{t('add_staff')}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder={t('search_staff_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="bg-slate-50 p-1 rounded-xl flex">
            <button className="px-4 py-1.5 text-xs font-bold bg-white text-slate-900 shadow-sm rounded-lg">{t('all_staff')}</button>
            <button className="px-4 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">{t('by_rating')}</button>
          </div>
          <button className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('employee')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('role_dept')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('performance')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('joined_date')}</th>
                {selectedBranchId === 'all' && (
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('branch')}</th>
                )}
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={selectedBranchId === 'all' ? 7 : 6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                      <span className="ml-2 text-sm text-slate-500">{t('loading_staff')}</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={selectedBranchId === 'all' ? 7 : 6} className="px-6 py-12 text-center">
                    <div className="text-red-500 text-sm">
                      <p className="font-medium">{t('error_loading_staff')}</p>
                      <p className="text-xs mt-1">{error}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length > 0 ? (
                filteredStaff.map((staffMember) => {
                  const statusInfo = getStatusBadge(staffMember.status);
                  const branch = branches.find(b => b.value === staffMember.branchId);
                  
                  // Generate avatar URL or use photo
                  const avatarUrl = staffMember.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.name)}&size=40&background=random`;
                  
                  return (
                    <tr key={staffMember.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={avatarUrl} 
                            alt={staffMember.name} 
                            className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                            onError={(e) => {
                              // Fallback to initials avatar if image fails
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(staffMember.name)}&size=40&background=random`;
                            }}
                          />
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{staffMember.name}</p>
                            <div className="flex items-center text-[11px] text-slate-400 mt-0.5">
                              <Mail className="w-3 h-3 mr-1" />
                              {staffMember.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${getRoleColor(staffMember.role as Staff['role'])}`}>
                          <Briefcase className="w-3 h-3 mr-1.5" />
                          {staffMember.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${statusInfo.bg}`}>
                          {statusInfo.icon}
                          {t(statusInfo.labelKey)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-bold text-slate-900">{staffMember.rating}</span>
                          <span className="text-[10px] text-slate-400">/ 5.0</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600 font-medium">
                          {new Date(staffMember.joinedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      {selectedBranchId === 'all' && (
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-slate-500 flex items-center">
                            <Store className="w-3 h-3 mr-1" />
                            {branch?.label || '—'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEditEmployee(staffMember)}
                            className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all" 
                            title={t('edit_profile')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setDeleteTarget({ id: staffMember.id, name: staffMember.name });
                              setSwal({
                                type: 'question',
                                title: t('delete_employee_confirm_title'),
                                text: t('delete_employee_confirm_text', { name: staffMember.name }),
                                showCancel: true,
                                confirmText: t('yes_delete'),
                                cancelText: t('cancel'),
                                onConfirm: confirmDelete,
                                onCancel: () => {
                                  setSwal(null);
                                  setDeleteTarget(null);
                                },
                              });
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                            title={t('delete_employee')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={selectedBranchId === 'all' ? 7 : 6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="bg-slate-100 p-4 rounded-full mb-4">
                        <Briefcase className="w-12 h-12 opacity-20" />
                      </div>
                      <p className="text-lg font-medium text-slate-600">{t('no_staff_found')}</p>
                      <p className="text-sm">{t('try_widening_search')}</p>
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-4 text-orange-500 font-bold hover:underline"
                      >
                        {t('clear_filters')}
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
              {t('showing_staff_count', { count: filteredStaff.length })}
            </p>
            <div className="h-4 w-px bg-slate-200"></div>
            <p className="text-xs text-slate-500 font-medium">
              {t('online_count', { count: filteredStaff.filter(s => s.status === 'Active').length })}
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

      {/* Employee Form Modal */}
      {employeeModalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-slate-900">
                {employeeModalMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
              </h2>
              <button onClick={closeEmployeeModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {employeeFormError && (
              <div className="p-4 mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {employeeFormError}
              </div>
            )}

            <div className="p-6 space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={employeeForm.FIRSTNAME ?? ''}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, FIRSTNAME: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={employeeForm.LASTNAME ?? ''}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, LASTNAME: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    value={employeeForm.CONTACTNo ?? ''}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, CONTACTNo: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  {metadata?.departments ? (
                    <select
                      value={employeeForm.DEPARTMENT ?? ''}
                      onChange={(e) => setEmployeeForm(f => ({ ...f, DEPARTMENT: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      <option value="">— Select Department —</option>
                      {metadata.departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={employeeForm.DEPARTMENT ?? ''}
                      onChange={(e) => setEmployeeForm(f => ({ ...f, DEPARTMENT: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                      placeholder="Department"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={employeeForm.ADDRESS ?? ''}
                  onChange={(e) => setEmployeeForm(f => ({ ...f, ADDRESS: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  placeholder="Address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date Started</label>
                  <input
                    type="date"
                    value={employeeForm.DATE_STARTED ?? ''}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, DATE_STARTED: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salary</label>
                  <input
                    type="number"
                    value={employeeForm.SALARY ?? ''}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, SALARY: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={employeeForm.EMERGENCY_CONTACT_NAME ?? ''}
                      onChange={(e) => setEmployeeForm(f => ({ ...f, EMERGENCY_CONTACT_NAME: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={employeeForm.EMERGENCY_CONTACT_PHONE ?? ''}
                      onChange={(e) => setEmployeeForm(f => ({ ...f, EMERGENCY_CONTACT_PHONE: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                      placeholder="+63 9XX XXX XXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Branch Selection (Admin only or if viewing all branches) */}
              {(selectedBranchId === 'all' || metadata?.branches) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <select
                    value={employeeForm.BRANCH_ID ?? ''}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, BRANCH_ID: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="">— Select Branch —</option>
                    {metadata?.branches.map(branch => (
                      <option key={branch.IDNo} value={branch.IDNo}>
                        {branch.BRANCH_NAME} ({branch.BRANCH_CODE})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status (Edit only) */}
              {employeeModalMode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={employeeForm.STATUS !== undefined && employeeForm.STATUS !== null ? employeeForm.STATUS : 1}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, STATUS: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive</option>
                  </select>
                </div>
              )}

              {/* Create User Account (Add only) */}
              {employeeModalMode === 'add' && (
                <div className="pt-4 border-t border-slate-200">
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={employeeForm.CREATE_USER_ACCOUNT || false}
                      onChange={(e) => setEmployeeForm(f => ({ ...f, CREATE_USER_ACCOUNT: e.target.checked }))}
                      className="w-4 h-4 text-orange-500 border-slate-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Create user account for this employee</span>
                  </label>

                  {employeeForm.CREATE_USER_ACCOUNT && (
                    <div className="space-y-4 mt-4 pl-6 border-l-2 border-orange-200">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={employeeForm.USERNAME ?? ''}
                          onChange={(e) => setEmployeeForm(f => ({ ...f, USERNAME: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                          placeholder="Username"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                          <input
                            type="password"
                            value={employeeForm.PASSWORD ?? ''}
                            onChange={(e) => setEmployeeForm(f => ({ ...f, PASSWORD: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                          <input
                            type="password"
                            value={employeeForm.PASSWORD2 ?? ''}
                            onChange={(e) => setEmployeeForm(f => ({ ...f, PASSWORD2: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      {metadata?.roles && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                          <select
                            value={employeeForm.PERMISSIONS ?? ''}
                            onChange={(e) => setEmployeeForm(f => ({ ...f, PERMISSIONS: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          >
                            <option value="">— Select Role —</option>
                            {metadata.roles.map(role => (
                              <option key={role.IDNo} value={role.IDNo}>{role.ROLE}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-2">
              <button 
                onClick={closeEmployeeModal} 
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitEmployee}
                disabled={employeeSubmitting}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {employeeSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {employeeModalMode === 'add' ? 'Create Employee' : 'Save Changes'}
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
                  disabled={employeeSubmitting || deleteSubmitting}
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
                  {(employeeSubmitting || deleteSubmitting) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {swal.confirmText || 'OK'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
