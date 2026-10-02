import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SchoolLogo } from '../../components/ui/SchoolLogo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { APP_CONFIG } from '../../config/appConfig';
import { MOCK_USERS } from '../../services/authService';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('usman@smkn1luwutimur.sch.id');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirection target after login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login({ email, password, rememberMe });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat masuk. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top spacer */}
      <div className="h-2" />

      {/* Center Login Box */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Header & Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3">
              <SchoolLogo size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              {APP_CONFIG.appName}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#6B7280] mt-1">
              {APP_CONFIG.schoolName}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Gagal Masuk: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Alamat Email Pegawai"
                type="email"
                placeholder="nama@smkn1luwutimur.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Kata Sandi"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#4B5563]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>

              <span className="text-[#9CA3AF] cursor-default">
                Lupa sandi?
              </span>
            </div>

            {/* Primary Submit Button (Sunset Orange) */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}
              >
                MASUK
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials Picker for Evaluation */}
          <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
            <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-2.5 text-center">
              Pilihan Akun Demo (Phase 1 Testing)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('usman@smkn1luwutimur.sch.id')}
                className="p-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-[#111827] truncate">Guru (Usman)</p>
                <p className="text-[10px] text-[#6B7280]">Role: employee</p>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('admin@smkn1luwutimur.sch.id')}
                className="p-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-[#111827] truncate">Administrator</p>
                <p className="text-[10px] text-[#6B7280]">Role: admin</p>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('kepala@smkn1luwutimur.sch.id')}
                className="p-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-[#111827] truncate">Kepala Sekolah</p>
                <p className="text-[10px] text-[#6B7280]">Role: headmaster</p>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('verifikator@smkn1luwutimur.sch.id')}
                className="p-2 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] text-left transition-colors cursor-pointer"
              >
                <p className="font-semibold text-[#111827] truncate">Verifikator</p>
                <p className="text-[10px] text-[#6B7280]">Role: verifier</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#9CA3AF] py-4">
        <p>
          © {APP_CONFIG.copyrightYear} {APP_CONFIG.appName} · {APP_CONFIG.schoolName}
        </p>
        <p className="text-[11px] mt-1 text-[#9CA3AF]">
          Versi {APP_CONFIG.version} · Siap Terintegrasi Supabase
        </p>
      </footer>
    </div>
  );
};
