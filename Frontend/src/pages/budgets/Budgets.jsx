import React, { useState, useEffect } from 'react';
import {
  PieChart as PieIcon,
  Plus,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';

export const Budgets = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [categoryId, setCategoryId] = useState('');
  const [amountLimit, setAmountLimit] = useState('');
  const [period, setPeriod] = useState('MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [bRes, cRes] = await Promise.all([
        api.get('/api/finance/budgets'),
        api.get('/api/categories?format=flat&type=EXPENSE'),
      ]);
      setBudgets(bRes.data || []);
      setCategories(cRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Default current month start & end dates
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    setStartDate(firstDay);
    setEndDate(lastDay);
  }, []);

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!amountLimit || Number(amountLimit) <= 0) {
      setError('Hạn mức ngân sách phải lớn hơn 0');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/finance/budgets', {
        category_id: categoryId || null,
        amount_limit: Number(amountLimit),
        period,
        start_date: startDate,
        end_date: endDate,
      });
      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message || 'Lỗi thiết lập ngân sách');
    } finally {
      setSubmitting(false);
    }
  };

  const catMap = categories.reduce((acc, c) => {
    acc[c.category_id] = c;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Hạn mức ngân sách
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Thiết lập hạn mức chi tiêu định kỳ và theo dõi tỷ lệ tiêu dùng thời gian thực (Cảnh báo 80%, 90%, 100%).
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setCategoryId('');
            setAmountLimit('');
            setModalOpen(true);
          }}
        >
          Thiết lập ngân sách mới
        </Button>
      </div>

      {/* Budgets Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-text-secondary">
          Đang tải dữ liệu ngân sách...
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-12 text-center">
          <PieIcon className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-text-primary">
            Chưa có ngân sách nào được thiết lập
          </h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            Hãy đặt hạn mức chi tiêu tổng thể hoặc theo danh mục để kiểm soát tài chính tốt hơn.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            icon={Plus}
            onClick={() => setModalOpen(true)}
          >
            Tạo ngân sách đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const cat = b.category_id ? catMap[b.category_id] : null;
            const pct = b.percentage || 0;
            const isOver = pct >= 100;
            const isWarning = pct >= 80 && pct < 100;

            return (
              <div
                key={b.budget_id}
                className={`bg-bg-surface border rounded-lg p-5 flex flex-col justify-between transition-colors shadow-xs ${
                  isOver
                    ? 'border-status-negative/40'
                    : isWarning
                    ? 'border-status-warning/40'
                    : 'border-border-subtle'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat?.color || '#3B82F6' }}
                        />
                        {cat ? cat.name : 'Tổng chi tiêu toàn hệ thống'}
                      </h3>
                      <div className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatDate(b.start_date)} &ndash; {formatDate(b.end_date)}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-sm tabular-nums ${
                        isOver
                          ? 'bg-status-negative/15 text-status-negative'
                          : isWarning
                          ? 'bg-status-warning/15 text-status-warning'
                          : 'bg-status-positive/15 text-status-positive'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  {/* Numbers */}
                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-text-secondary block">Đã chi tiêu</span>
                      <span className="text-base font-bold text-text-primary tabular-nums">
                        {formatCurrency(b.spent_amount, user?.currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-text-secondary block">Hạn mức</span>
                      <span className="text-xs font-semibold text-text-secondary tabular-nums">
                        {formatCurrency(b.amount_limit, user?.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Semantic Progress Bar */}
                  <div className="mt-3 h-2 w-full bg-bg-main rounded-full overflow-hidden border border-border-subtle">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isOver
                          ? 'bg-status-negative'
                          : isWarning
                          ? 'bg-status-warning'
                          : 'bg-status-positive'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>

                {/* Footer status notice */}
                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    Còn lại:{' '}
                    <strong className="text-text-primary tabular-nums">
                      {formatCurrency(b.remaining_amount, user?.currency)}
                    </strong>
                  </span>

                  {isOver ? (
                    <span className="text-status-negative font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Bội chi!
                    </span>
                  ) : isWarning ? (
                    <span className="text-status-warning font-medium">Cảnh báo</span>
                  ) : (
                    <span className="text-status-positive font-medium">An toàn</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Budget Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thiết lập hạn mức ngân sách"
      >
        <form onSubmit={handleCreateBudget} className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
              {error}
            </div>
          )}

          <Select
            label="Áp dụng cho danh mục"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">-- Toàn bộ chi tiêu (Tổng thể) --</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Input
            label="Hạn mức tối đa (VND)"
            type="number"
            step="1000"
            min="1000"
            placeholder="Ví dụ: 3000000"
            value={amountLimit}
            onChange={(e) => setAmountLimit(e.target.value)}
            required
          />

          <Select
            label="Chu kỳ ngân sách"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="MONTH">Hàng tháng (Tháng này)</option>
            <option value="WEEK">Hàng tuần</option>
            <option value="YEAR">Hàng năm</option>
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Từ ngày"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="Đến ngày"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Lưu ngân sách
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
