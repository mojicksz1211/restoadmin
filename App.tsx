
import React, { useEffect, useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import Billing from './pages/Billing';
import Products from './pages/Products';
import Materials from './pages/Materials';
import ProductCategories from './pages/ProductCategories';
import Tables from './pages/Tables';
import StaffPage from './pages/Staff';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Bell, Search, Info, Globe, ChevronDown, Menu as MenuIcon, X, Zap, User, CheckCheck, Trash2, ShoppingBag, Inbox } from 'lucide-react';
import { MOCK_BRANCHES, MOCK_STAFF } from './constants';
import { AuthUser, BranchOption } from './types';
import { checkSession, getMe, getAccessToken, logout } from './services/authService';
import { getBranchOptions, setCurrentBranch } from './services/branchService';
import { getNotifications, markAsRead, markAllAsRead, clearAll, type NotificationRecord } from './services/notificationService';
import { PERMISSION_LEVELS } from './utils/permissions';
import { useTranslation } from 'react-i18next';
import { SupportedLocale } from './i18n';
import { io, type Socket } from 'socket.io-client';

const App: React.FC = () => {
  const { t, i18n } = useTranslation('common');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnlineOverlayOpen, setIsOnlineOverlayOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [branchOptionsLoading, setBranchOptionsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedBranchIdRef = useRef<string>(selectedBranchId);
  selectedBranchIdRef.current = selectedBranchId;

  const socketBaseUrl = (import.meta as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL || 'http://localhost:2000';

  const lang = (i18n.language?.startsWith('ko') ? 'ko' : 'en') as SupportedLocale;

  const currentBranch = selectedBranchId === 'all' 
    ? null 
    : MOCK_BRANCHES.find(b => b.id === selectedBranchId);

  // Group online staff by branch
  const onlineStaff = MOCK_STAFF.filter(s => s.status === 'Active');
  const onlineByBranch = MOCK_BRANCHES.map(branch => ({
    branch,
    staff: onlineStaff.filter(s => s.branchId === branch.id)
  })).filter(group => group.staff.length > 0);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <ProtectedRoute user={authUser} requireAuth>
            <Dashboard selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'branches':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={PERMISSION_LEVELS.ADMIN}>
            <Branches onSelectBranch={(id) => {
              handleBranchChange(id);
              setActiveTab('dashboard');
            }} onBranchesChange={loadBranchOptions} />
          </ProtectedRoute>
        );
      case 'menu':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]}>
            <Menu selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'tables':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]}>
            <Tables selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'orders':
        return (
          <ProtectedRoute user={authUser} requireAuth>
            <Orders selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'billing':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER, PERMISSION_LEVELS.CASHIER]}>
            <Billing selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'inventory':
      case 'inventory_products':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]}>
            <Products selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'inventory_materials':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]}>
            <Materials selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'inventory_categories':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]}>
            <ProductCategories selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'staff':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]}>
            <StaffPage selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
      case 'user_management':
        return (
          <ProtectedRoute user={authUser} requiredPermissions={[PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.MANAGER]}>
            <UserManagement />
          </ProtectedRoute>
        );
      case 'settings':
        return (
          <ProtectedRoute user={authUser} requireAuth>
            <Settings />
          </ProtectedRoute>
        );
      default:
        return (
          <ProtectedRoute user={authUser} requireAuth>
            <Dashboard selectedBranchId={selectedBranchId} />
          </ProtectedRoute>
        );
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  const loadBranchOptions = async () => {
    setBranchOptionsLoading(true);
    try {
      const data = await getBranchOptions();
      setBranchOptions(data.options);
      if (data.current) {
        setSelectedBranchId(data.current);
      }
    } catch (err) {
      setBranchOptions([]);
    } finally {
      setBranchOptionsLoading(false);
    }
  };

  const handleBranchChange = async (id: string) => {
    setSelectedBranchId(id);
    setIsSidebarOpen(false);
    try {
      await setCurrentBranch(id);
    } catch (err) {
      // Keep local selection if server rejects
    }
  };

  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        // Prefer JWT from storage so refresh keeps user logged in
        if (getAccessToken()) {
          const me = await getMe();
          if (isMounted) {
            setAuthUser(me);
          }
          if (isMounted) {
            setAuthLoading(false);
          }
          return;
        }
        const sessionUser = await checkSession();
        if (isMounted) {
          setAuthUser(sessionUser);
        }
      } catch {
        if (isMounted) {
          setAuthUser(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };
    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (authUser) {
      loadBranchOptions();
    }
  }, [authUser]);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const branchId = selectedBranchId === 'all' ? undefined : selectedBranchId;
      const { notifications: list, unread_count } = await getNotifications({ limit: 50, branchId });
      setNotifications(list);
      setUnreadCount(unread_count);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    if (authUser) {
      loadNotifications();
    }
  }, [authUser, selectedBranchId]);

  useEffect(() => {
    if (isNotificationPanelOpen && authUser) {
      loadNotifications();
    }
  }, [isNotificationPanelOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(e.target as Node)) {
        setIsNotificationPanelOpen(false);
      }
    };
    if (isNotificationPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isNotificationPanelOpen]);

  // Socket.IO: connect as user and listen for real-time notifications
  useEffect(() => {
    if (!authUser?.userId) return;
    const socket = io(socketBaseUrl, { transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = socket;
    socket.emit('join_user', authUser.userId);
    socket.on('notification_new', (payload: { id: number; userId: number; branchId?: number | null; title: string; message: string; type: string; link: string | null; isRead: boolean; createdAt: string }) => {
      const current = selectedBranchIdRef.current;
      const show = current === 'all' || String(payload.branchId) === String(current);
      const record: NotificationRecord = {
        id: payload.id,
        userId: payload.userId,
        branchId: payload.branchId ?? undefined,
        title: payload.title ?? '',
        message: payload.message ?? '',
        type: payload.type ?? 'info',
        link: payload.link ?? null,
        isRead: payload.isRead ?? false,
        createdAt: payload.createdAt ?? new Date().toISOString(),
      };
      if (show) {
        setNotifications(prev => [record, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    });
    return () => {
      socket.off('notification_new');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [authUser?.userId, socketBaseUrl]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // keep UI as is
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // keep UI as is
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // keep UI as is
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        {t('loading')}
      </div>
    );
  }

  if (!authUser) {
    return <Login onLogin={(user) => setAuthUser(user)} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 relative overflow-x-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Online Users Drawer Overlay */}
      {isOnlineOverlayOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] animate-in fade-in duration-300"
            onClick={() => setIsOnlineOverlayOpen(false)}
          />
          <div className="fixed top-0 right-0 w-80 h-full bg-white z-[70] shadow-2xl border-l border-slate-200 animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h3 className="font-bold text-slate-900">{t('online_now')}</h3>
                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{onlineStaff.length} {t('live')}</span>
              </div>
              <button 
                onClick={() => setIsOnlineOverlayOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {onlineByBranch.map(group => (
                <div key={group.branch.id} className="space-y-3">
                  <div className="flex items-center space-x-2 px-2">
                    <Zap className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.branch.name}</span>
                  </div>
                  <div className="space-y-1">
                    {group.staff.map(person => (
                      <div key={person.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <img src={`https://picsum.photos/40/40?random=${person.id}`} className="w-9 h-9 rounded-full border border-slate-100" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{person.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{person.role}</p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="text-[10px] font-bold text-orange-600 hover:underline">{t('message')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100">
               <button className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center space-x-2">
                 <User className="w-4 h-4" />
                 <span>{t('view_global_team')}</span>
               </button>
            </div>
          </div>
        </>
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleTabChange} 
        selectedBranchId={selectedBranchId}
        onBranchChange={handleBranchChange}
        branchOptions={branchOptions}
        branchOptionsLoading={branchOptionsLoading}
        user={authUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className={`flex-1 transition-all duration-300 lg:ml-64 p-4 md:p-8`}>
        {/* Header Bar */}
        <header className="flex items-center justify-between mb-8 bg-white/70 backdrop-blur-md sticky top-0 z-30 py-4 px-4 rounded-2xl shadow-sm border border-slate-200/50">
          <div className="flex items-center space-x-2 md:space-x-4 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <MenuIcon className="w-6 h-6 text-slate-600" />
            </button>

            <div className="hidden sm:flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 w-full max-w-xs md:max-w-md shadow-inner focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
              <input 
                type="text" 
                placeholder={t('search_placeholder')} 
                className="bg-transparent border-none focus:outline-none text-sm w-full"
              />
            </div>

            {selectedBranchId !== 'all' && (
              <div className="hidden md:flex items-center space-x-2 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold border border-orange-200 animate-in slide-in-from-left-2 duration-300">
                <Globe className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px]">{currentBranch?.name}</span>
                <button 
                  onClick={() => setSelectedBranchId('all')}
                  className="ml-1 hover:underline text-orange-900 opacity-60"
                >
                  {t('reset')}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Online Status Toggle */}
            <button 
              onClick={() => setIsOnlineOverlayOpen(true)}
              className="relative bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <Zap className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center space-x-2 bg-white border border-slate-200 px-2 md:px-3 py-1.5 md:py-2 rounded-xl text-[10px] md:text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <span className="w-4 h-4 md:w-5 md:h-5 flex items-center justify-center bg-slate-100 rounded-md overflow-hidden">
                  {lang === 'en' ? '🇺🇸' : '🇰🇷'}
                </span>
                <span className="uppercase hidden sm:inline">{lang}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLangOpen && (
                <div className="absolute top-full right-0 mt-2 w-32 bg-white border border-slate-100 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => { i18n.changeLanguage('en'); setIsLangOpen(false); }}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <span>🇺🇸</span><span>{t('english')}</span>
                  </button>
                  <button 
                    onClick={() => { i18n.changeLanguage('ko'); setIsLangOpen(false); }}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <span>🇰🇷</span><span>{t('korean')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={notificationPanelRef}>
              <button
                type="button"
                onClick={() => setIsNotificationPanelOpen(prev => !prev)}
                className="relative bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5 text-slate-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[8px] min-w-[14px] h-3.5 rounded-full flex items-center justify-center font-bold ring-2 ring-white px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {isNotificationPanelOpen && (
                <div className="absolute top-full right-0 mt-2 w-[360px] max-h-[440px] bg-white border border-slate-200/80 rounded-2xl shadow-2xl shadow-slate-200/50 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="px-4 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{t('notifications')}</h3>
                        {unreadCount > 0 && (
                          <p className="text-[10px] font-medium text-orange-600">{unreadCount} {t('unread')}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {notifications.length > 0 && unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center gap-1"
                          title={t('mark_all_read')}
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('mark_all_read')}</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAll}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-rose-500 transition-colors"
                          title={t('clear_all')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* List */}
                  <div className="overflow-y-auto flex-1 min-h-0">
                    {notificationsLoading ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                        <p className="text-xs text-slate-500">{t('loading')}</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-3 px-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <Inbox className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">{t('no_notifications')}</p>
                        <p className="text-xs text-slate-400 text-center">New orders and updates will show here</p>
                      </div>
                    ) : (
                      <ul className="py-2">
                        {notifications.map((n) => {
                          const isOrder = (n.type || '').toLowerCase() === 'order';
                          const Icon = isOrder ? ShoppingBag : Info;
                          const accentBg = !n.isRead ? 'bg-orange-50' : 'bg-slate-50';
                          const accentBorder = !n.isRead ? 'border-l-orange-500' : 'border-l-transparent';
                          return (
                            <li key={n.id} className="px-3 py-1">
                              <button
                                type="button"
                                onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                                className={`w-full text-left rounded-xl border-l-4 border-slate-100 ${accentBorder} ${accentBg} hover:bg-slate-50/80 transition-colors p-3`}
                              >
                                <div className="flex gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isOrder ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600'}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold line-clamp-1 ${!n.isRead ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                    <p className="text-[11px] text-slate-400 mt-1.5">
                                      {n.createdAt ? new Date(n.createdAt).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                                    </p>
                                  </div>
                                  {!n.isRead && (
                                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" aria-hidden />
                                  )}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 ml-1">
              <div className="text-right hidden xl:block">
                <p className="text-sm font-bold text-slate-900 leading-none">
                  {authUser.firstname || authUser.username} {authUser.lastname}
                </p>
                <p className="text-[10px] text-green-500 font-bold uppercase mt-1">{t('authenticated')}</p>
              </div>
              <img 
                src="https://picsum.photos/40/40?random=10" 
                alt="Profile" 
                className="w-8 h-8 md:w-10 md:h-10 rounded-xl shadow-md cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all ring-offset-2 ring-transparent" 
              />
              <button
                onClick={handleLogout}
                className="hidden md:inline-flex text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="max-w-[1600px] mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
