import React from "react";
import { 
  Building2, 
  LayoutDashboard, 
  ListPlus, 
  FileSpreadsheet, 
  BarChart3, 
  ShieldAlert, 
  UserSquare2, 
  Fingerprint,
  LogOut,
  Sparkles,
  Code2,
  Phone,
  Mail,
  Lock,
  RefreshCw,
  Flame
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
      case "admin": return "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50";
      case "supervisor": return "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50";
      case "manager": return "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50";
      default: return "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["operator", "supervisor", "manager", "admin"] },
    { id: "stripe_dashboard", label: "Stripe Panel", icon: Sparkles, roles: ["operator", "supervisor", "manager", "admin"] },
    { id: "data_entry", label: "Cutting Entries", icon: ListPlus, roles: ["operator", "supervisor", "admin"] },
    { id: "reports", label: "Ledgers & Reports", icon: FileSpreadsheet, roles: ["operator", "supervisor", "manager", "admin"] },
    { id: "analytics", label: "Analytics", icon: BarChart3, roles: ["supervisor", "manager", "admin"] },
    { id: "poly_tracking", label: "Poly Tracking", icon: RefreshCw, roles: ["supervisor", "admin"] },
    { id: "heat_seal_tracking", label: "Heat Seal Tracking", icon: Flame, roles: ["operator", "supervisor", "admin"] },
    { id: "admin", label: "Factory & IAM Admin", icon: ShieldAlert, roles: ["admin"] }
  ];

  return (
    <aside className="w-68 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 flex flex-col h-screen sticky top-0 shrink-0 font-sans shadow-xs transition-all duration-200">
      
      {/* Brand Header - Sleek & Modern */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-blue-600/20">
          W
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 dark:text-white tracking-tight leading-none text-sm uppercase">
            Wavely Cut
          </h1>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold block mt-0.5">
            Cutting Management System
          </span>
        </div>
      </div>

      {/* Main Navigation with Generous Spacing & Hover States */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          let hasAccess = item.roles.includes(currentProfile.role);
          let tooltipMessage = "";
          let useLockIcon = false;

          if (hasAccess && item.id === "data_entry" && currentProfile.can_access_cutting_entry === false) {
            hasAccess = false;
            useLockIcon = true;
            tooltipMessage = "Cutting Entries access has been locked by Admin.";
          }

          const Icon = useLockIcon ? Lock : item.icon;
          
          if (!hasAccess) {
            const displayRoles = item.roles.map(r => r === "supervisor" ? "officer" : r).join(", ");
            const titleText = tooltipMessage || `${item.label} requires ${displayRoles} roles.`;
            return (
              <div 
                key={item.id} 
                className="flex items-center gap-4 text-slate-300 dark:text-slate-600 px-4 py-3 rounded-xl text-[13px] font-bold cursor-not-allowed opacity-40 select-none"
                title={titleText}
              >
                <Icon size={20} className="shrink-0 text-slate-300 dark:text-slate-600" />
                <span>{item.label}</span>
              </div>
            );
          }

          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-[13px] font-extrabold transition-all cursor-pointer ${
                isActive 
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/10" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon size={20} className={`shrink-0 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile Swapper & User Info moved to Bottom card */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
        {currentProfile.role === 'admin' && (
          <div className="space-y-1">
            <label className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-extrabold block flex items-center gap-1">
              <Fingerprint size={12} className="text-blue-500" /> Switch Role Simulation
            </label>
            <select
              value={currentProfile.id}
              onChange={(e) => {
                const prof = profiles.find(p => p.id === e.target.value);
                if (prof) onSwitchProfile(prof);
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs py-2 px-2.5 text-slate-700 dark:text-slate-300 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role === 'supervisor' ? 'Officer' : p.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* User Card */}
        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* Minimal Initial Avatar or Custom Profile Image */}
            {currentProfile.avatar_url ? (
              <img 
                src={currentProfile.avatar_url} 
                alt={currentProfile.full_name} 
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-black shrink-0 uppercase">
                {currentProfile.full_name.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white block truncate leading-tight">
                {currentProfile.full_name}
              </span>
              <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md border uppercase tracking-wider font-extrabold mt-0.5 ${getRoleBadgeColor(currentProfile.role)}`}>
                {currentProfile.role === 'supervisor' ? 'officer' : currentProfile.role}
              </span>
            </div>
          </div>
          
          {/* Logout Action */}
          <button
            onClick={onLogout}
            title="Log out of application session"
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Developer Info Section */}
      <div className="px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-sans">
        <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400 mb-1.5">
          <Code2 size={13} className="text-blue-500" />
          <span>Developer Support</span>
        </div>
        <div className="bg-slate-50/70 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 space-y-1 shadow-2xs">
          <div className="font-extrabold text-slate-800 dark:text-slate-200 text-[12px]">Rakib Hasan</div>
          <div className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Phone size={11} className="text-slate-400 shrink-0" />
            <a href="tel:+8801783924660" className="font-medium">+8801783924660</a>
          </div>
          <div className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Mail size={11} className="text-slate-400 shrink-0" />
            <a href="mailto:hrakib182@gmail.com" className="font-medium truncate">hrakib182@gmail.com</a>
          </div>
        </div>
      </div>

    </aside>
  );
}
