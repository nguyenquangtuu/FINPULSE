import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';

export const AnalyticsReports = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_cashflow: 0,
    savings_rate: 0,
  });
  const [trends, setTrends] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [sumRes, trendRes, breakRes, insightRes] = await Promise.all([
        api.get('/api/analytics/cashflow'),
        api.get('/api/analytics/trends'),
        api.get('/api/analytics/breakdown'),
        api.get('/api/analytics/insights'),
      ]);

      setSummary(sumRes.data || {});
      setTrends(trendRes.data || []);
      setBreakdown(breakRes.data || []);
      setInsights(insightRes.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const response = await api.get(`/api/analytics/export?format=${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response], {
        type:
          format === 'pdf'
            ? 'application/pdf'
            : format === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'text/csv;charset=utf-8;',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FINPULSE_Bao_Cao_Tai_Chinh.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất báo cáo: ' + (err.message || 'Thất bại'));
    } finally {
      setExporting('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Phân tích Tài chính & Kết xuất Báo cáo
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Tổng hợp dòng tiền ròng, phân tích thói quen tiêu dùng và xuất bảng kê PDF, Excel (.xlsx), CSV.
          </p>
        </div>

        {/* 1-Click Export Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={FileSpreadsheet}
            loading={exporting === 'xlsx'}
            onClick={() => handleExport('xlsx')}
          >
            Xuất Excel (.xlsx)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            loading={exporting === 'csv'}
            onClick={() => handleExport('csv')}
          >
            Xuất CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={FileText}
            loading={exporting === 'pdf'}
            onClick={() => handleExport('pdf')}
          >
            Xuất PDF (.pdf)
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="text-xs text-text-secondary font-medium">Tổng Thu Nhập</div>
          <div className="mt-2 text-xl font-bold text-status-positive tabular-nums">
            +{formatCurrency(summary.total_income, user?.currency)}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="text-xs text-text-secondary font-medium">Tổng Chi Tiêu</div>
          <div className="mt-2 text-xl font-bold text-status-negative tabular-nums">
            -{formatCurrency(summary.total_expense, user?.currency)}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="text-xs text-text-secondary font-medium">Dòng Tiền Ròng (Surplus)</div>
          <div className="mt-2 text-xl font-bold text-text-primary tabular-nums">
            {formatCurrency(summary.net_cashflow, user?.currency)}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4">
          <div className="text-xs text-text-secondary font-medium">Tỷ Lệ Tiết Kiệm</div>
          <div className="mt-2 text-xl font-bold text-accent-primary tabular-nums">
            {summary.savings_rate}%
          </div>
        </div>
      </div>

      {/* Financial Insights Card */}
      {insights && (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-primary mb-3">
            <Sparkles className="w-4 h-4" />
            <span>Hiểu biết tài chính thông minh (Financial Insights)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {insights.top_category && (
              <div className="p-3 bg-bg-elevated rounded border border-border-subtle flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-status-negative/15 text-status-negative flex items-center justify-center font-bold text-xs shrink-0">
                  TOP
                </div>
                <div>
                  <div className="text-text-secondary">Danh mục chiếm tỷ trọng cao nhất</div>
                  <div className="font-bold text-text-primary text-sm mt-0.5">
                    {insights.top_category.category_name}
                  </div>
                  <div className="text-status-negative font-semibold mt-0.5 tabular-nums">
                    {formatCurrency(insights.top_category.amount, user?.currency)}
                  </div>
                </div>
              </div>
            )}

            {insights.peak_day && (
              <div className="p-3 bg-bg-elevated rounded border border-border-subtle flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-status-warning/15 text-status-warning flex items-center justify-center font-bold text-xs shrink-0">
                  PEAK
                </div>
                <div>
                  <div className="text-text-secondary">Ngày chi tiêu đột biến nhiều nhất</div>
                  <div className="font-bold text-text-primary text-sm mt-0.5">
                    {formatDate(insights.peak_day.date)}
                  </div>
                  <div className="text-text-secondary mt-0.5">
                    Tổng chi: <strong className="text-text-primary tabular-nums">{formatCurrency(insights.peak_day.amount, user?.currency)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Area Trends Chart */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">
          Xu hướng Dòng tiền theo Thời gian
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          Biểu đồ biến động giữa Thu nhập, Chi tiêu và Thặng dư
        </p>

        <div className="h-72 w-full">
          {trends.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-secondary">
              Chưa có dữ liệu giao dịch
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--status-positive)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--status-positive)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--status-negative)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--status-negative)" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Thu nhập"
                  stroke="var(--status-positive)"
                  fillOpacity={1}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Chi tiêu"
                  stroke="var(--status-negative)"
                  fillOpacity={1}
                  fill="url(#expenseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
