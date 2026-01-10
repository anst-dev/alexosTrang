import React from 'react';
import { NavItem, View } from '../types';
import { Icon } from './ui/Icon';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: View.DASHBOARD, label: 'Bảng tin', icon: 'dashboard' },
  { id: View.GOALS, label: 'Mục tiêu', icon: 'flag' },
  { id: View.INBOX, label: 'Hộp thư', icon: 'inbox' },
  { id: View.HABITS, label: 'Thói quen', icon: 'check_box' },
  { id: View.FOCUS, label: 'Tập trung', icon: 'timer' },
  { id: View.JOURNAL, label: 'Nhật ký', icon: 'book' },
  { id: View.SETTINGS, label: 'Cài đặt', icon: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isMobileMenuOpen, toggleMobileMenu }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r-4 border-neo-black flex flex-col transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static
      `}>
        {/* Header */}
        <div className="p-6 border-b-4 border-neo-black bg-gray-50 flex items-center gap-4">
          <div 
            className="w-12 h-12 border-2 border-neo-black bg-neo-yellow shadow-hard-sm flex items-center justify-center"
          >
            <Icon name="bolt" className="text-neo-black" size={24} />
          </div>
          <div>
            <h1 className="font-display font-black text-xl uppercase leading-none">Alex OS</h1>
            <div className="inline-block border border-neo-black bg-neo-yellow px-1 mt-1">
              <span className="font-mono text-xs font-bold">V 2.0</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 768) toggleMobileMenu();
                }}
                className={`
                  w-full flex items-center gap-4 px-4 py-4 border-2 font-mono font-bold uppercase transition-all
                  ${isActive 
                    ? 'bg-neo-black text-white border-neo-black shadow-hard-sm' 
                    : 'bg-white text-neo-black border-transparent hover:border-neo-black hover:bg-neo-lime hover:shadow-hard-sm'
                  }
                `}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t-4 border-neo-black bg-neo-black text-white">
          <button className="flex items-center gap-3 w-full hover:text-neo-red transition-colors">
            <Icon name="power_settings_new" />
            <span className="font-mono font-bold uppercase">Tắt máy</span>
          </button>
        </div>
      </aside>
    </>
  );
};