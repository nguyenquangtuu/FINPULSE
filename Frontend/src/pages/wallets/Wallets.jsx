import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Building2,
  Smartphone,
  PiggyBank,
  CreditCard,
  Plus,
  ArrowRightLeft,
  Edit2,
  Trash2,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Coins,
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Select } from '../../components/common/Select';
import { Modal } from '../../components/common/Modal';

const WALLET_TYPE_OPTIONS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'BANK', label: 'Tài khoản Ngân hàng' },
  { value: 'E_WALLET', label: 'Ví điện tử (MoMo, ZaloPay...)' },
  { value: 'SAVINGS', label: 'Sổ tiết kiệm' },
  { value: 'OTHER', label: 'Khác' },
];

const WALLET_ICONS = {
  Wallet: Wallet,
  Building2: Building2,
  Smartphone: Smartphone,
  PiggyBank: PiggyBank,
  CreditCard: CreditCard,
};

const COLOR_PRESETS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export const Wallets = () => {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);

  // Wallet form state
  const [name, setName] = useState('');
  const [walletType, setWalletType] = useState('CASH');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#10B981');
  const [icon, setIcon] = useState('Wallet');
  const [isDefault, setIsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Transfer form state
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState('');

  const loadWallets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/finance/wallets');
      const data = res.data || {};
      setWallets(data.wallets || []);
      setTotalBalance(data.total_balance || 0);
    } catch (err) {
      console.error('Error loading wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const openCreateWalletModal = () => {
    setEditingWallet(null);
    setName('');
    setWalletType('CASH');
    setInitialBalance('');
    setColor('#10B981');
    setIcon('Wallet');
    setIsDefault(wallets.length === 0);
    setError('');
    setWalletModalOpen(true);
  };

  const openEditWalletModal = (w) => {
    setEditingWallet(w);
    setName(w.name);
    setWalletType(w.wallet_type);
    setInitialBalance(String(Math.round(w.initial_balance || 0)));
    setColor(w.color || '#10B981');
    setIcon(w.icon || 'Wallet');
    setIsDefault(Boolean(w.is_default));
    setError('');
    setWalletModalOpen(true);
  };

  const openTransferModal = (defaultFromId = '') => {
    setFromWalletId(defaultFromId || (wallets[0]?.wallet_id || ''));
    const nextWallet = wallets.find((w) => w.wallet_id !== defaultFromId);
    setToWalletId(nextWallet ? nextWallet.wallet_id : '');
    setTransferAmount('');
    setTransferNote('');
    setTransferError('');
    setTransferModalOpen(true);
  };

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên ví / tài khoản');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (editingWallet) {
        await api.put(`/api/finance/wallets/${editingWallet.wallet_id}`, {
          name: name.trim(),
          wallet_type: walletType,
          color,
          icon,
          is_default: isDefault,
        });
      } else {
        await api.post('/api/finance/wallets', {
          name: name.trim(),
          wallet_type: walletType,
          initial_balance: Number(initialBalance) || 0,
          currency: 'VND',
          color,
          icon,
          is_default: isDefault,
        });
      }
      setWalletModalOpen(false);
      await loadWallets();
    } catch (err) {
      setError(err.message || 'Không thể lưu ví tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveWallet = async (w) => {
    if (!window.confirm(`Bạn có chắc chắn muốn lưu trữ ví "${w.name}"? Ví sẽ bị ẩn khỏi danh sách chọn.`)) {
      return;
    }
    try {
      await api.delete(`/api/finance/wallets/${w.wallet_id}`);
      await loadWallets();
    } catch (err) {
      alert(err.message || 'Không thể lưu trữ ví');
    }
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!fromWalletId || !toWalletId) {
      setTransferError('Vui lòng chọn ví nguồn và ví đích');
      return;
    }
    if (fromWalletId === toWalletId) {
      setTransferError('Ví nguồn và ví đích không được trùng nhau');
      return;
    }
    if (!transferAmount || Number(transferAmount) <= 0) {
      setTransferError('Số tiền chuyển phải lớn hơn 0');
      return;
    }

    setTransferSubmitting(true);
    setTransferError('');

    try {
      await api.post('/api/finance/transfers', {
        from_wallet_id: fromWalletId,
        to_wallet_id: toWalletId,
        amount: Number(transferAmount),
        note: transferNote.trim() || undefined,
      });
      setTransferModalOpen(false);
      await loadWallets();
    } catch (err) {
      setTransferError(err.message || 'Lỗi thực hiện chuyển tiền');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const fromWalletObj = wallets.find((w) => w.wallet_id === fromWalletId);
  const toWalletObj = wallets.find((w) => w.wallet_id === toWalletId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Quản lý Ví & Nguồn tiền
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Theo dõi số dư khả dụng trên từng ví tiền mặt, thẻ ngân hàng, ví điện tử và luân chuyển dòng tiền.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {wallets.length >= 2 && (
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowRightLeft}
              onClick={() => openTransferModal()}
            >
              Chuyển tiền nội bộ
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openCreateWalletModal}
          >
            Thêm ví mới
          </Button>
        </div>
      </div>

      {/* Net Worth Summary Banner */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-accent-primary/10 text-accent-primary flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-text-secondary font-medium">Tổng tài sản khả dụng (Net Worth)</span>
              <div className="text-2xl font-bold text-text-primary tabular-nums tracking-tight">
                {formatCurrency(totalBalance, user?.currency || 'VND')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-border-subtle pt-3 md:pt-0 md:pl-6 text-xs text-text-secondary">
            <div>
              <span className="block text-[11px]">Số lượng ví</span>
              <span className="text-sm font-semibold text-text-primary tabular-nums">{wallets.length} ví hoạt động</span>
            </div>
            <div>
              <span className="block text-[11px]">Đơn vị tiền tệ</span>
              <span className="text-sm font-semibold text-text-primary">{user?.currency || 'VND'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-text-secondary">
          Đang tải dữ liệu ví tài chính...
        </div>
      ) : wallets.length === 0 ? (
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-12 text-center">
          <Wallet className="w-10 h-10 text-text-secondary/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-text-primary">
            Chưa có ví tiền hoặc tài khoản nào
          </h3>
          <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
            Tạo các ví tiền mặt, tài khoản ngân hàng hoặc ví điện tử để bắt đầu quản lý nguồn tiền.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            icon={Plus}
            onClick={openCreateWalletModal}
          >
            Tạo ví đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((w) => {
            const IconComponent = WALLET_ICONS[w.icon] || Wallet;
            const typeLabel = WALLET_TYPE_OPTIONS.find((t) => t.value === w.wallet_type)?.label || 'Khác';

            return (
              <div
                key={w.wallet_id}
                className="bg-bg-surface border border-border-subtle rounded-lg p-5 flex flex-col justify-between hover:border-accent-primary/40 transition-colors shadow-xs relative overflow-hidden"
              >
                {/* Accent top stripe */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: w.color || '#10B981' }}
                />

                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${w.color || '#10B981'}15`,
                          color: w.color || '#10B981',
                        }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-text-primary truncate">{w.name}</h3>
                          {Boolean(w.is_default) && (
                            <span className="text-[10px] bg-accent-primary/10 text-accent-primary font-medium px-1.5 py-0.2 rounded shrink-0">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-text-secondary">{typeLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openTransferModal(w.wallet_id)}
                        className="text-text-secondary hover:text-accent-primary p-1 rounded hover:bg-bg-elevated transition-colors"
                        title="Chuyển tiền từ ví này"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditWalletModal(w)}
                        className="text-text-secondary hover:text-accent-primary p-1 rounded hover:bg-bg-elevated transition-colors"
                        title="Chỉnh sửa thông tin ví"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleArchiveWallet(w)}
                        className="text-text-secondary hover:text-status-negative p-1 rounded hover:bg-bg-elevated transition-colors"
                        title="Lưu trữ ví này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border-subtle">
                    <span className="text-[11px] text-text-secondary">Số dư hiện tại</span>
                    <div className="text-xl font-bold text-text-primary tabular-nums mt-0.5">
                      {formatCurrency(w.balance, user?.currency || 'VND')}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-text-secondary pt-2 border-t border-border-subtle/50">
                  <span>Số dư ban đầu: {formatCurrency(w.initial_balance, user?.currency || 'VND')}</span>
                  <span>{formatDate(w.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Wallet Modal */}
      <Modal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        title={editingWallet ? 'Chỉnh sửa ví tài chính' : 'Thêm ví tài chính mới'}
      >
        <form onSubmit={handleSaveWallet} className="space-y-4">
          {error && (
            <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Tên ví / Tài khoản <span className="text-status-negative">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Tiền mặt, Vietcombank, Ví MoMo..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Loại ví / Nguồn tiền
            </label>
            <Select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value)}
              options={WALLET_TYPE_OPTIONS}
            />
          </div>

          {!editingWallet && (
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                Số dư ban đầu (VNĐ)
              </label>
              <CurrencyInput
                placeholder="0"
                value={initialBalance}
                onChange={(val) => setInitialBalance(val)}
              />
              <p className="text-[11px] text-text-secondary mt-1">
                Số tiền thực tế hiện có trong ví tại thời điểm tạo.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Biểu tượng đại diện
            </label>
            <div className="flex items-center gap-2">
              {Object.keys(WALLET_ICONS).map((iconKey) => {
                const Icn = WALLET_ICONS[iconKey];
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setIcon(iconKey)}
                    className={`p-2 rounded border transition-colors ${
                      icon === iconKey
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border-subtle text-text-secondary hover:border-text-primary'
                    }`}
                  >
                    <Icn className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Mã màu hiển thị
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    color === hex ? 'scale-110 border-text-primary shadow-xs' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-border-subtle text-accent-primary focus:ring-accent-primary"
            />
            <label htmlFor="is_default" className="text-xs text-text-primary cursor-pointer">
              Đặt làm ví mặc định khi ghi nhận chi tiêu & thu nhập
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWalletModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editingWallet ? 'Cập nhật ví' : 'Tạo ví mới'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Chuyển tiền nội bộ giữa các ví"
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          {transferError && (
            <div className="p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{transferError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                Từ ví nguồn (Trừ tiền) <span className="text-status-negative">*</span>
              </label>
              <Select
                value={fromWalletId}
                onChange={(e) => setFromWalletId(e.target.value)}
                options={wallets.map((w) => ({
                  value: w.wallet_id,
                  label: `${w.name} (${formatCurrency(w.balance, user?.currency || 'VND')})`,
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-secondary mb-1.5 block">
                Đến ví đích (Cộng tiền) <span className="text-status-negative">*</span>
              </label>
              <Select
                value={toWalletId}
                onChange={(e) => setToWalletId(e.target.value)}
                options={wallets.map((w) => ({
                  value: w.wallet_id,
                  label: `${w.name} (${formatCurrency(w.balance, user?.currency || 'VND')})`,
                }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Số tiền chuyển (VNĐ) <span className="text-status-negative">*</span>
            </label>
            <CurrencyInput
              placeholder="0"
              value={transferAmount}
              onChange={(val) => setTransferAmount(val)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">
              Ghi chú chuyển tiền
            </label>
            <Input
              type="text"
              placeholder="Ví dụ: Rút tiền ATM, Nạp tiền MoMo..."
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
            />
          </div>

          {/* Transfer Preview Card */}
          {fromWalletObj && toWalletObj && transferAmount && Number(transferAmount) > 0 && (
            <div className="bg-bg-elevated border border-border-subtle rounded-md p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-text-secondary">
                <span>Số dư {fromWalletObj.name} sau chuyển:</span>
                <span className="font-semibold text-status-negative tabular-nums">
                  {formatCurrency(Number(fromWalletObj.balance) - Number(transferAmount), user?.currency || 'VND')}
                </span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Số dư {toWalletObj.name} sau chuyển:</span>
                <span className="font-semibold text-status-positive tabular-nums">
                  {formatCurrency(Number(toWalletObj.balance) + Number(transferAmount), user?.currency || 'VND')}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary/70 italic pt-1 border-t border-border-subtle">
                * Giao dịch chuyển tiền nội bộ không ảnh hưởng đến báo cáo Ngân sách chi tiêu hàng tháng.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTransferModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={transferSubmitting}>
              Xác nhận chuyển tiền
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Wallets;
