import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  FolderTree,
  Repeat,
  BarChart3,
  ScanLine,
  Bell,
  Settings,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

export const Sidebar = ({ onClose }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Giao dịch', path: '/transactions', icon: ArrowLeftRight },
        { label: 'Ngân sách', path: '/budgets', icon: PieChart },
        { label: 'Danh mục', path: '/categories', icon: FolderTree },
        { label: 'Giao dịch lặp', path: '/recurring', icon: Repeat },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Báo cáo & Phân tích', path: '/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Utilities',
      items: [
        { label: 'Quét hóa đơn OCR', path: '/ocr', icon: ScanLine },
        { label: 'Thông báo', path: '/notifications', icon: Bell, badge: unreadCount },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Cài đặt & Bảo mật', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-60 h-screen bg-bg-surface border-r border-border-subtle flex flex-col shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-5 border-b border-border-subtle gap-2.5">
        <div className="w-7 h-7 rounded bg-accent-primary flex items-center justify-center text-white font-bold text-sm shadow-xs">
          FP
        </div>
        <div>
          <span className="font-semibold text-sm tracking-tight text-text-primary">
            FINPULSE
          </span>
          <span className="text-[10px] ml-1.5 px-1 py-0.2 bg-accent-primary/10 text-accent-primary font-medium rounded-sm">
            PRO
          </span>
        </div>
      </div>

      {/* Navigation Group Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-2 mb-1.5 text-[11px] font-semibold tracking-wider text-text-secondary/70 uppercase">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-accent-primary/10 text-accent-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-status-negative text-white font-bold">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-border-subtle">
        <div className="flex items-center gap-2.5 p-1.5 rounded hover:bg-bg-elevated transition-colors">
          <div className="w-8 h-8 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center font-bold text-xs">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">
              {user?.full_name || 'Người dùng'}
            </div>
            <div className="text-[11px] text-text-secondary truncate">
              {user?.email || 'user@finpulse.local'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
