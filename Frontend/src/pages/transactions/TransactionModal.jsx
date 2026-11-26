import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Upload, X, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

export const TransactionModal = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentId, setAttachmentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/api/categories?format=flat');
        setCategories(res.data || []);
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    if (isOpen) {
      loadCategories();
      if (initialData) {
        setType(initialData.type || 'EXPENSE');
        setAmount(initialData.amount || '');
        setCategoryId(initialData.category_id || '');
        setTransactionDate(initialData.transaction_date ? String(initialData.transaction_date).slice(0, 10) : new Date().toISOString().slice(0, 10));
        setNote(initialData.note || '');
        setAttachmentId(initialData.attachment_id || null);
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
      setError('Tệp đính kèm không được vượt quá 10MB');
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

    if (!categoryId) {
      setError('Vui lòng chọn danh mục thu chi');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type,
        amount: Number(amount),
        category_id: categoryId,
        transaction_date: `${transactionDate}T12:00:00`,
        note,
        attachment_id: attachmentId,
      };

      await api.post('/api/finance/transactions', payload);
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
      title={initialData ? 'Chỉnh sửa giao dịch' : 'Ghi chép giao dịch mới'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
            {error}
          </div>
        )}

        {/* Type Toggle: Thu vs Chi */}
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">
            Loại giao dịch
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType('EXPENSE');
                setCategoryId('');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                type === 'EXPENSE'
                  ? 'bg-status-negative/15 text-status-negative border-status-negative/40'
                  : 'bg-bg-elevated text-text-secondary border-border-subtle hover:bg-border-subtle/50'
              }`}
            >
              Khoản Chi Tiêu (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setType('INCOME');
                setCategoryId('');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                type === 'INCOME'
                  ? 'bg-status-positive/15 text-status-positive border-status-positive/40'
                  : 'bg-bg-elevated text-text-secondary border-border-subtle hover:bg-border-subtle/50'
              }`}
            >
              Khoản Thu Nhập (+)
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <Input
          label="Số tiền (VND)"
          type="number"
          step="any"
          min="1"
          placeholder="Ví dụ: 150000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        {/* Category Select */}
        <Select
          label="Danh mục"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          <option value="">-- Chọn danh mục --</option>
          {filteredCategories.map((c) => (
            <option key={c.category_id} value={c.category_id}>
              {c.name} {c.is_system ? '(Hệ thống)' : '(Tùy chỉnh)'}
            </option>
          ))}
        </Select>

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
          placeholder="Ví dụ: Cà phê sáng với đồng nghiệp..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Attachment Upload (MinIO S3) */}
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">
            Hóa đơn chứng từ đính kèm (JPEG, PNG, PDF &le; 10MB)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed border-border-subtle hover:border-accent-primary rounded bg-bg-elevated cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-accent-primary" />
              <span className="text-text-secondary truncate">
                {attachmentFile ? attachmentFile.name : 'Tải lên ảnh hoặc tệp PDF'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            {attachmentId && (
              <span className="p-2 text-status-positive" title="Đã tải lên MinIO">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {initialData ? 'Cập nhật' : 'Ghi nhận giao dịch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
