import React, { useState } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Laptop,
  Bell,
  LogOut,
  User,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { Link } from 'react-router-dom';

export const TopNav = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="h-14 bg-bg-surface border-b border-border-subtle flex items-center justify-between px-4 sm:px-6 z-20">
      {/* Mobile Toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden text-text-secondary hover:text-text-primary p-1.5 rounded hover:bg-bg-elevated"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs font-medium text-text-secondary hidden sm:inline">
          FINPULSE Workspace &bull; {user?.currency || 'VND'}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Theme Switcher Toggle */}
        <div className="flex items-center bg-bg-main border border-border-subtle rounded p-0.5">
          <button
            onClick={() => setTheme('light')}
            className={`p-1 rounded-sm text-xs transition-colors cursor-pointer ${
              theme === 'light' ? 'bg-bg-surface text-accent-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
            title="Giao diện Sáng"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-1 rounded-sm text-xs transition-colors cursor-pointer ${
              theme === 'dark' ? 'bg-bg-surface text-accent-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
            title="Giao diện Tối"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-1 rounded-sm text-xs transition-colors cursor-pointer ${
              theme === 'system' ? 'bg-bg-surface text-accent-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
            }`}
            title="Theo hệ thống"
          >
            <Laptop className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notification Bell */}
        <Link
          to="/notifications"
          className="relative text-text-secondary hover:text-text-primary p-1.5 rounded hover:bg-bg-elevated transition-colors"
          title="Thông báo"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-negative" />
          )}
        </Link>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-1.5 p-1 rounded hover:bg-bg-elevated transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-accent-primary text-white flex items-center justify-center text-[10px] font-bold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <ChevronDown className="w-3 h-3 text-text-secondary" />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-subtle rounded-md shadow-lg py-1 z-30 text-xs">
                <div className="px-3 py-2 border-b border-border-subtle">
                  <div className="font-semibold text-text-primary truncate">
                    {user?.full_name}
                  </div>
                  <div className="text-[11px] text-text-secondary truncate">
                    {user?.email}
                  </div>
                </div>

                <Link
                  to="/settings"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Cài đặt tài khoản</span>
                </Link>

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-status-negative hover:bg-status-negative/10 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
