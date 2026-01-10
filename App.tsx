import React, { useState, useEffect, useCallback } from 'react';
import { View } from './types';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { GoalsView } from './components/views/GoalsView';
import { InboxView } from './components/views/InboxView';
import { HabitsView } from './components/views/HabitsView';
import { FocusView } from './components/views/FocusView';
import { JournalView } from './components/views/JournalView';
import { SettingsView } from './components/views/SettingsView';
import { Icon } from './components/ui/Icon';
import { PWAPrompt } from './components/PWAPrompt';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle navigation với History API để back button hoạt động đúng
  const handleNavigate = useCallback((view: View) => {
    // Push state to history để back button hoạt động
    window.history.pushState({ view }, '', `#${view}`);
    setCurrentView(view);
  }, []);

  // Listen to popstate event (back/forward button)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setCurrentView(event.state.view);
      } else {
        // Nếu không có state (người dùng đến trang đầu tiên), set về Dashboard
        // và push state để không thoát app
        window.history.pushState({ view: View.DASHBOARD }, '', `#${View.DASHBOARD}`);
        setCurrentView(View.DASHBOARD);
      }
    };

    // Set initial state
    const hash = window.location.hash.replace('#', '') as View;
    const initialView = Object.values(View).includes(hash) ? hash : View.DASHBOARD;
    window.history.replaceState({ view: initialView }, '', `#${initialView}`);
    setCurrentView(initialView);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD: return <DashboardView />;
      case View.GOALS: return <GoalsView />;
      case View.INBOX: return <InboxView />;
      case View.HABITS: return <HabitsView />;
      case View.FOCUS: return <FocusView />;
      case View.JOURNAL: return <JournalView />;
      case View.SETTINGS: return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen text-neo-black">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        isMobileMenuOpen={isMobileMenuOpen}
        toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Mobile Menu Button */}
      {!isMobileMenuOpen && (
        <button
          className="md:hidden fixed bottom-6 right-6 z-40 w-16 h-16 bg-neo-lime border-4 border-neo-black shadow-hard flex items-center justify-center rounded-full"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Icon name="menu" size={30} />
        </button>
      )}

      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden relative">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 min-h-full">
          {renderView()}
        </div>
      </main>

      {/* PWA Install Prompt */}
      <PWAPrompt />
    </div>
  );
};

export default App;

