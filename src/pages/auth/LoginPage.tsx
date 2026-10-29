import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SchoolLogo } from '../../components/ui/SchoolLogo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { APP_CONFIG } from '../../config/appConfig';

/**
 * Determines the safe post-login destination path.
 * Ignores account, profile, and login routes (which typically originate from a logout or auth loop),
 * falling back to '/dashboard', while preserving valid deep-link paths (e.g. /reports, /attendance).
 */
const getValidRedirectTarget = (targetPath?: string | null): string => {
  if (!targetPath || typeof targetPath !== 'string') {
    return '/dashboard';
  }

  // Normalize path by stripping trailing slash (except for bare root '/')
  const normalized = targetPath.length > 1 && targetPath.endsWith('/')
    ? targetPath.slice(0, -1)
    : targetPath;

  // Segment boundary check: exact match or followed by '/'
  const matchesSegment = (prefix: string) =>
    normalized === prefix || normalized.startsWith(`${prefix}/`);

  const shouldIgnore =
    matchesSegment('/account') ||
    matchesSegment('/profile') ||
    matchesSegment('/login');

  return shouldIgnore ? '/dashboard' : normalized;
};

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirection target after successful login
  const rawTarget = (location.state as { from?: { pathname: string } })?.from?.pathname;
  const from = getValidRedirectTarget(rawTarget);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent double submission
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Email wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Format email tidak valid.');
      return;
    }

    if (!password) {
      setErrorMessage('Password wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      await signIn({ email: trimmedEmail, password, rememberMe });
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

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top spacer */}
      <div className="h-2" />

      {/* Center Login Box */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Header & Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3 mt-4">
              <SchoolLogo size="lg" variant="dark" className="w-[90px] h-[90px]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#F97316] tracking-tight font-casual">
              Tamaki
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#111827] mt-1">
              Presensi Digital GTK
            </p>
            <p className="text-xs sm:text-sm font-medium text-[#6B7280] mt-0.5">
              {APP_CONFIG.schoolName}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Alamat Email Pegawai"
                type="email"
                placeholder="Masukkan email"
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
                placeholder="Masukkan password"
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

            {/* Remember Me & Forgot Password Link */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#4B5563]">
                <span className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="sr-only peer"
                  />
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded border transition-colors flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-[#F97316] peer-focus-visible:ring-offset-1 ${
                      rememberMe
                        ? 'bg-[#F97316] border-[#F97316]'
                        : 'bg-white border-[#D1D5DB]'
                    }`}
                  >
                    {rememberMe && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </span>
                </span>
                <span>Ingat saya di perangkat ini</span>
              </label>

              <Link
                to="/forgot-password"
                className="font-medium text-[#F97316] hover:text-[#EA580C] transition-colors"
              >
                Lupa password?
              </Link>
            </div>

            {/* Primary Submit Button (Sunset Orange) */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full"
                rightIcon={!isLoading ? <ArrowRight className="w-4 h-4 ml-1" /> : undefined}
              >
                {isLoading ? 'Memproses...' : 'Masuk'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#9CA3AF] py-4">
        <p>
          © {APP_CONFIG.copyrightYear} Tamaki · Presensi Digital GTK · {APP_CONFIG.schoolName}
        </p>
        <p className="text-[11px] mt-1 text-[#9CA3AF]">
          Versi {APP_CONFIG.version} · Terintegrasi Supabase Auth
        </p>
      </footer>
    </div>
  );
};
