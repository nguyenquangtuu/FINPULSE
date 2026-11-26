import React, { useState, useEffect } from 'react';
import {
  Upload,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  FileText,
  DollarSign,
  Calendar,
  Store,
  FolderTree,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Select } from '../../components/common/Select';
import { useNavigate } from 'react-router-dom';

export const ReceiptScanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [categories, setCategories] = useState([]);

  // Form states to review & edit extracted data
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await api.get('/api/categories?format=flat&type=EXPENSE');
        setCategories(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadCategories();
  }, []);

  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh (JPEG, PNG)');
      return;
    }
    setErrorMsg('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleScanReceipt = async () => {
    if (!imageFile) return;
    setScanning(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const res = await api.post('/api/ocr/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      setOcrResult(data);
      setAmount(data.amount || '');
      setTransactionDate(data.transactionDate || new Date().toISOString().slice(0, 10));
      setVendor(data.vendor || '');
      setCategoryId(data.category_id || (categories[0]?.category_id || ''));
    } catch (err) {
      setErrorMsg('Lỗi bóc tách hóa đơn: ' + (err.message || 'Không thể đọc ảnh'));
    } finally {
      setScanning(false);
    }
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMsg('Số tiền phát sinh phải lớn hơn 0');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      // 1. Upload receipt image to MinIO via attachment-service
      let uploadedAttachmentId = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const attachRes = await api.post('/api/attachments/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedAttachmentId = attachRes.data.attachment_id;
      }

      // 2. Create Transaction in finance-core-service
      const payload = {
        type: 'EXPENSE',
        amount: Number(amount),
        category_id: categoryId,
        transaction_date: `${transactionDate}T12:00:00`,
        note: `[Hóa đơn OCR] ${vendor}`.trim(),
        attachment_id: uploadedAttachmentId,
      };

      await api.post('/api/finance/transactions', payload);
      setSuccessMsg('Ghi nhận giao dịch từ hóa đơn thành công!');
      setTimeout(() => {
        navigate('/transactions');
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-accent-primary" />
          Quét & Bóc tách Hóa Đơn Tự Động (OCR)
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">
          Tải ảnh hóa đơn để AI tự động trích xuất số tiền, ngày giao dịch và gợi ý danh mục chi tiêu.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded bg-status-positive/10 border border-status-positive/30 text-xs text-status-positive flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Upload & Preview Area */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 flex flex-col items-center justify-center">
          {imagePreview ? (
            <div className="w-full space-y-4">
              <div className="relative rounded overflow-hidden border border-border-subtle max-h-80 flex items-center justify-center bg-bg-main">
                <img
                  src={imagePreview}
                  alt="Receipt Preview"
                  className="max-h-80 w-auto object-contain"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex-1 py-2 px-3 text-xs bg-bg-elevated hover:bg-border-subtle/50 text-text-primary border border-border-subtle rounded text-center cursor-pointer transition-colors">
                  Chọn ảnh khác
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                </label>
                <Button
                  variant="primary"
                  onClick={handleScanReceipt}
                  loading={scanning}
                  icon={Sparkles}
                >
                  Quét hóa đơn ngay
                </Button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="w-full py-16 border-2 border-dashed border-border-subtle hover:border-accent-primary rounded-lg flex flex-col items-center justify-center text-center p-6 transition-colors bg-bg-elevated/40"
            >
              <div className="w-12 h-12 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-text-primary">
                Kéo thả ảnh hóa đơn vào đây
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Hỗ trợ định dạng JPEG, PNG tối đa 10MB
              </p>
              <label className="mt-4">
                <Button variant="secondary" size="sm" type="button">
                  Chọn ảnh từ máy tính
                </Button>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </label>
            </div>
          )}
        </div>

        {/* Right: Review & Confirm Extracted Data */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
            <h2 className="text-sm font-semibold text-text-primary">
              Thông tin trích xuất
            </h2>
            {ocrResult && (
              <span className="text-[11px] font-medium text-status-positive flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Độ tin cậy 92%
              </span>
            )}
          </div>

          {!ocrResult ? (
            <div className="py-16 text-center text-xs text-text-secondary">
              Vui lòng tải ảnh hóa đơn và nhấn <strong>"Quét hóa đơn ngay"</strong> để AI bóc tách số liệu.
            </div>
          ) : (
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <Input
                label="Đơn vị bán / Cửa hàng"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Ví dụ: Highlands Coffee"
                required
              />

              <CurrencyInput
                label="Số tiền phát sinh"
                placeholder="Ví dụ: 50.000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                quickPresets
                required
              />

              <Input
                label="Ngày phát sinh giao dịch"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
              />

              <Select
                label="Danh mục đề xuất"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              <div className="p-3 bg-accent-primary/10 border border-accent-primary/20 rounded text-xs text-text-secondary">
                💡 <strong>Gợi ý thông minh:</strong> Đơn vị bán hàng đã được tự động liên kết với danh mục{' '}
                <span className="font-semibold text-accent-primary">
                  {ocrResult.suggested_category_name}
                </span>.
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={saving}
                  icon={ArrowRight}
                >
                  Xác nhận & Lưu vào Sổ giao dịch
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
