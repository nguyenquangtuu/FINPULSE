import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  ScanLine,
  Search,
  Filter,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { TransactionModal } from './TransactionModal';
import { Link } from 'react-router-dom';

export const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;

  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const loadCategories = async () => {
    try {
      const res = await api.get('/api/categories?format=flat');
      setCategories(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
      };
      if (typeFilter) params.type = typeFilter;
      if (categoryFilter) params.category_id = categoryFilter;
      if (keyword.trim()) params.keyword = keyword.trim();

      const res = await api.get('/api/finance/transactions', { params });
      setTransactions(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, typeFilter, categoryFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này? Số tiền sẽ được hoàn trả/cập nhật lại hạn mức ngân sách.')) {
      try {
        await api.delete(`/api/finance/transactions/${id}`);
        loadTransactions();
      } catch (err) {
        alert('Lỗi xóa giao dịch: ' + (err.message || 'Thất bại'));
      }
    }
  };

  const handleViewAttachment = async (attachmentId) => {
    try {
      const res = await api.get(`/api/attachments/${attachmentId}/url`);
      const url = res.data?.presigned_url;
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('Không tìm thấy tệp chứng từ.');
      }
    } catch (err) {
      alert('Không thể mở tệp đính kèm: ' + (err.message || 'Lỗi'));
    }
  };

  const catMap = categories.reduce((acc, c) => {
    acc[c.category_id] = c;
    return acc;
  }, {});

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Sổ ghi chép giao dịch
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Quản lý toàn bộ danh sách khoản thu, chi tiêu, hóa đơn đính kèm và phân loại.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/ocr">
            <Button variant="secondary" size="sm" icon={ScanLine}>
              Quét hóa đơn OCR
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => {
              setSelectedTx(null);
              setModalOpen(true);
            }}
          >
            Thêm giao dịch
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-secondary absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm theo từ khóa ghi chú..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-xs bg-bg-main border border-border-subtle rounded focus:outline-none focus:border-accent-primary"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Tìm kiếm
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-32 h-9 text-xs"
          >
            <option value="">Tất cả loại</option>
            <option value="EXPENSE">Khoản Chi (-)</option>
            <option value="INCOME">Khoản Thu (+)</option>
          </Select>

          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="w-40 h-9 text-xs"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-elevated border-b border-border-subtle text-text-secondary uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">Ngày giao dịch</th>
                <th className="py-3 px-4">Loại</th>
                <th className="py-3 px-4">Danh mục</th>
                <th className="py-3 px-4">Ghi chú</th>
                <th className="py-3 px-4">Chứng từ</th>
                <th className="py-3 px-4 text-right">Số tiền</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-secondary">
                    Đang tải dữ liệu giao dịch...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-secondary">
                    Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isIncome = tx.type === 'INCOME';
                  const cat = catMap[tx.category_id];

                  return (
                    <tr
                      key={tx.transaction_id}
                      className="hover:bg-bg-elevated/60 transition-colors"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 text-text-secondary whitespace-nowrap">
                        {formatDate(tx.transaction_date, true)}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant={isIncome ? 'positive' : 'negative'}>
                          {isIncome ? 'Thu nhập' : 'Chi tiêu'}
                        </Badge>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-text-primary">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat?.color || '#94A3B8' }}
                          />
                          {cat?.name || 'Chưa phân loại'}
                        </span>
                      </td>

                      {/* Note */}
                      <td className="py-3 px-4 max-w-xs truncate text-text-primary">
                        {tx.note || '—'}
                      </td>

                      {/* Attachment */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {tx.attachment_id ? (
                          <button
                            onClick={() => handleViewAttachment(tx.attachment_id)}
                            className="inline-flex items-center gap-1 text-[11px] text-accent-primary hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" /> Xem ảnh
                          </button>
                        ) : (
                          <span className="text-text-secondary/50">—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                          isIncome ? 'text-status-positive' : 'text-status-negative'
                        }`}
                      >
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount, user?.currency)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setModalOpen(true);
                          }}
                          className="p-1 rounded text-text-secondary hover:text-accent-primary hover:bg-accent-primary/10 transition-colors cursor-pointer mr-1.5"
                          title="Chỉnh sửa giao dịch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.transaction_id)}
                          className="p-1 rounded text-text-secondary hover:text-status-negative hover:bg-status-negative/10 transition-colors cursor-pointer"
                          title="Xóa giao dịch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-border-subtle flex items-center justify-between text-xs text-text-secondary">
          <span>
            Hiển thị <span className="font-semibold text-text-primary">{transactions.length}</span> / {total} giao dịch
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              icon={ChevronLeft}
            >
              Trang trước
            </Button>
            <span className="font-semibold text-text-primary">
              {page} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadTransactions}
        initialData={selectedTx}
      />
    </div>
  );
};
