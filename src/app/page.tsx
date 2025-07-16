'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-green-900 overflow-hidden font-serif">
      {/* 背景のコーヒーイラスト */}
      <Image
        src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1470&q=80"
        alt="コーヒーイラスト"
        fill
        className="absolute inset-0 object-cover opacity-30 blur-sm"
        priority
      />

      {/* ボタンのコンテナ */}
      <div className="relative z-10 text-center px-6">
        <h1 className="text-white text-5xl font-bold mb-12 drop-shadow-lg tracking-wider">
          TEN-1CHI Drink ORDER
        </h1>
        <button
          onClick={() => router.push('/order-list')}
          className="bg-green-600 hover:bg-green-700 text-white text-3xl font-semibold px-20 py-6 rounded-full shadow-lg transition-colors duration-300"
          aria-label="注文一覧へ"
        >
          注文一覧
        </button>
      </div>
    </div>
  );
}
