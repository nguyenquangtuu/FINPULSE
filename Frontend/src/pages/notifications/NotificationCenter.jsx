import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Send,
  Shield,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDate } from '../../utils/formatters';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerTestNotification,
    browserPermission,
    requestBrowserPermission,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [testing, setTesting] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const handleTest = async () => {
    setTesting(true);
    await triggerTestNotification();
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent-primary" />
            Trung tâm thông báo thời gian thực
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Tiếp nhận cảnh báo vượt ngưỡng ngân sách (80%, 90%, 100%), nhắc nhở thu chi và tin nhắn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Sparkles}
            loading={testing}
            onClick={handleTest}
            title="Bắn thử nghiệm 1 cảnh báo ngân sách để kiểm tra WebSocket & Web Push"
          >
            Bắn thông báo thử nghiệm
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={CheckCircle2}
              onClick={markAllAsRead}
            >
              Đọc tất cả ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* Browser Native Push Permission Card */}
      {browserPermission !== 'granted' && (
        <div className="p-4 bg-accent-primary/10 border border-accent-primary/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-accent-primary text-white shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-text-primary">
                Kích hoạt thông báo trình duyệt (Browser Push Notification)
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Nhận cảnh báo hệ điều hành ngay cả khi bạn đang chuyển sang tab khác hoặc thu nhỏ trình duyệt.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={requestBrowserPermission}
            className="shrink-0"
          >
            Cho phép thông báo
          </Button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-border-subtle text-xs gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
            filter === 'all'
              ? 'border-accent-primary text-accent-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Tất cả thông báo ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
            filter === 'unread'
              ? 'border-accent-primary text-accent-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-12 text-center text-xs text-text-secondary">
            <Bell className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
            Không có thông báo nào trong danh mục này.
          </div>
        ) : (
          filtered.map((item) => {
            const isWarning = item.type === 'BUDGET_WARNING';
            const isReminder = item.type === 'REMINDER';

            return (
              <div
                key={item.notification_id}
                className={`p-4 rounded-lg border transition-colors flex items-start gap-3.5 ${
                  item.is_read
                    ? 'bg-bg-surface border-border-subtle opacity-80'
                    : 'bg-bg-surface border-accent-primary/40 shadow-xs'
                }`}
              >
                {/* Icon indicator */}
                <div
                  className={`p-2 rounded-sm shrink-0 ${
                    isWarning
                      ? 'bg-status-warning/15 text-status-warning'
                      : isReminder
                      ? 'bg-accent-primary/15 text-accent-primary'
                      : 'bg-bg-elevated text-text-secondary'
                  }`}
                >
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : isReminder ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-text-primary truncate">
                      {item.title}
                    </h3>
                    {!item.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-status-negative shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 whitespace-pre-line">
                    {item.content}
                  </p>
                  <div className="text-[11px] text-text-secondary/70 mt-1.5">
                    {formatDate(item.created_at, true)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!item.is_read && (
                    <button
                      onClick={() => markAsRead(item.notification_id)}
                      className="p-1 rounded text-text-secondary hover:text-accent-primary hover:bg-bg-elevated transition-colors cursor-pointer text-xs"
                      title="Đánh dấu đã đọc"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(item.notification_id)}
                    className="p-1 rounded text-text-secondary hover:text-status-negative hover:bg-status-negative/10 transition-colors cursor-pointer"
                    title="Xóa thông báo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
