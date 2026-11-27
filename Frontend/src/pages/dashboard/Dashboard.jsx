import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_cashflow: 0,
    savings_rate: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [trends, setTrends] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [netWorth, setNetWorth] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [cashflowRes, transRes, budgetRes, breakdownRes, trendRes, walletRes] = await Promise.allSettled([
          api.get('/api/analytics/cashflow'),
          api.get('/api/finance/transactions?limit=6'),
          api.get('/api/finance/budgets'),
          api.get('/api/analytics/breakdown'),
          api.get('/api/analytics/trends'),
          api.get('/api/finance/wallets'),
        ]);

        if (cashflowRes.status === 'fulfilled') setSummary(cashflowRes.value.data);
        if (transRes.status === 'fulfilled') setRecentTransactions(transRes.value.data.items || []);
        if (budgetRes.status === 'fulfilled') setBudgets(budgetRes.value.data || []);
        if (breakdownRes.status === 'fulfilled') setBreakdown(breakdownRes.value.data || []);
        if (trendRes.status === 'fulfilled') setTrends(trendRes.value.data || []);
        if (walletRes.status === 'fulfilled') {
          const wData = walletRes.value.data || {};
          setWallets(wData.wallets || []);
          setNetWorth(wData.total_balance || 0);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Compute remaining budget
  const totalBudgetLimit = budgets.reduce((acc, b) => acc + Number(b.amount_limit || 0), 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + Number(b.spent_amount || 0), 0);
  const totalBudgetRemaining = Math.max(0, totalBudgetLimit - totalBudgetSpent);

  const DONUT_COLORS = ['#247A61', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#64748B'];

  return (
    <div className="space-y-6">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Tổng quan tài chính
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Theo dõi dòng tiền thu chi, hạn mức ngân sách và biến động tài chính thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/wallets">
            <Button variant="secondary" size="sm" icon={Wallet}>
              Ví & Nguồn tiền
            </Button>
          </Link>
          <Link to="/transactions">
            <Button variant="primary" size="sm" icon={Plus}>
              Ghi giao dịch
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Financial Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Net Worth */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
            <span>Tổng tài sản (Net Worth)</span>
            <Wallet className="w-4 h-4 text-accent-primary" />
          </div>
          <div className="mt-2 text-xl font-bold text-text-primary tabular-nums">
            {formatCurrency(netWorth, user?.currency)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-text-secondary">
            <span>{wallets.length} ví hoạt động</span>
            <Link to="/wallets" className="text-accent-primary hover:underline font-medium text-[11px]">
              Quản lý ví &rarr;
            </Link>
          </div>
        </div>

        {/* Metric 2: Total Income */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
            <span>Tổng thu nhập kỳ này</span>
            <ArrowDownLeft className="w-4 h-4 text-status-positive" />
          </div>
          <div className="mt-2 text-xl font-bold text-status-positive tabular-nums">
            +{formatCurrency(summary.total_income, user?.currency)}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Khoản thu thực tế đã ghi nhận
          </div>
        </div>

        {/* Metric 3: Total Expenses */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
            <span>Tổng chi tiêu kỳ này</span>
            <ArrowUpRight className="w-4 h-4 text-status-negative" />
          </div>
          <div className="mt-2 text-xl font-bold text-status-negative tabular-nums">
            -{formatCurrency(summary.total_expense, user?.currency)}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Tổng chi tiêu các danh mục
          </div>
        </div>

        {/* Metric 4: Remaining Budget */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="flex items-center justify-between text-xs text-text-secondary font-medium">
            <span>Hạn mức ngân sách còn lại</span>
            <PieChart className="w-4 h-4 text-status-warning" />
          </div>
          <div className="mt-2 text-xl font-bold text-text-primary tabular-nums">
            {formatCurrency(totalBudgetRemaining, user?.currency)}
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Đã tiêu {totalBudgetLimit > 0 ? ((totalBudgetSpent / totalBudgetLimit) * 100).toFixed(0) : 0}% ngân sách
          </div>
        </div>
      </div>

      {/* Wallets Quick Balance Strip */}
      {wallets.length > 0 && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
            <Wallet className="w-4 h-4 text-accent-primary" />
            <span>Nguồn tiền:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {wallets.map((w) => (
              <div
                key={w.wallet_id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-bg-elevated border border-border-subtle text-xs"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: w.color || '#10B981' }}
                />
                <span className="text-text-secondary">{w.name}:</span>
                <span className="font-semibold text-text-primary tabular-nums">
                  {formatCurrency(w.balance, user?.currency || 'VND')}
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/wallets"
            className="text-xs text-accent-primary hover:underline font-medium ml-auto"
          >
            Chuyển tiền / Thêm ví &rarr;
          </Link>
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income vs Expense Trends Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-bg-surface border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Biến động Thu - Chi theo ngày
              </h2>
              <p className="text-xs text-text-secondary">
                So sánh dòng tiền phát sinh thực tế
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-xs bg-status-positive" /> Thu
              </span>
              <span className="flex items-center gap-1.5 text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-xs bg-status-negative" /> Chi
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-secondary">
                Chưa có dữ liệu giao dịch trong chu kỳ
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => val.slice(5)}
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val) => formatCurrency(val, user?.currency)}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="income" name="Thu nhập" fill="var(--status-positive)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Chi tiêu" fill="var(--status-negative)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut Chart (1 Column) */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 flex flex-col">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-text-primary">
              Cơ cấu chi tiêu danh mục
            </h2>
            <p className="text-xs text-text-secondary">
              Tỷ trọng tiêu dùng trong kỳ
            </p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            {breakdown.length === 0 ? (
              <div className="text-xs text-text-secondary">Chưa có giao dịch chi tiêu</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="total_amount"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {breakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => formatCurrency(val, user?.currency)}
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Breakdown legend list */}
          <div className="flex-1 overflow-y-auto max-h-36 space-y-2 mt-2 pt-2 border-t border-border-subtle text-xs">
            {breakdown.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color || DONUT_COLORS[idx % DONUT_COLORS.length] }}
                  />
                  <span className="truncate text-text-secondary">{item.category_name}</span>
                </div>
                <span className="font-semibold text-text-primary tabular-nums shrink-0">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Transactions & Budget Health Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions List */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Giao dịch gần đây
              </h2>
              <p className="text-xs text-text-secondary">
                5 khoản thu chi ghi nhận mới nhất
              </p>
            </div>
            <Link
              to="/transactions"
              className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-medium"
            >
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-border-subtle">
            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                Chưa có giao dịch nào. Nhấn "Ghi giao dịch" để bắt đầu!
              </div>
            ) : (
              recentTransactions.map((tx) => {
                const isIncome = tx.type === 'INCOME';
                return (
                  <div key={tx.transaction_id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-status-positive/10 text-status-positive'
                            : 'bg-status-negative/10 text-status-negative'
                        }`}
                      >
                        {isIncome ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">
                          {tx.note || (isIncome ? 'Khoản thu nhập' : 'Khoản chi tiêu')}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {formatDate(tx.transaction_date)}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`text-xs font-semibold tabular-nums shrink-0 ${
                        isIncome ? 'text-status-positive' : 'text-status-negative'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount, user?.currency)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Budget Health Progress */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Tiến độ ngân sách
              </h2>
              <p className="text-xs text-text-secondary">
                Giám sát kiểm soát chi tiêu theo hạn mức
              </p>
            </div>
            <Link
              to="/budgets"
              className="text-xs text-accent-primary hover:underline flex items-center gap-1 font-medium"
            >
              Quản lý <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {budgets.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                Chưa thiết lập ngân sách. Nhấn "Quản lý" để thêm hạn mức!
              </div>
            ) : (
              budgets.slice(0, 4).map((b) => {
                const pct = Math.min(100, b.percentage || 0);
                const isOver = b.percentage >= 100;
                const isWarning = b.percentage >= 80 && b.percentage < 100;

                return (
                  <div key={b.budget_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text-primary">
                        {b.category_id ? 'Ngân sách danh mục' : 'Tổng chi tiêu tháng'}
                      </span>
                      <span className="tabular-nums font-semibold text-text-secondary">
                        {formatCurrency(b.spent_amount, user?.currency)} / {formatCurrency(b.amount_limit, user?.currency)}
                      </span>
                    </div>

                    {/* Semantic Progress Bar */}
                    <div className="h-2 w-full bg-bg-main rounded-full overflow-hidden border border-border-subtle">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isOver
                            ? 'bg-status-negative'
                            : isWarning
                            ? 'bg-status-warning'
                            : 'bg-status-positive'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-secondary">
                      <span>Tiêu thụ: {b.percentage}%</span>
                      {isOver ? (
                        <span className="text-status-negative font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Đã vượt ngưỡng!
                        </span>
                      ) : isWarning ? (
                        <span className="text-status-warning font-medium">
                          Chạm ngưỡng cảnh báo
                        </span>
                      ) : (
                        <span className="text-status-positive font-medium">An toàn</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
