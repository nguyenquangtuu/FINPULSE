import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastAlert, setToastAlert] = useState(null);
  const [browserPermission, setBrowserPermission] = useState('default');
  const wsRef = useRef(null);

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      return perm;
    }
    return 'denied';
  };

  const showBrowserNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Failed to display native notification:', e);
      }
    }
  };

  // Fetch initial notifications
  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/api/notifications');
      const list = res.data || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [isAuthenticated]);

  // Connect WebSocket
  useEffect(() => {
    if (!isAuthenticated) {
      if (wsRef.current) wsRef.current.close();
      return;
    }

    const token = localStorage.getItem('finpulse_access_token');
    if (!token) return;

    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + `/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'BUDGET_ALERT' || data.event === 'DAILY_REMINDER') {
          const notif = data.notification;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((c) => c + 1);

          // In-App Toast
          setToastAlert({
            title: notif.title,
            content: notif.content,
            type: notif.type,
          });

          // Native Browser Push
          showBrowserNotification(notif.title, notif.content);
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      // Reconnect after 5 seconds if still authenticated
      setTimeout(() => {
        if (isAuthenticated) {
          // Trigger reconnection loop if needed
        }
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const triggerTestNotification = async () => {
    if (!user) return;
    try {
      await api.post('/api/notifications/internal/budget-alert', {
        user_id: user.user_id,
        budget_id: 'test-budget-id',
        category_name: 'Ăn uống & Cà phê',
        threshold: 85,
        current_spent: 2550000,
        amount_limit: 3000000,
        percentage: 85.0,
      });
      await loadNotifications();
    } catch (e) {
      // Fallback local test
      const testNotif = {
        notification_id: Date.now().toString(),
        title: '⚠️ Cảnh báo ngân sách thử nghiệm (85%)',
        content: 'Bạn đã tiêu dùng 2.550.000 ₫ / 3.000.000 ₫ (85%) cho danh mục Ăn uống!',
        type: 'BUDGET_WARNING',
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setNotifications((prev) => [testNotif, ...prev]);
      setUnreadCount((c) => c + 1);
      setToastAlert(testNotif);
      showBrowserNotification(testNotif.title, testNotif.content);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toastAlert,
        setToastAlert,
        browserPermission,
        requestBrowserPermission,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        triggerTestNotification,
        refreshNotifications: loadNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
