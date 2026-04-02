import React from 'react';
import { 
  LayoutDashboard,
  FileText, 
  FilePlus,
  PlusCircle, 
  Users, 
  Package, 
  Settings as SettingsIcon, 
  LogOut,
  Menu,
  X,
  UserCircle,
  Receipt,
  HardDrive,
  Briefcase
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from 'firebase/auth';
import { BusinessSettings } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: User;
  onLogout: () => void;
  settings: BusinessSettings | null;
}

export function Layout({ children, activeTab, setActiveTab, user, onLogout, settings }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'estimations', label: 'Estimations', icon: FileText },
    { id: 'create', label: 'New Invoice', icon: PlusCircle },
    { id: 'create_estimation', label: 'New Estimation', icon: FilePlus },
    { id: 'parties', label: 'Parties', icon: Users },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'employees', label: 'Employees', icon: UserCircle },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'equipments', label: 'Equipments', icon: HardDrive },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold text-blue-600 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            GST Pro
          </h1>
          {settings?.businessName && (
            <p className="text-[10px] text-gray-500 mt-0.5 truncate uppercase font-semibold tracking-wider">{settings.businessName}</p>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                activeTab === item.id
                  ? "bg-blue-50 text-blue-600 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-gray-900 truncate">{user.displayName || user.email?.split('@')[0]}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-bold text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <h1 className="text-base font-bold text-blue-600 flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          GST Pro
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-14">
          <nav className="p-4 grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-sm font-medium border transition-all",
                  activeTab === item.id 
                    ? "bg-blue-50 text-blue-600 border-blue-100 shadow-sm" 
                    : "text-gray-600 border-gray-100 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-6 h-6" />
                {item.label}
              </button>
            ))}
            <button
              onClick={onLogout}
              className="col-span-2 flex items-center justify-center gap-2 p-4 rounded-xl text-sm font-bold text-red-600 border border-red-50 hover:bg-red-50 mt-2"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
