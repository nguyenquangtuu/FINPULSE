import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Select } from '../../components/common/Select';
import { Upload, CheckCircle2, Sparkles } from 'lucide-react';
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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrNotice, setOcrNotice] = useState('');
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
        setAmount(initialData.amount ? String(initialData.amount) : '');
        setCategoryId(initialData.category_id || '');
        setTransactionDate(initialData.transaction_date ? String(initialData.transaction_date).slice(0, 10) : new Date().toISOString().slice(0, 10));
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
      setOcrNotice('');
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
    setOcrNotice('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      // 1. Upload to attachment-service (MinIO)
      const res = await api.post('/api/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachmentId(res.data.attachment_id);
      setError('');

      // 2. If it is an image, automatically extract receipt info via OCR (UC-10 -> UC-04)
      if (file.type.startsWith('image/')) {
        setOcrLoading(true);
        try {
          const ocrRes = await api.post('/api/ocr/scan', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const ocrData = ocrRes.data || {};
          
          if (ocrData.amount) {
            setAmount(String(ocrData.amount));
          }
          if (ocrData.transaction_date) {
            setTransactionDate(String(ocrData.transaction_date).slice(0, 10));
          }
          if (ocrData.category_id) {
            setCategoryId(ocrData.category_id);
          }
          if (ocrData.merchant) {
            setNote(ocrData.merchant);
          }
          setOcrNotice(
            `✨ OCR bóc tách tự động: ${ocrData.merchant || 'Hóa đơn'} - ${Number(ocrData.amount || 0).toLocaleString('vi-VN')} đ`
          );
        } catch (ocrErr) {
          console.warn('OCR extraction skipped:', ocrErr);
        } finally {
          setOcrLoading(false);
        }
      }
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

      if (initialData?.transaction_id) {
        await api.put(`/api/finance/transactions/${initialData.transaction_id}`, payload);
      } else {
        await api.post('/api/finance/transactions', payload);
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
      title={initialData ? 'Chỉnh sửa giao dịch' : 'Ghi chép giao dịch mới'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
            {error}
          </div>
        )}

        {ocrNotice && (
          <div className="p-2.5 rounded bg-status-positive/10 border border-status-positive/30 text-xs text-status-positive flex items-center gap-1.5 animate-fadeIn">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <span>{ocrNotice}</span>
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

        {/* Amount Input with VNĐ Formatting */}
        <CurrencyInput
          label="Số tiền giao dịch"
          placeholder="Ví dụ: 50.000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          quickPresets
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
              {c.parent_id ? `↳ ${c.name}` : c.name}
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

        {/* Attachment Upload with Auto-OCR */}
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">
            Hóa đơn chứng từ đính kèm (JPEG, PNG, PDF &le; 10MB)
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed border-border-subtle hover:border-accent-primary rounded bg-bg-elevated cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-accent-primary" />
              <span className="text-text-secondary truncate">
                {attachmentFile ? attachmentFile.name : 'Tải lên ảnh hóa đơn (tự động điền qua OCR)'}
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
          {ocrLoading && (
            <p className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-accent-primary animate-spin" />
              Đang phân tích và bóc tách thông tin hóa đơn qua OCR...
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy bỏ
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {initialData ? 'Cập nhật giao dịch' : 'Ghi nhận giao dịch'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
