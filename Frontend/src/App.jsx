import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Transactions } from './pages/transactions/Transactions';
import { Budgets } from './pages/budgets/Budgets';
import { Categories } from './pages/categories/Categories';
import { RecurringTransactions } from './pages/recurring/RecurringTransactions';
import { AnalyticsReports } from './pages/analytics/AnalyticsReports';
import { Wallets } from './pages/wallets/Wallets';
import { NotificationCenter } from './pages/notifications/NotificationCenter';
import { Settings } from './pages/settings/Settings';

export const App = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/recurring" element={<RecurringTransactions />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/analytics" element={<AnalyticsReports />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
