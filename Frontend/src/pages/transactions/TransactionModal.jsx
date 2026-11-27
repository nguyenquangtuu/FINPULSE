import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Select } from '../../components/common/Select';
import { Upload, CheckCircle2, ArrowRightLeft, Wallet } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export const TransactionModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const [type, setType] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME' | 'TRANSFER'
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentId, setAttachmentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, wRes] = await Promise.all([
          api.get('/api/categories?format=flat'),
          api.get('/api/finance/wallets'),
        ]);
        setCategories(cRes.data || []);
        const wList = wRes.data?.wallets || [];
        setWallets(wList);

        if (!initialData) {
          const defaultW = wList.find((w) => w.is_default) || wList[0];
          if (defaultW) {
            setWalletId(defaultW.wallet_id);
            const secondW = wList.find((w) => w.wallet_id !== defaultW.wallet_id);
            if (secondW) setToWalletId(secondW.wallet_id);
          }
        }
      } catch (err) {
        console.error('Error loading modal data:', err);
      }
    };

    if (isOpen) {
      loadData();
      if (initialData) {
        setType(initialData.type || 'EXPENSE');
        setAmount(initialData.amount ? String(initialData.amount) : '');
        setCategoryId(initialData.category_id || '');
        setWalletId(initialData.wallet_id || '');
        setToWalletId(initialData.to_wallet_id || '');
        setTransactionDate(
          initialData.transaction_date
            ? String(initialData.transaction_date).slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        );
        setNote(initialData.note || '');
        setAttachmentId(initialData.attachment_id || null);
        setAttachmentFile(null);
      } else {
        setType('EXPENSE');
        setAmount('');
        setCategoryId('');
        setTransactionDate(new Date().toISOString().slice(0, 10));
        setNote('');
        setAttachmentFile(null);
        setAttachmentId(null);
      }
      setError('');
    }
  }, [isOpen, initialData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Tệp đính kèm không được vượt quá 10MB (BR-08)');
      return;
    }

    setAttachmentFile(file);
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await api.post('/api/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachmentId(res.data.attachment_id);
      setError('');
    } catch (err) {
      setError('Lỗi tải tệp chứng từ: ' + (err.message || 'Thất bại'));
      setAttachmentFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!amount || Number(amount) <= 0) {
      setError('Số tiền phát sinh bắt buộc phải lớn hơn 0 (BR-04)');
      return;
    }

    if (type === 'TRANSFER') {
      if (!walletId || !toWalletId) {
        setError('Vui lòng chọn ví nguồn và ví đích');
        return;
      }
      if (walletId === toWalletId) {
        setError('Ví nguồn và ví đích không được trùng nhau');
        return;
      }
    } else {
      if (!categoryId) {
        setError('Vui lòng chọn danh mục thu chi');
        return;
      }
    }

    setLoading(true);
    try {
      if (type === 'TRANSFER') {
        await api.post('/api/finance/transfers', {
          from_wallet_id: walletId,
          to_wallet_id: toWalletId,
          amount: Number(amount),
          note: note.trim() || undefined,
          transaction_date: `${transactionDate}T12:00:00`,
        });
      } else {
        const payload = {
          type,
          amount: Number(amount),
          category_id: categoryId,
          wallet_id: walletId || undefined,
          transaction_date: `${transactionDate}T12:00:00`,
          note,
          attachment_id: attachmentId,
        };

        if (initialData?.transaction_id) {
          await api.put(`/api/finance/transactions/${initialData.transaction_id}`, payload);
        } else {
          await api.post('/api/finance/transactions', payload);
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        initialData
          ? 'Chỉnh sửa giao dịch'
          : type === 'TRANSFER'
          ? 'Chuyển tiền giữa các ví'
          : 'Ghi chép giao dịch mới'
      }
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
            {error}
          </div>
        )}

        {/* 3-Way Type Toggle: Chi - Thu - Chuyển */}
        {!initialData && (
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Loại giao dịch
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setType('EXPENSE');
                  setCategoryId('');
                }}
                className={`py-2 px-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  type === 'EXPENSE'
                    ? 'bg-status-negative/15 text-status-negative border-status-negative/40 font-bold'
                    : 'bg-bg-elevated text-text-secondary border-border-subtle hover:bg-border-subtle/50'
                }`}
              >
                Chi Tiêu (-)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('INCOME');
                  setCategoryId('');
                }}
                className={`py-2 px-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  type === 'INCOME'
                    ? 'bg-status-positive/15 text-status-positive border-status-positive/40 font-bold'
                    : 'bg-bg-elevated text-text-secondary border-border-subtle hover:bg-border-subtle/50'
                }`}
              >
                Thu Nhập (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('TRANSFER');
                  setCategoryId('');
                }}
                className={`py-2 px-2 text-xs font-semibold rounded border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  type === 'TRANSFER'
                    ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/40 font-bold'
                    : 'bg-bg-elevated text-text-secondary border-border-subtle hover:bg-border-subtle/50'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Chuyển Tiền
              </button>
            </div>
          </div>
        )}

        {/* Amount Input with VNĐ Formatting */}
        <CurrencyInput
          label="Số tiền giao dịch (VNĐ)"
          placeholder="Ví dụ: 50.000"
          value={amount}
          onChange={(val) => setAmount(val)}
          quickPresets
          required
        />

        {/* Source Wallet Selector */}
        {wallets.length > 0 && (
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              {type === 'TRANSFER' ? 'Từ ví nguồn (Trừ tiền)' : type === 'INCOME' ? 'Nhận vào ví' : 'Trừ từ ví'}
            </label>
            <Select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              options={wallets.map((w) => ({
                value: w.wallet_id,
                label: `${w.name} (${formatCurrency(w.balance, 'VND')})`,
              }))}
            />
          </div>
        )}

        {/* If Transfer: Destination Wallet */}
        {type === 'TRANSFER' && wallets.length > 0 && (
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Đến ví đích (Cộng tiền)
            </label>
            <Select
              value={toWalletId}
              onChange={(e) => setToWalletId(e.target.value)}
              options={wallets.map((w) => ({
                value: w.wallet_id,
                label: `${w.name} (${formatCurrency(w.balance, 'VND')})`,
              }))}
            />
          </div>
        )}

        {/* Category Select (Only for INCOME or EXPENSE) */}
        {type !== 'TRANSFER' && (
          <Select
            label="Danh mục thu chi"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">-- Chọn danh mục --</option>
            {filteredCategories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.parent_id ? `↳ ${c.name}` : c.name}
              </option>
            ))}
          </Select>
        )}

        {/* Date Input */}
        <Input
          label="Ngày giao dịch"
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          required
        />

        {/* Note Input */}
        <Input
          label="Ghi chú chi tiết (Tùy chọn)"
          placeholder={
            type === 'TRANSFER'
              ? 'Ví dụ: Nạp ví MoMo, Rút tiền ATM...'
              : 'Ví dụ: Cà phê sáng với đồng nghiệp...'
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Attachment Upload (for Income/Expense) */}
        {type !== 'TRANSFER' && (
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Hóa đơn chứng từ đính kèm (JPEG, PNG, PDF &le; 10MB)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed border-border-subtle hover:border-accent-primary rounded bg-bg-elevated cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-accent-primary" />
                <span className="text-text-secondary truncate">
                  {attachmentFile ? attachmentFile.name : 'Tải lên ảnh hoặc tệp chứng từ đính kèm'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              {attachmentId && (
                <span className="p-2 text-status-positive" title="Đã tải lên MinIO S3 an toàn">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {initialData
              ? 'Cập nhật giao dịch'
              : type === 'TRANSFER'
              ? 'Xác nhận chuyển tiền'
              : 'Ghi nhận giao dịch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransactionModal;
