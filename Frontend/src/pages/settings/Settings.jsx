import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Bell,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Trash2,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { formatDate } from '../../utils/formatters';
import api from '../../services/api';

export const Settings = () => {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [tab, setTab] = useState('profile'); // 'profile' | 'preferences' | 'sessions'
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currency, setCurrency] = useState(user?.currency || 'VND');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  // Notification Preferences
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState('');

  // Active Sessions
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setCurrency(user.currency || 'VND');
    }

    const loadPrefsAndSessions = async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          api.get('/api/notifications/preferences'),
          api.get('/api/auth/sessions'),
        ]);
        if (pRes.data) {
          setEmailAlerts(pRes.data.email_alerts_enabled);
          setDailyReminder(pRes.data.daily_reminder_enabled);
          setReminderTime(pRes.data.daily_reminder_time || '20:00');
        }
        if (sRes.data) {
          setSessions(sRes.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadPrefsAndSessions();
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');

    try {
      await updateProfile({ full_name: fullName, currency });
      setProfileSuccess('Cập nhật thông tin hồ sơ thành công!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Thất bại'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefsSuccess('');

    try {
      await api.put('/api/notifications/preferences', {
        email_alerts_enabled: emailAlerts,
        daily_reminder_enabled: dailyReminder,
        daily_reminder_time: reminderTime,
      });
      setPrefsSuccess('Đã cập nhật tùy chọn nhận thông báo!');
      setTimeout(() => setPrefsSuccess(''), 3000);
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Thất bại'));
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (window.confirm('Bạn có chắc muốn thu hồi phiên đăng nhập này và đăng xuất thiết bị từ xa?')) {
      try {
        await api.post(`/api/auth/sessions/${sessionId}/revoke`);
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));
      } catch (err) {
        alert('Lỗi thu hồi phiên: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary">
          Cài đặt & Quản trị Hệ thống
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Tùy chỉnh hồ sơ người dùng, đơn vị tiền tệ, giao diện và giám sát bảo mật phiên đăng nhập.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle text-xs gap-4">
        <button
          onClick={() => setTab('profile')}
          className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'profile'
              ? 'border-accent-primary text-accent-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Hồ sơ & Tiền tệ
        </button>
        <button
          onClick={() => setTab('preferences')}
          className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'preferences'
              ? 'border-accent-primary text-accent-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Giao diện & Thông báo
        </button>
        <button
          onClick={() => setTab('sessions')}
          className={`pb-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
            tab === 'sessions'
              ? 'border-accent-primary text-accent-primary font-semibold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Bảo mật & Phiên hoạt động
        </button>
      </div>

      {/* Tab 1: Profile & Currency */}
      {tab === 'profile' && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            {profileSuccess && (
              <div className="p-3 rounded bg-status-positive/10 border border-status-positive/30 text-xs text-status-positive flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <Input
              label="Địa chỉ Email (Định danh hệ thống)"
              value={user?.email || ''}
              disabled
              helperText="Email là khóa định danh duy nhất (BR-01) và không thể thay đổi."
            />

            <Input
              label="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Select
              label="Đơn vị tiền tệ hiển thị mặc định"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="VND">VND (Việt Nam Đồng - ₫)</option>
              <option value="USD">USD (Đô la Mỹ - $)</option>
            </Select>

            <div className="pt-2">
              <Button type="submit" variant="primary" loading={savingProfile}>
                Lưu thay đổi hồ sơ
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Preferences & Theme */}
      {tab === 'preferences' && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 space-y-6">
          {prefsSuccess && (
            <div className="p-3 rounded bg-status-positive/10 border border-status-positive/30 text-xs text-status-positive flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{prefsSuccess}</span>
            </div>
          )}

          {/* Theme switcher */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              Giao diện ứng dụng (Theme Mode)
            </h3>
            <p className="text-xs text-text-secondary mb-3">
              Lựa chọn chế độ hiển thị phù hợp với thị giác của bạn.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 py-3 px-4 rounded border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  theme === 'light'
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                <Sun className="w-4 h-4" /> Chế độ Sáng (Light)
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 py-3 px-4 rounded border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                <Moon className="w-4 h-4" /> Chế độ Tối (Dark)
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex-1 py-3 px-4 rounded border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                  theme === 'system'
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                <Laptop className="w-4 h-4" /> Theo Hệ Thống
              </button>
            </div>
          </div>

          {/* Email notifications settings */}
          <form onSubmit={handleSavePrefs} className="border-t border-border-subtle pt-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">
              Cài đặt Kênh Email Cảnh báo (SMTP)
            </h3>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="mt-0.5 rounded text-accent-primary focus:ring-accent-primary"
              />
              <div>
                <div className="text-xs font-semibold text-text-primary">
                  Nhận email cảnh báo khi chạm mốc 80%, 90%, 100% ngân sách
                </div>
                <div className="text-[11px] text-text-secondary">
                  Hệ thống tự động dispatch email đến {user?.email} qua máy chủ SMTP.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dailyReminder}
                onChange={(e) => setDailyReminder(e.target.checked)}
                className="mt-0.5 rounded text-accent-primary focus:ring-accent-primary"
              />
              <div>
                <div className="text-xs font-semibold text-text-primary">
                  Nhắc nhở cập nhật sổ thu chi mỗi tối
                </div>
                <div className="text-[11px] text-text-secondary">
                  Gửi thông báo nhắc ghi chép chi tiêu trong ngày nếu bạn chưa nhập liệu.
                </div>
              </div>
            </label>

            {dailyReminder && (
              <div className="pl-6 max-w-xs">
                <Input
                  label="Khung giờ nhắc nhở"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" variant="primary" loading={savingPrefs}>
              Lưu cài đặt thông báo
            </Button>
          </form>
        </div>
      )}

      {/* Tab 3: Security & Active Sessions */}
      {tab === 'sessions' && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Phiên đăng nhập đang hoạt động (FR-06)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Danh sách các thiết bị đang đăng nhập tài khoản. Bạn có thể thu hồi phiên và đăng xuất từ xa bất cứ lúc nào.
            </p>
          </div>

          <div className="divide-y divide-border-subtle border border-border-subtle rounded">
            {sessions.map((s) => (
              <div
                key={s.session_id}
                className="p-3.5 flex items-center justify-between text-xs hover:bg-bg-elevated/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-bg-elevated text-text-secondary">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">
                      {s.device_info || 'Trình duyệt Web'}
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">
                      IP: {s.ip_address || '127.0.0.1'} &bull; Đăng nhập lúc: {formatDate(s.created_at, true)}
                    </div>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevokeSession(s.session_id)}
                >
                  Đăng xuất từ xa
                </Button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border-subtle flex justify-end">
            <Button variant="secondary" size="sm" icon={LogOut} onClick={logout}>
              Đăng xuất khỏi thiết bị này
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
