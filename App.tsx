import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Generator } from './pages/Generator';
import { Scheduler } from './pages/Scheduler';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference on mount
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'generator': return <Generator />;
      case 'scheduler': return <Scheduler />;
      case 'settings': return (
        <div className="max-w-xl mx-auto mt-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Settings</h2>
            <p className="text-slate-500">API configuration is handled via environment variables.</p>
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Connected Accounts</h3>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                    <span className="text-blue-600 font-bold">LinkedIn</span>
                    <span className="text-green-500 text-sm">Connected</span>
                </div>
            </div>
        </div>
      );
      default: return <Dashboard />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onNavigate={setCurrentView}
      isDark={isDark}
      toggleTheme={toggleTheme}
    >
      {renderView()}
    </Layout>
  );
};

export default App;
