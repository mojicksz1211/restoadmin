
import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Store, 
  ClipboardList, 
  Settings, 
  Users, 
  ChevronRight, 
  Utensils, 
  ChevronDown, 
  Globe, 
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  X,
  Receipt
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BranchOption, AuthUser } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { isKimsBrothersBranchOption } from '../utils/branchUtils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedBranchId: string;
  onBranchChange: (id: string) => void;
  branchOptions: BranchOption[];
  branchOptionsLoading?: boolean;
  user: AuthUser | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedBranchId,
  onBranchChange,
  branchOptions,
  branchOptionsLoading,
  user,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation('common');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    canViewDashboard,
    canManageBranches,
    canManageMenu,
    canManageInventory,
    canManageStaff,
    canManageUsers,
    canViewOrders,
  } = usePermissions(user);

  // Define all menu items with their permission requirements
  const allMenuItems = [
    { 
      id: 'dashboard', 
      label: t('dashboard'), 
      icon: LayoutDashboard,
      // Dashboard menu is visible to all, but content/analytics only available for Kim's Brothers
      canAccess: canViewDashboard
    },
    { 
      id: 'branches', 
      label: t('branches'), 
      icon: Store,
      canAccess: canManageBranches
    },
    { 
      id: 'menu', 
      label: t('menu'), 
      icon: Utensils,
      canAccess: canManageMenu
    },
    { 
      id: 'orders', 
      label: t('orders'), 
      icon: Receipt,
      canAccess: canViewOrders
    },
    { 
      id: 'inventory', 
      label: t('inventory'), 
      icon: ClipboardList,
      canAccess: canManageInventory
    },
    { 
      id: 'staff', 
      label: t('staff'), 
      icon: Users,
      canAccess: canManageStaff
    },
    { 
      id: 'user_management', 
      label: t('user_mgmt'), 
      icon: ShieldCheck,
      canAccess: canManageUsers
    },
    { 
      id: 'settings', 
      label: t('settings'), 
      icon: Settings,
      canAccess: true // Settings accessible to all authenticated users
    },
  ];

  // Filter menu items based on permissions
  const menuItems = allMenuItems.filter(item => item.canAccess);

  const currentOption = branchOptions.find((opt) => opt.value === selectedBranchId);
  const currentLabel = selectedBranchId === 'all' ? t('global_view') : (currentOption?.label || t('branch'));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50 border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500 p-2 rounded-lg shadow-lg shadow-orange-500/20">
            <Utensils className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="font-bold text-lg md:text-xl tracking-tight uppercase">RestoAdmin</span>
        </div>
        <button 
          onClick={onClose}
          className="lg:hidden p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 py-6 relative" ref={dropdownRef}>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2 block">
          {t('context')}
        </label>
        
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 px-4 py-3 rounded-xl border transition-all duration-200 group ${
            isDropdownOpen ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-3 truncate">
            <div className="p-1.5 bg-slate-700 rounded-lg group-hover:bg-slate-600 transition-colors text-orange-400">
              {selectedBranchId === 'all' ? <Globe className="w-4 h-4 text-blue-400" /> : <Store className="w-4 h-4" />}
            </div>
            <div className="text-left truncate">
              <p className="text-xs font-bold truncate leading-tight">
                {currentLabel}
              </p>
            </div>
          </div>
          <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-orange-500' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-4 right-4 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            {branchOptionsLoading ? (
              <div className="px-4 py-3 text-xs font-bold text-slate-500">{t('loading_branches')}</div>
            ) : branchOptions.length > 0 ? (
              branchOptions.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => { onBranchChange(option.value); setIsDropdownOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700 text-xs font-bold ${
                    index > 0 ? 'border-t border-slate-700/50' : ''
                  } ${selectedBranchId === option.value ? 'text-orange-400' : 'text-slate-400'}`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {option.value === 'all' ? <Globe className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                    <span>{option.label}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs font-bold text-slate-500">{t('no_branches')}</div>
            )}
          </div>
        )}
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div onClick={() => setActiveTab('settings')} className="bg-slate-800/50 rounded-xl p-3 flex items-center space-x-3 border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group">
          <img src="https://picsum.photos/40/40?random=10" alt="" className="w-8 h-8 rounded-lg border border-orange-500" />
          <div className="truncate flex-1">
            <p className="text-xs font-bold truncate">
              {user?.firstname && user?.lastname 
                ? `${user.firstname} ${user.lastname}` 
                : user?.username || 'User'}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              {user?.permissions === 1 ? t('administrator') : user?.permissions ? `Role ${user.permissions}` : t('user')}
            </p>
          </div>
          <Settings className="w-3 h-3 text-slate-500 group-hover:rotate-90 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
