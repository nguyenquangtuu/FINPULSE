import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Archive,
  RotateCcw,
  ChevronRight,
  Folder,
  EyeOff,
  Check,
  Tag,
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

const PRESET_COLORS = [
  '#247A61', // Emerald
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Green
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#64748B', // Slate
];

export const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'EXPENSE' | 'INCOME' | 'ARCHIVED'
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

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
      const res = await api.get('/api/categories?format=tree&include_archived=true');
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

  const openCreateModal = (parent = null, defaultType = 'EXPENSE') => {
    setEditingCategory(null);
    setName('');
    setType(parent ? parent.type : defaultType);
    setParentId(parent ? parent.category_id : '');
    setColor(parent ? parent.color : '#247A61');
    setIcon('folder');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setParentId(cat.parent_id || '');
    setColor(cat.color || '#247A61');
    setIcon(cat.icon || 'folder');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (editingCategory) {
        // Update existing category
        await api.put(`/api/categories/${editingCategory.category_id}`, {
          name: name.trim(),
          color,
          icon,
          parent_id: parentId || null,
        });
      } else {
        // Create new category
        await api.post('/api/categories', {
          name: name.trim(),
          type,
          color,
          icon,
          parent_id: parentId || null,
        });
      }
      setModalOpen(false);
      setName('');
      setEditingCategory(null);
      loadCategories();
    } catch (err) {
      setError(err.message || 'Lỗi lưu thông tin danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (cat) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn ẩn danh mục "${cat.name}"? Danh mục này sẽ tạm ẩn khỏi bảng nhập giao dịch nhưng lịch sử thu chi cũ vẫn được bảo lưu toàn vẹn.`
      )
    ) {
      try {
        await api.delete(`/api/categories/${cat.category_id}`);
        loadCategories();
      } catch (err) {
        alert('Lỗi: ' + (err.message || 'Thất bại'));
      }
    }
  };

  const handleRestore = async (cat) => {
    try {
      await api.post(`/api/categories/${cat.category_id}/restore`);
      loadCategories();
    } catch (err) {
      alert('Lỗi khôi phục: ' + (err.message || 'Thất bại'));
    }
  };

  // Separate active and archived categories
  const activeCategories = categories.filter((c) => !c.is_archived);
  const archivedCategories = categories.filter((c) => c.is_archived);

  const activeExpense = activeCategories.filter((c) => c.type === 'EXPENSE');
  const activeIncome = activeCategories.filter((c) => c.type === 'INCOME');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Phân loại & Quản trị Danh mục
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Tự do thêm mới, đổi tên, phân cấp Cha - Con, đổi màu sắc và ẩn/khôi phục danh mục theo nhu cầu tài chính cá nhân.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => openCreateModal()}
        >
          Tạo danh mục mới
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-xs">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-accent-primary text-white font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          }`}
        >
          Tất cả danh mục ({activeCategories.length})
        </button>
        <button
          onClick={() => setActiveTab('EXPENSE')}
          className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
            activeTab === 'EXPENSE'
              ? 'bg-status-negative text-white font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          }`}
        >
          Khoản Chi Tiêu (-) ({activeExpense.length})
        </button>
        <button
          onClick={() => setActiveTab('INCOME')}
          className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
            activeTab === 'INCOME'
              ? 'bg-status-positive text-white font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          }`}
        >
          Khoản Thu Nhập (+) ({activeIncome.length})
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={`px-3 py-1.5 rounded font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'ARCHIVED'
              ? 'bg-text-secondary text-white font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Đã lưu trữ / Ẩn ({archivedCategories.length})
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center text-xs text-text-secondary">
          Đang tải dữ liệu danh mục...
        </div>
      ) : activeTab === 'ARCHIVED' ? (
        /* Archived Categories View */
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Archive className="w-4 h-4 text-text-secondary" />
                Danh mục đã lưu trữ (Tạm ẩn)
              </h2>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Các danh mục này không xuất hiện khi bạn ghi chép giao dịch mới. Bạn có thể khôi phục lại bất kỳ lúc nào.
              </p>
            </div>
            <Badge variant="neutral">{archivedCategories.length} danh mục</Badge>
          </div>

          {archivedCategories.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-secondary">
              Không có danh mục nào đang bị ẩn.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {archivedCategories.map((cat) => (
                <div
                  key={cat.category_id}
                  className="flex items-center justify-between p-3 rounded border border-border-subtle bg-bg-elevated/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 opacity-50"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="truncate">
                      <span className="text-xs font-medium text-text-secondary line-through">
                        {cat.name}
                      </span>
                      <span className="block text-[10px] text-text-secondary/70">
                        {cat.type === 'INCOME' ? 'Khoản thu' : 'Khoản chi'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={RotateCcw}
                    onClick={() => handleRestore(cat)}
                    title="Khôi phục danh mục này"
                  >
                    Khôi phục
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Active Categories Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expenses Column */}
          {(activeTab === 'ALL' || activeTab === 'EXPENSE') && (
            <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-negative" />
                  Danh mục Chi Tiêu (Expense)
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="negative">{activeExpense.length} danh mục</Badge>
                  <button
                    onClick={() => openCreateModal(null, 'EXPENSE')}
                    className="text-text-secondary hover:text-accent-primary p-1 rounded hover:bg-bg-elevated transition-colors cursor-pointer"
                    title="Thêm danh mục chi tiêu"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {activeExpense.map((cat) => (
                  <div
                    key={cat.category_id}
                    className="border border-border-subtle rounded p-3 bg-bg-elevated/30 hover:border-border-subtle/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {cat.name}
                        </span>
                        {cat.children && cat.children.length > 0 && (
                          <span className="text-[10px] text-text-secondary bg-bg-surface px-1.5 py-0.5 rounded border border-border-subtle">
                            {cat.children.length} con
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openCreateModal(cat, 'EXPENSE')}
                          className="text-text-secondary hover:text-accent-primary p-1 rounded hover:bg-bg-surface cursor-pointer transition-colors"
                          title="Thêm danh mục con thuộc mục này"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-surface cursor-pointer transition-colors"
                          title="Chỉnh sửa tên và màu sắc"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(cat)}
                          className="text-text-secondary hover:text-status-negative p-1 rounded hover:bg-bg-surface cursor-pointer transition-colors"
                          title="Ẩn / Lưu trữ danh mục này"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories (Children) */}
                    {cat.children && cat.children.length > 0 && (
                      <div className="mt-2.5 pl-3.5 border-l-2 border-border-subtle space-y-1.5 pt-1">
                        {cat.children.map((sub) => (
                          <div
                            key={sub.category_id}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-bg-surface group transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-3 h-3 text-text-secondary" />
                              <span
                                className="w-2.5 h-2.5 rounded-full shadow-xs"
                                style={{ backgroundColor: sub.color || cat.color }}
                              />
                              <span className="text-text-primary font-medium">{sub.name}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() => openEditModal(sub)}
                                className="text-text-secondary hover:text-text-primary p-0.5 rounded hover:bg-bg-elevated cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleArchive(sub)}
                                className="text-text-secondary hover:text-status-negative p-0.5 rounded hover:bg-bg-elevated cursor-pointer"
                                title="Ẩn / Lưu trữ"
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Income Column */}
          {(activeTab === 'ALL' || activeTab === 'INCOME') && (
            <div className="bg-bg-surface border border-border-subtle rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
                <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-status-positive" />
                  Danh mục Thu Nhập (Income)
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="positive">{activeIncome.length} danh mục</Badge>
                  <button
                    onClick={() => openCreateModal(null, 'INCOME')}
                    className="text-text-secondary hover:text-accent-primary p-1 rounded hover:bg-bg-elevated transition-colors cursor-pointer"
                    title="Thêm danh mục thu nhập"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {activeIncome.map((cat) => (
                  <div
                    key={cat.category_id}
                    className="border border-border-subtle rounded p-3 bg-bg-elevated/30 hover:border-border-subtle/80 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-semibold text-text-primary truncate">
                          {cat.name}
                        </span>
                        {cat.children && cat.children.length > 0 && (
                          <span className="text-[10px] text-text-secondary bg-bg-surface px-1.5 py-0.5 rounded border border-border-subtle">
                            {cat.children.length} con
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openCreateModal(cat, 'INCOME')}
                          className="text-text-secondary hover:text-accent-primary p-1 rounded hover:bg-bg-surface cursor-pointer transition-colors"
                          title="Thêm danh mục con"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-surface cursor-pointer transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleArchive(cat)}
                          className="text-text-secondary hover:text-status-negative p-1 rounded hover:bg-bg-surface cursor-pointer transition-colors"
                          title="Ẩn / Lưu trữ"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subcategories (Children) */}
                    {cat.children && cat.children.length > 0 && (
                      <div className="mt-2.5 pl-3.5 border-l-2 border-border-subtle space-y-1.5 pt-1">
                        {cat.children.map((sub) => (
                          <div
                            key={sub.category_id}
                            className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-bg-surface group transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight className="w-3 h-3 text-text-secondary" />
                              <span
                                className="w-2.5 h-2.5 rounded-full shadow-xs"
                                style={{ backgroundColor: sub.color || cat.color }}
                              />
                              <span className="text-text-primary font-medium">{sub.name}</span>
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() => openEditModal(sub)}
                                className="text-text-secondary hover:text-text-primary p-0.5 rounded hover:bg-bg-elevated cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleArchive(sub)}
                                className="text-text-secondary hover:text-status-negative p-0.5 rounded hover:bg-bg-elevated cursor-pointer"
                                title="Ẩn / Lưu trữ"
                              >
                                <EyeOff className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
              {error}
            </div>
          )}

          {!editingCategory && (
            <Select
              label="Loại giao dịch"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setParentId('');
              }}
            >
              <option value="EXPENSE">Khoản Chi Tiêu (-)</option>
              <option value="INCOME">Khoản Thu Nhập (+)</option>
            </Select>
          )}

          <Input
            label="Tên danh mục"
            placeholder="Ví dụ: Đồ công nghệ, Thú cưng, Học thêm..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Danh mục cha (Cấu trúc phân tầng Cha - Con)"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">-- Là danh mục gốc (Cấp cao nhất) --</option>
            {activeCategories
              .filter(
                (c) =>
                  c.type === type &&
                  (!editingCategory || c.category_id !== editingCategory.category_id)
              )
              .map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  Trực thuộc: {c.name}
                </option>
              ))}
          </Select>

          {/* Color Picker with Preset Palettes */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Màu sắc nhận diện
            </label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setColor(preset)}
                  className={`w-6 h-6 rounded-full cursor-pointer transition-transform flex items-center justify-center ${
                    color.toLowerCase() === preset.toLowerCase()
                      ? 'scale-110 ring-2 ring-accent-primary ring-offset-2'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: preset }}
                >
                  {color.toLowerCase() === preset.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 p-0.5 border border-border-subtle rounded cursor-pointer bg-bg-surface"
              />
              <span className="text-xs font-mono text-text-secondary">{color}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingCategory ? 'Lưu thay đổi' : 'Tạo danh mục'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
