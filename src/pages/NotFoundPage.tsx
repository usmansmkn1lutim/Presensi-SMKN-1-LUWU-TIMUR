import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <span className="text-5xl font-black text-[#F97316] font-mono">404</span>
      <h2 className="text-xl font-bold text-[#111827] mt-3">Halaman Tidak Ditemukan</h2>
      <p className="text-xs text-[#6B7280] max-w-sm mt-1.5 mb-6">
        Tautan yang Anda tuju mungkin salah ketik atau telah dipindahkan ke alamat lain.
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Kembali
        </Button>
        <Button variant="primary" size="sm" onClick={() => navigate('/dashboard')} leftIcon={<Home className="w-4 h-4" />}>
          Ke Dashboard
        </Button>
      </div>
    </div>
  );
};
