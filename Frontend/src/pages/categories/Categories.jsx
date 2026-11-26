import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Trash2,
  Lock,
  ChevronRight,
  Folder,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [parentId, setParentId] = useState('');
  const [color, setColor] = useState('#247A61');
  const [icon, setIcon] = useState('folder');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/categories?format=tree');
      setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/categories', {
        name: name.trim(),
        type,
        color,
        icon,
        parent_id: parentId || null,
      });
      setModalOpen(false);
      setName('');
      loadCategories();
    } catch (err) {
      setError(err.message || 'Lỗi tạo danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn lưu trữ ẩn danh mục này? Các giao dịch lịch sử gắn với danh mục sẽ không bị xóa (Soft Delete).')) {
      try {
        await api.delete(`/api/categories/${id}`);
        loadCategories();
      } catch (err) {
        alert('Lỗi: ' + (err.message || 'Thất bại'));
      }
    }
  };

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Phân loại & Quản trị Danh mục
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Quản lý cấu trúc danh mục Cha - Con, tùy chỉnh màu sắc và cơ chế lưu trữ ẩn (Soft Delete) bảo vệ toàn vẹn lịch sử.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => {
            setName('');
            setParentId('');
            setModalOpen(true);
          }}
        >
          Thêm danh mục riêng
        </Button>
      </div>

      {/* Two Columns: Expenses & Income Hierarchical Trees */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expenses Categories */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-negative" />
              Danh mục Chi Tiêu (Expense)
            </h2>
            <Badge variant="negative">{expenseCategories.length} danh mục gốc</Badge>
          </div>

          <div className="space-y-2">
            {expenseCategories.map((cat) => (
              <div key={cat.category_id} className="border border-border-subtle rounded p-2.5 bg-bg-elevated/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {cat.name}
                    </span>
                    {cat.is_system && (
                      <span className="text-[10px] text-text-secondary flex items-center gap-0.5 bg-bg-surface px-1.5 py-0.2 rounded border border-border-subtle">
                        <Lock className="w-2.5 h-2.5" /> Hệ thống
                      </span>
                    )}
                  </div>

                  {!cat.is_system && (
                    <button
                      onClick={() => handleDelete(cat.category_id)}
                      className="text-text-secondary hover:text-status-negative p-1 rounded cursor-pointer"
                      title="Lưu trữ ẩn (Soft Delete)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Subcategories (Children) */}
                {cat.children && cat.children.length > 0 && (
                  <div className="mt-2 pl-4 border-l-2 border-border-subtle space-y-1.5 pt-1">
                    {cat.children.map((sub) => (
                      <div
                        key={sub.category_id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-bg-surface"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-text-secondary" />
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sub.color || cat.color }}
                          />
                          <span className="text-text-secondary">{sub.name}</span>
                        </div>

                        {!sub.is_system && (
                          <button
                            onClick={() => handleDelete(sub.category_id)}
                            className="text-text-secondary hover:text-status-negative p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Income Categories */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-positive" />
              Danh mục Thu Nhập (Income)
            </h2>
            <Badge variant="positive">{incomeCategories.length} danh mục gốc</Badge>
          </div>

          <div className="space-y-2">
            {incomeCategories.map((cat) => (
              <div key={cat.category_id} className="border border-border-subtle rounded p-2.5 bg-bg-elevated/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-semibold text-text-primary truncate">
                      {cat.name}
                    </span>
                    {cat.is_system && (
                      <span className="text-[10px] text-text-secondary flex items-center gap-0.5 bg-bg-surface px-1.5 py-0.2 rounded border border-border-subtle">
                        <Lock className="w-2.5 h-2.5" /> Hệ thống
                      </span>
                    )}
                  </div>

                  {!cat.is_system && (
                    <button
                      onClick={() => handleDelete(cat.category_id)}
                      className="text-text-secondary hover:text-status-negative p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tạo danh mục tùy chỉnh mới"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
              {error}
            </div>
          )}

          <Select
            label="Loại danh mục"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setParentId('');
            }}
          >
            <option value="EXPENSE">Chi tiêu (Expense)</option>
            <option value="INCOME">Thu nhập (Income)</option>
          </Select>

          <Input
            label="Tên danh mục"
            placeholder="Ví dụ: Đồ công nghệ & Thiết bị..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Danh mục cha (Phân tầng Cha - Con)"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">-- Là danh mục gốc (Không có cha) --</option>
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  Thuộc: {c.name}
                </option>
              ))}
          </Select>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-text-secondary block mb-1.5">
                Màu sắc nhận diện
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-9 h-9 p-0.5 border border-border-subtle rounded cursor-pointer bg-bg-surface"
                />
                <span className="text-xs font-mono text-text-secondary">{color}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Tạo danh mục
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
