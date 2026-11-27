import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Mail, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { requestLogin, requestRegister, verifyOtp, demoLogin, isAuthenticated } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 mins

  const otpRefs = useRef([]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await requestLogin(email);
      } else {
        if (!fullName.trim()) {
          throw new Error('Vui lòng nhập họ và tên');
        }
        await requestRegister(email, fullName);
      }
      setStep(2);
      setCountdown(300);
    } catch (err) {
      setError(err.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, otpCode);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    setLoading(true);
    try {
      await demoLogin();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Không thể đăng nhập tài khoản Demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-bg-main text-text-primary">
      <div className="w-full max-w-md bg-bg-surface border border-border-subtle rounded-lg shadow-xl p-6 sm:p-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded bg-accent-primary text-white flex items-center justify-center font-bold text-sm shadow-xs">
            FP
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-text-primary">
              FINPULSE
            </h1>
            <p className="text-[11px] text-text-secondary">
              Nền tảng Quản lý Thu Chi & Lập Ngân Sách
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        {step === 1 && (
          <div className="flex border-b border-border-subtle mb-6 text-xs">
            <button
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`pb-2.5 font-medium flex-1 text-center transition-colors border-b-2 cursor-pointer ${
                mode === 'login'
                  ? 'border-accent-primary text-accent-primary font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Đăng nhập không mật khẩu
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`pb-2.5 font-medium flex-1 text-center transition-colors border-b-2 cursor-pointer ${
                mode === 'register'
                  ? 'border-accent-primary text-accent-primary font-semibold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded bg-status-negative/10 border border-status-negative/30 text-xs text-status-negative">
            {error}
          </div>
        )}

        {/* Step 1: Input Email Form */}
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn An"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            )}

            <Input
              label="Địa chỉ Email"
              type="email"
              placeholder="tenban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button
              type="submit"
              className="w-full mt-2"
              loading={loading}
              icon={ArrowRight}
            >
              {mode === 'login' ? 'Gửi mã xác thực đăng nhập' : 'Đăng ký & Nhận mã OTP'}
            </Button>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="w-full py-2 px-3 text-xs bg-bg-elevated hover:bg-border-subtle/50 text-text-secondary hover:text-text-primary rounded border border-border-subtle flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
                <span>Dùng nhanh tài khoản Demo (demo@finpulse.local)</span>
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Input 6-Digit OTP Form */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center">
              <h2 className="text-sm font-semibold text-text-primary">
                Nhập mã OTP 6 chữ số
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Mã xác thực đã được gửi tới{' '}
                <span className="font-semibold text-text-primary">{email}</span>
              </p>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpRefs.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-10 h-12 text-center text-lg font-bold bg-bg-main border border-border-subtle rounded focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 tabular-nums"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>
                Hiệu lực:{' '}
                <span className="font-semibold text-text-primary tabular-nums">
                  {Math.floor(countdown / 60)}:
                  {String(countdown % 60).padStart(2, '0')}
                </span>
              </span>
              <button
                type="button"
                disabled={countdown > 240}
                onClick={handleSendOtp}
                className="text-accent-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
              >
                Gửi lại mã
              </button>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Xác nhận & Vào ứng dụng
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp(['', '', '', '', '', '']);
                setError('');
              }}
              className="w-full text-center text-xs text-text-secondary hover:text-text-primary cursor-pointer"
            >
              &larr; Đổi địa chỉ email khác
            </button>
          </form>
        )}

        {/* Security Footer Notice */}
        <div className="mt-8 pt-4 border-t border-border-subtle flex items-center justify-center gap-1.5 text-[11px] text-text-secondary">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-primary" />
          <span>Bảo mật không mật khẩu dựa trên Email OTP (Zero-Password Auth)</span>
        </div>
      </div>
    </div>
  );
};
