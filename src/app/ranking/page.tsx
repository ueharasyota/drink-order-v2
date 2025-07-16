'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Order = {
  id: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'canceled';
  drinkType: 'ice' | 'hot';
  menu: string;
  price: number;
  milk: boolean;
  sugar: boolean;
  tableNumber: string;
  paymentMethod: string;
  receiptStatus: string;
  cashAmount: number;
  note: string;
};

export default function RankingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase.from('orders').select('*');
      if (error) {
        console.error('取得エラー:', error);
        return;
      }
      const converted = data.map(order => ({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        drinkType: order.drink_type,
        menu: order.menu,
        price: order.price,
        milk: order.milk,
        sugar: order.sugar,
        tableNumber: order.table_number,
        paymentMethod: order.paymentMethod,
        receiptStatus: order.receiptStatus,
        cashAmount: order.cashAmount,
        note: order.note
      }));
      setOrders(converted);
    };
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.status !== 'completed') return false;
      const date = order.createdAt.slice(0, mode === 'daily' ? 10 : 7);
      return mode === 'daily' ? date === selectedDate : date === selectedYearMonth;
    });
  }, [orders, mode, selectedDate, selectedYearMonth]);

  const calcRanking = (orders: Order[], type?: 'ice' | 'hot') => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      if (type && order.drinkType !== type) return;
      counts[order.menu] = (counts[order.menu] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([menu, count]) => ({ menu, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const totalRanking = useMemo(() => calcRanking(filteredOrders), [filteredOrders]);
  const iceRanking = useMemo(() => calcRanking(filteredOrders, 'ice'), [filteredOrders]);
  const hotRanking = useMemo(() => calcRanking(filteredOrders, 'hot'), [filteredOrders]);

  const salesDays = useMemo(() => {
    if (mode !== 'monthly') return [];
    const days: Record<string, { date: string; count: number; topMenu: string }> = {};
    filteredOrders.forEach(order => {
      const date = order.createdAt.slice(0, 10);
      if (!days[date]) days[date] = { date, count: 0, topMenu: '' };
      days[date].count++;
    });
    Object.keys(days).forEach(date => {
      const dayOrders = filteredOrders.filter(o => o.createdAt.slice(0, 10) === date);
      const menuCount: Record<string, number> = {};
      dayOrders.forEach(o => {
        menuCount[o.menu] = (menuCount[o.menu] || 0) + 1;
      });
      const topMenu = Object.entries(menuCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      days[date].topMenu = topMenu;
    });
    return Object.values(days).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredOrders, mode]);

  const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

  const RankingSection = ({ title, ranking }: { title: string; ranking: { menu: string; count: number }[] }) => (
    <section className="bg-white rounded-lg shadow p-3 w-full max-w-md mx-auto">
      <h3 className="text-lg font-bold text-[#00704a] mb-2">{title}</h3>
      {ranking.length === 0 ? (
        <p className="text-gray-500 italic">データがありません</p>
      ) : (
        <ol className="space-y-1">
          {ranking.map((item, index) => {
            const colorClass = rankColors[index] || "text-[#4b3b2b]";
            return (
              <li key={item.menu} className={`${colorClass} text-base flex justify-start items-center gap-1`}>
                <span className="min-w-[2.5em]">{index + 1}位</span>
                <span className="truncate">{item.menu}</span>
                <span className="ml-auto">{item.count}杯</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );

  const SalesRankingSection = () => (
    <section className="bg-white rounded-lg shadow p-3 w-full max-w-md mx-auto">
      <h3 className="text-lg font-bold text-[#00704a] mb-2">売上杯数ランキング（月別のみ）</h3>
      {salesDays.length === 0 ? (
        <p className="text-gray-500 italic">データがありません</p>
      ) : (
        <ol className="space-y-1">
          {salesDays.map((item, index) => (
            <li key={item.date} className={`text-base ${rankColors[index] || "text-[#4b3b2b]"}`}>
              <div className="flex justify-start items-center gap-1">
                <span className="min-w-[2.5em]">{index + 1}位</span>
                <span>{item.count}杯</span>
              </div>
              <div className="text-sm flex justify-between">
                <span>{item.date} ({new Date(item.date).toLocaleDateString('ja-JP', { weekday: 'short' })})</span>
                <span>人気メニュー: {item.topMenu}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  return (
    <main className="p-4 max-w-5xl mx-auto bg-[#f5f3ef] rounded-lg shadow-lg font-sans text-[#4b3b2b]">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/order-list')}
          className="bg-[#00704a] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#004b38] shadow-md transition text-base min-w-[120px]"
        >
          出品一覧に戻る
        </button>
        <h2 className="text-2xl font-extrabold text-[#00704a] tracking-wide mx-auto">ドリンク販売ランキング</h2>
        <div style={{ width: '120px' }} />
      </header>

      <div className="flex flex-wrap justify-center gap-4 mb-4 items-center">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-base font-semibold">
            <input
              type="radio"
              name="mode"
              value="daily"
              checked={mode === 'daily'}
              onChange={() => setMode('daily')}
              className="w-5 h-5 accent-[#00704a]"
            />
            日別
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none text-base font-semibold">
            <input
              type="radio"
              name="mode"
              value="monthly"
              checked={mode === 'monthly'}
              onChange={() => setMode('monthly')}
              className="w-5 h-5 accent-[#00704a]"
            />
            月別
          </label>
        </div>

        {mode === 'daily' ? (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-[#4b3b2b] rounded px-3 py-1 text-base focus:outline-none focus:ring-2 focus:ring-[#00704a] cursor-pointer"
          />
        ) : (
          <input
            type="month"
            value={selectedYearMonth}
            onChange={(e) => setSelectedYearMonth(e.target.value)}
            className="border border-[#4b3b2b] rounded px-3 py-1 text-base focus:outline-none focus:ring-2 focus:ring-[#00704a] cursor-pointer"
          />
        )}
      </div>

      <div className="space-y-4">
        <RankingSection title="アイスランキング" ranking={iceRanking} />
        <RankingSection title="ホットランキング" ranking={hotRanking} />
        <RankingSection title="総合ランキング" ranking={totalRanking} />
        {mode === 'monthly' && <SalesRankingSection />}
      </div>
    </main>
  );
}
