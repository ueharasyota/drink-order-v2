// app/new-order/page.tsx
'use client';

import NewOrderForm from '../components/NewOrderForm'; // 正しいパスに注意

export default function Page() {
  return (
    <main className="min-h-screen p-4 bg-[#f8f5f0] font-sans">
      <NewOrderForm />
    </main>
  );
}
