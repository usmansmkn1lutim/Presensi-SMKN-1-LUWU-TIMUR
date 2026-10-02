import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SchoolLogo } from '../../components/ui/SchoolLogo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { APP_CONFIG } from '../../config/appConfig';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password) {
      setErrorMessage('Password wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="h-2" />

      <div className="w-full max-w-md mx-auto">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3">
              <SchoolLogo size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Atur Ulang Kata Sandi
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#6B7280] mt-1">
              {APP_CONFIG.schoolName}
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-bold">Kata sandi berhasil diperbarui!</p>
                  <p className="mt-1">
                    Anda akan dialihkan ke halaman masuk secara otomatis dalam beberapa detik.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/login" className="block w-full">
                  <Button variant="primary" size="md" className="w-full" rightIcon={<ArrowRight className="w-4 h-4 ml-1" />}>
                    Masuk Sekarang
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#6B7280]">
                Silakan masukkan kata sandi baru untuk akun pegawai Anda (minimal 6 karakter).
              </p>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

              <div>
                <Input
                  label="Kata Sandi Baru"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password baru"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <div>
                <Input
                  label="Konfirmasi Kata Sandi Baru"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Lock className="w-4 h-4" />}
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Memproses...' : 'Simpan Kata Sandi Baru'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <footer className="text-center text-xs text-[#9CA3AF] py-4">
        <p>
          © {APP_CONFIG.copyrightYear} {APP_CONFIG.appName} · {APP_CONFIG.schoolName}
        </p>
      </footer>
    </div>
  );
};
