'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/* -------------------------------------------------
   画面で使う整形済み型
-------------------------------------------------- */
type Order = {
  id: number;
  createdAt: string;
  drinkType: 'ice' | 'hot';
  menu: string;
  price: number;
  milk: string;
  sugar: string;
  tableNumber: string;
  paymentMethod: string;
  receiptStatus: string;
  cashAmount?: string;
  note: string;
  status: 'pending' | 'completed' | 'cancelled';
};

/* -------------------------------------------------
   日付フォーマッタ（JST）
-------------------------------------------------- */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jstDate.getUTCFullYear();
  const mm = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(jstDate.getUTCDate()).padStart(2, '0');
  const hh = String(jstDate.getUTCHours()).padStart(2, '0');
  const min = String(jstDate.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/* -------------------------------------------------
   API が返す camelCase 型
-------------------------------------------------- */
type ApiOrder = {
  id: number;
  createdAt: string;
  drinkType: 'ice' | 'hot';
  menu: string;
  price: number;
  milk?: string;
  sugar?: string;
  tableNumber?: number | string;
  paymentMethod?: string;
  receiptStatus?: string;
  cashAmount?: number | string;
  note?: string;
  status: 'pending' | 'completed' | 'cancelled';
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);

  /* ----------------- 注文取得 ------------------ */
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('注文データ取得失敗');

      const data: ApiOrder[] = await res.json();

      /* camelCase → 画面用 Order へ変換 */
      const mapped: Order[] = data.map((o) => ({
        id: o.id,
        createdAt: o.createdAt,
        drinkType: o.drinkType,
        menu: o.menu,
        price: o.price,
        milk: o.milk ?? '',
        sugar: o.sugar ?? '',
        tableNumber: o.tableNumber !== undefined ? String(o.tableNumber) : '',
        paymentMethod: o.paymentMethod ?? '',
        receiptStatus: o.receiptStatus ?? '',
        cashAmount: o.cashAmount !== undefined ? String(o.cashAmount) : undefined,
        note: o.note ?? '',
        status: o.status,
      }));

      setOrders(mapped);
    } catch (error) {
      console.error('注文データの取得に失敗しました', error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ----------------- ステータス変更 ------------------ */
  const handleStatusChange = async (id: number, newStatus: Order['status']) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error('状態更新失敗');
      const json: { success: boolean; error?: string } = await res.json();
      if (!json.success) throw new Error(json.error || '不明なエラー');
      await fetchOrders();
    } catch (error) {
      console.error('状態変更に失敗しました', error);
      alert('状態変更に失敗しました。再度お試しください。');
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');

  const navItems = [
    { label: 'トップ', path: '/' },
    { label: '新規注文', path: '/new-order', highlight: true },
    { label: '対応済み', path: '/completed-orders' },
    { label: '日毎売上', path: '/sales' },
    { label: '在庫一覧', path: '/cup-inventory' },
    { label: 'ランキング', path: '/ranking' },
    { label: '売上推移', path: '/monthly-sales' },
  ];

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-4 bg-[#f8f5f0] font-sans">
      {/* ナビ */}
      <header className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4 sm:gap-6 max-w-6xl mx-auto">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className={
              `px-6 py-3 border border-gray-300 rounded-lg shadow-md transition-shadow font-semibold text-lg ` +
              (item.highlight
                ? 'bg-[#00704a] text-white hover:bg-[#004b38] active:shadow-inner shadow-md'
                : 'bg-white text-[#004b38] hover:shadow-lg active:shadow-inner')
            }
            aria-label={item.label}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </header>

      <nav className="flex border-b border-gray-300 mb-6">
        <button
          className="flex-1 py-3 text-base font-semibold text-center border-b-4 border-[#00704a] text-[#00704a]"
          disabled
        >
          注文一覧
        </button>
      </nav>

      <OrderList orders={pendingOrders} onStatusChange={handleStatusChange} />
    </div>
  );
}

/* -------------------------------------------------
   注文リストコンポーネント
-------------------------------------------------- */
function OrderList({
  orders,
  onStatusChange,
}: {
  orders: Order[];
  onStatusChange?: (id: number, newStatus: Order['status']) => void;
}) {
  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <p className="text-center text-gray-500 text-lg">注文はありません。</p>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className={`relative w-full bg-white rounded-lg shadow px-6 py-5 min-h-[140px] flex justify-between
              ${order.status === 'completed' ? 'opacity-60' : ''}
              ${order.status === 'cancelled' ? 'opacity-40 line-through' : ''}
            `}
          >
            {/* 左側：内容 */}
            <div className="flex flex-col justify-between flex-1 pr-6 min-w-0">
              <div className="text-gray-600 text-sm mb-1 whitespace-nowrap">
                {formatDate(order.createdAt)}
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-1 min-w-0">
                <span className="text-2xl font-bold text-[#004b38] truncate min-w-0">
                  {order.drinkType === 'ice' ? 'アイス' : 'ホット'} {order.menu}
                </span>
                <span className="text-2xl font-bold text-[#4b3b2b] whitespace-nowrap">
                  {order.tableNumber}番台
                </span>
                <span className="text-lg text-[#4b3b2b] whitespace-nowrap">砂糖: {order.sugar}</span>
                <span className="text-lg text-[#4b3b2b] whitespace-nowrap">ミルク: {order.milk}</span>
              </div>

              <div className="text-lg text-[#4b3b2b] flex flex-wrap gap-6 break-words">
                <span className="whitespace-nowrap truncate">支払: {order.paymentMethod}</span>
                <span className="whitespace-nowrap truncate">受取: {order.receiptStatus}</span>
                {order.cashAmount && (
                  <span className="whitespace-nowrap truncate">金額: {order.cashAmount}円</span>
                )}
                <span className="truncate min-w-full sm:min-w-0">備考: {order.note || '（なし）'}</span>
              </div>
            </div>

            {/* 右側：ボタン */}
            {order.status === 'pending' && onStatusChange && (
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <button
                  onClick={() => onStatusChange(order.id, 'completed')}
                  className="bg-[#00704a] hover:bg-[#004b38] text-white rounded-lg text-lg font-semibold shadow-md
                    w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] flex items-center justify-center"
                  aria-label="対応済"
                  type="button"
                >
                  対応済
                </button>
                <button
                  onClick={() => onStatusChange(order.id, 'cancelled')}
                  className="bg-[#eee] hover:bg-[#ddd] text-[#333] rounded-lg text-lg font-semibold shadow-md
                    w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] flex items-center justify-center"
                  aria-label="キャンセル"
                  type="button"
                >
                  キャンセル
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
