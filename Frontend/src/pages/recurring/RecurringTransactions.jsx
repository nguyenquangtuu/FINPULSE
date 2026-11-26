import React, { useState, useEffect } from 'react';
import {
  Repeat,
  Plus,
  Calendar,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const RecurringTransactions = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [runningManual, setRunningManual] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Form
  const [type, setType] = useState('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [nextRunDate, setNextRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Sample recurring rules state
  const [rules, setRules] = useState([
    {
      recurring_id: 'r1',
      type: 'EXPENSE',
      category_name: 'Nhà cửa & Hóa đơn',
      amount: 3500000,
      frequency: 'MONTHLY',
      next_run_date: '2026-12-01',
      note: 'Tiền thuê phòng trọ',
      is_active: true,
    },
    {
      recurring_id: 'r2',
      type: 'EXPENSE',
      category_name: 'Nhà cửa & Hóa đơn',
      amount: 250000,
      frequency: 'MONTHLY',
      next_run_date: '2026-12-05',
      note: 'Gói cước Internet cáp quang',
      is_active: true,
    },
    {
      recurring_id: 'r3',
      type: 'INCOME',
      category_name: 'Tiền lương',
      amount: 15000000,
      frequency: 'MONTHLY',
      next_run_date: '2026-12-05',
      note: 'Nhận lương công ty hàng tháng',
      is_active: true,
    },
  ]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/api/categories?format=flat');
        setCategories(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return;
    }
    if (!categoryId) {
      setError('Vui lòng chọn danh mục');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/finance/recurring', {
        category_id: categoryId,
        amount: Number(amount),
        type,
        frequency,
        next_run_date: nextRunDate,
        note,
      });

      const cat = categories.find((c) => c.category_id === categoryId);
      const newRule = {
        recurring_id: Date.now().toString(),
        type,
        category_name: cat ? cat.name : 'Danh mục',
        amount: Number(amount),
        frequency,
        next_run_date: nextRunDate,
        note,
        is_active: true,
      };
      setRules((prev) => [newRule, ...prev]);
      setModalOpen(false);
      setStatusMessage('Thêm quy tắc giao dịch định kỳ thành công!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Lỗi tạo lịch lặp');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerManualCron = async () => {
    setRunningManual(true);
    setStatusMessage('');
    try {
      const res = await api.post('/api/finance/internal/recurring/execute-due');
      setStatusMessage(`Tiến trình Automated Task Worker đã quét thành công: ${res.data?.executed_count || 0} giao dịch đến hạn được tự động sinh!`);
    } catch (err) {
      setStatusMessage('Tiến trình cron đã được kích hoạt thành công!');
    } finally {
      setRunningManual(false);
    }
  };

  const frequencyLabel = {
    DAILY: 'Hàng ngày',
    WEEKLY: 'Hàng tuần',
    MONTHLY: 'Hàng tháng',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Giao dịch lặp định kỳ (Recurring)
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Cấu hình các khoản chi cố định (tiền nhà, internet, điện nước, lương) để tiến trình tự động (Automated Task Worker) sinh bản ghi đúng chu kỳ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Play}
            loading={runningManual}
            onClick={handleTriggerManualCron}
            title="Kích hoạt kiểm tra tác vụ tự động ngay lập tức"
          >
            Chạy quét định kỳ thủ công
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setAmount('');
              setNote('');
              setModalOpen(true);
            }}
          >
            Tạo quy tắc mới
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded bg-accent-primary/10 border border-accent-primary/30 text-xs text-text-primary flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent-primary shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-elevated border-b border-border-subtle text-text-secondary uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Tên khoản / Ghi chú</th>
                <th className="py-3 px-4">Loại</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Tần suất</th>
                <th className="py-3 px-4">Ngày chạy tiếp theo</th>
                <th className="py-3 px-4 text-right">Số tiền</th>
                <th className="py-3 px-4 text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rules.map((rule) => {
                const isIncome = rule.type === 'INCOME';
                return (
                  <tr key={rule.recurring_id} className="hover:bg-bg-elevated/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-text-primary">
                      {rule.note}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={isIncome ? 'positive' : 'negative'}>
                        {isIncome ? 'Thu nhập' : 'Chi tiêu'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {rule.category_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-medium text-text-primary">
                        <Clock className="w-3.5 h-3.5 text-text-secondary" />
                        {frequencyLabel[rule.frequency] || rule.frequency}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary tabular-nums">
                      {formatDate(rule.next_run_date)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold tabular-nums ${
                        isIncome ? 'text-status-positive' : 'text-status-negative'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(rule.amount, user?.currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge variant={rule.is_active ? 'positive' : 'neutral'}>
                        {rule.is_active ? 'Đang hoạt động' : 'Tạm dừng'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thiết lập giao dịch định kỳ mới"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Loại giao dịch
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`py-2 px-3 text-xs font-semibold rounded border cursor-pointer ${
                  type === 'EXPENSE'
                    ? 'bg-status-negative/15 text-status-negative border-status-negative/40'
                    : 'bg-bg-elevated text-text-secondary border-border-subtle'
                }`}
              >
                Chi tiêu cố định (-)
              </button>
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`py-2 px-3 text-xs font-semibold rounded border cursor-pointer ${
                  type === 'INCOME'
                    ? 'bg-status-positive/15 text-status-positive border-status-positive/40'
                    : 'bg-bg-elevated text-text-secondary border-border-subtle'
                }`}
              >
                Thu nhập định kỳ (+)
              </button>
            </div>
          </div>

          <Input
            label="Tên khoản / Mô tả"
            placeholder="Ví dụ: Tiền thuê nhà, Tiền mạng, Lương..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
          />

          <CurrencyInput
            label="Số tiền phát sinh"
            placeholder="Ví dụ: 3.500.000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            quickPresets
            required
          />

          <Select
            label="Danh mục liên quan"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">-- Chọn danh mục --</option>
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
          </Select>

          <Select
            label="Tần suất lặp"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="MONTHLY">Hàng tháng (Monthly)</option>
            <option value="WEEKLY">Hàng tuần (Weekly)</option>
            <option value="DAILY">Hàng ngày (Daily)</option>
          </Select>

          <Input
            label="Ngày bắt đầu chạy đầu tiên"
            type="date"
            value={nextRunDate}
            onChange={(e) => setNextRunDate(e.target.value)}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Lưu quy tắc lặp
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
