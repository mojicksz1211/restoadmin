
import React, { useState } from 'react';
import { 
  User, Building2, Bell, Shield, 
  Globe, CreditCard, Save, RefreshCw, 
  ChevronRight, Camera, Smartphone,
  Key
} from 'lucide-react';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'business', label: 'Business Profile', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-sm md:text-base text-slate-500">Configure your personal and business preferences.</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs md:text-sm hover:bg-slate-200 transition-all">Discard</button>
          <button className="flex-1 sm:flex-none px-4 md:px-6 py-2 bg-orange-500 text-white rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2">
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar Tabs - Scrollable on mobile/tablet */}
        <aside className="w-full lg:w-64">
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 space-x-2 lg:space-x-0 lg:space-y-1 no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 lg:w-full ${
                  activeTab === tab.id 
                    ? 'bg-orange-500 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent hover:border-slate-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6">Profile Information</h3>
                <div className="flex flex-col sm:flex-row gap-6 md:gap-8 items-start">
                  <div className="relative group mx-auto sm:mx-0">
                    <img src="https://picsum.photos/100/100?random=10" className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-slate-50 shadow-sm" alt="Avatar" />
                    <button className="absolute bottom-0 right-0 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50">
                      <Camera className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">First Name</label>
                      <input type="text" defaultValue="Juan" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Last Name</label>
                      <input type="text" defaultValue="Luna" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:outline-none" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                      <input type="email" defaultValue="juan.luna@restoadmin.ph" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:bg-white focus:ring-2 focus:ring-orange-500/10 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6">Regional Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Language</label>
                    <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M2.5%204.5L6%208L9.5%204.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat">
                      <option>English (United States)</option>
                      <option>Filipino (Philippines)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Timezone</label>
                    <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M2.5%204.5L6%208L9.5%204.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat">
                      <option>(GMT+08:00) Manila</option>
                      <option>(GMT-08:00) Pacific Time</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6">Notification Preferences</h3>
              <div className="space-y-4 md:space-y-6">
                {[
                  { title: "Daily Revenue Reports", desc: "Get a summary of earnings at the end of each day." },
                  { title: "Low Inventory Alerts", desc: "Real-time warnings when items are running out." },
                  { title: "Staff Schedule Changes", desc: "Notify when employees update their work hours." },
                  { title: "Marketing Updates", desc: "Receive tips and AI-powered marketing trends." }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0">
                    <div className="pr-4">
                      <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <div className={`relative inline-flex h-5 w-10 md:h-6 md:w-11 items-center rounded-full cursor-pointer transition-colors ${i < 2 ? 'bg-orange-500' : 'bg-slate-200'}`}>
                       <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${i < 2 ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-base md:text-lg font-bold text-slate-900 mb-6">Security Settings</h3>
                <div className="space-y-4">
                   <button className="w-full flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-3 text-left">
                        <Smartphone className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">Two-Factor Authentication</p>
                          <p className="text-[11px] text-slate-500">Secure your account with 2FA</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                   </button>
                   <button className="w-full flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-3 text-left">
                        <Key className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-800">Change Password</p>
                          <p className="text-[11px] text-slate-500">Update your account credentials</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
