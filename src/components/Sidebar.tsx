import React from "react";
import { 
  Building2, 
  LayoutDashboard, 
  ListPlus, 
  FileSpreadsheet, 
  BarChart3, 
  ShieldAlert, 
  UserSquare2, 
  Fingerprint
} from "lucide-react";
import { Profile, UserRole } from "../types";

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  currentProfile: Profile;
  profiles: Profile[];
  onSwitchProfile: (profile: Profile) => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentTab,
  setTab,
  currentProfile,
  profiles,
  onSwitchProfile,
  onLogout
}: SidebarProps) {
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "supervisor": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "manager": return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20";
      default: return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["operator", "supervisor", "manager", "admin"] },
    { id: "data_entry", label: "Cutting Entries", icon: ListPlus, roles: ["operator", "supervisor", "admin"] },
    { id: "reports", label: "Ledgers & Reports", icon: FileSpreadsheet, roles: ["operator", "supervisor", "manager", "admin"] },
    { id: "analytics", label: "Analytics", icon: BarChart3, roles: ["supervisor", "manager", "admin"] },
    { id: "admin", label: "Factory & IAM Admin", icon: ShieldAlert, roles: ["admin"] }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-200 dark:border-slate-800/80 font-sans transition-colors duration-200">
      
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-900 dark:bg-slate-800 rounded-lg flex items-center justify-center text-white dark:text-slate-100 font-bold text-xl">
          W
        </div>
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white tracking-tight leading-none text-sm">
            WAVELY CUT
          </h1>
          <span className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold block mt-1">
            Developed by Rakib Hasan
          </span>
        </div>
      </div>

      {/* Profile Swapper (Simulated Auth & RLS Demonstration) */}
      <div className="p-4 mx-4 mb-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
        {currentProfile.role === 'admin' ? (
          <>
            <label className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-1.5 flex items-center gap-1">
              <Fingerprint size={10} className="text-slate-600 dark:text-slate-400" /> Simulated User (Auth / RLS)
            </label>
            
            <select
              value={currentProfile.id}
              onChange={(e) => {
                const prof = profiles.find(p => p.id === e.target.value);
                if (prof) onSwitchProfile(prof);
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs py-1.5 px-2 text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-300 outline-none mb-2"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role === 'supervisor' ? 'OFFICER' : p.role.toUpperCase()})
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Session</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">{currentProfile.full_name}</span>
          </div>
        )}
        
        <div className="mt-2.5 flex items-center justify-between gap-1">
          <span className={`text-[9px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${getRoleBadgeColor(currentProfile.role)}`}>
            {currentProfile.role === 'supervisor' ? 'officer' : currentProfile.role}
          </span>
          <button
            onClick={onLogout}
            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline bg-transparent border-none cursor-pointer font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 space-y-1 mt-2">
        {navItems.map((item) => {
          const hasAccess = item.roles.includes(currentProfile.role);
          const Icon = item.icon;
          
          if (!hasAccess) {
            const displayRoles = item.roles.map(r => r === "supervisor" ? "officer" : r).join(", ");
            return (
              <div 
                key={item.id} 
                className="flex items-center gap-3 text-slate-300 dark:text-slate-600 px-3 py-2 rounded-md text-xs font-medium cursor-not-allowed opacity-40 select-none"
                title={`${item.label} requires ${displayRoles} roles.`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </div>
            );
          }

          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isActive 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Settings */}
      <div className="p-4 border-t border-slate-200 flex items-center mx-2 mt-auto">
        <div className="flex items-center space-x-2 min-w-0">
          <UserSquare2 size={16} className="text-slate-400 shrink-0" />
          <span className="text-[11px] text-slate-600 truncate font-mono" title={currentProfile.email}>
            {currentProfile.email}
          </span>
        </div>
      </div>

    </aside>
  );
}
