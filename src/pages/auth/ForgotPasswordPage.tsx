import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SchoolLogo } from '../../components/ui/SchoolLogo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { APP_CONFIG } from '../../config/appConfig';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage('Email wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Format email tidak valid.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(trimmed);
      setIsSubmitted(true);
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
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3">
              <SchoolLogo size="lg" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Pemulihan Kata Sandi
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#6B7280] mt-1">
              {APP_CONFIG.schoolName}
            </p>
          </div>

          {/* Success State */}
          {isSubmitted ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800">
                  <p className="font-bold">Permintaan reset password berhasil diproses.</p>
                  <p className="mt-1">
                    Tautan pemulihan kata sandi telah dikirim ke <strong>{email}</strong> jika terdaftar di sistem.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/login" className="block w-full">
                  <Button variant="outline" size="md" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                    Kembali ke Halaman Masuk
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#6B7280]">
                Masukkan alamat email resmi pegawai yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi Anda.
              </p>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

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

              <div className="pt-2 space-y-2.5">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full"
                  rightIcon={<Send className="w-4 h-4 ml-1" />}
                >
                  {isLoading ? 'Memproses...' : 'Kirim Link Reset Password'}
                </Button>

                <Link to="/login" className="block text-center">
                  <Button variant="ghost" size="sm" type="button" className="w-full text-xs" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                    Kembali ke Halaman Masuk
                  </Button>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-[#9CA3AF] py-4">
        <p>
          © {APP_CONFIG.copyrightYear} {APP_CONFIG.appName} · {APP_CONFIG.schoolName}
        </p>
      </footer>
    </div>
  );
};
