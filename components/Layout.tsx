import React from 'react';
import { 
  LayoutDashboard, 
  PenTool, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu,
  Moon,
  Sun,
  X
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 font-medium' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onNavigate, 
  isDark, 
  toggleTheme 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
        <div className="p-6 flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <PenTool className="text-white" size={18} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">
            LinkGenie
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')} 
          />
          <SidebarItem 
            icon={PenTool} 
            label="Generator" 
            active={currentView === 'generator'} 
            onClick={() => onNavigate('generator')} 
          />
          <SidebarItem 
            icon={Calendar} 
            label="Scheduler" 
            active={currentView === 'scheduler'} 
            onClick={() => onNavigate('scheduler')} 
          />
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
           <button 
            onClick={toggleTheme}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <SidebarItem 
            icon={Settings} 
            label="Settings" 
            active={currentView === 'settings'} 
            onClick={() => onNavigate('settings')} 
          />
          <div className="pt-2">
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm">
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <PenTool className="text-white" size={18} />
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">LinkGenie</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 dark:text-slate-300">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white dark:bg-slate-900 z-40 pt-20 px-4 space-y-2 md:hidden">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => {onNavigate('dashboard'); setMobileMenuOpen(false);}} />
          <SidebarItem icon={PenTool} label="Generator" active={currentView === 'generator'} onClick={() => {onNavigate('generator'); setMobileMenuOpen(false);}} />
          <SidebarItem icon={Calendar} label="Scheduler" active={currentView === 'scheduler'} onClick={() => {onNavigate('scheduler'); setMobileMenuOpen(false);}} />
          <SidebarItem icon={Settings} label="Settings" active={currentView === 'settings'} onClick={() => {onNavigate('settings'); setMobileMenuOpen(false);}} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 scroll-smooth">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
