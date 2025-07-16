'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CalendarModal from '../components/CalendarModal';

type InventoryRecord = {
  date: string;
  inStock: number;
  outStock: number;
  cupType: 'アイス' | 'ホット';
  remaining?: number;
};

function parseDate(dateStr: string): Date | null {
  if (dateStr === '繰り越し') return null;
  const m = dateStr.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (!m) return null;
  const year = new Date().getFullYear();
  return new Date(year, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
}

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (date: string, count: number) => void;
  cupType: 'アイス' | 'ホット';
  mode: '入庫' | '出庫';
};

function StockModal({ visible, onClose, onSubmit, cupType, mode }: ModalProps) {
  const [count, setCount] = useState('');
  const today = (() => {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  })();

  if (!visible) return null;

  const handleSubmit = () => {
    const num = Number(count);
    if (isNaN(num)) {
      alert(`${mode}数は数字で入力してください`);
      return;
    }
    if (mode === '出庫' && num <= 0) {
      alert('出庫数は1以上の数字を入力してください');
      return;
    }
    onSubmit(today, num);
    setCount('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded p-6 w-80 shadow-lg">
        <h3 className="text-lg font-bold mb-4">
          {cupType}カップ {mode}登録（日付：{today}）
        </h3>
        <label className="block mb-4">
          {mode}数{mode === '入庫' ? '（マイナスも入力可）' : ''}
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-2 py-1"
            autoFocus
            min={mode === '出庫' ? 1 : undefined}
          />
        </label>
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleSubmit}
            className={`${
              mode === '入庫' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            } text-white px-4 py-2 rounded transition`}
          >
            登録
          </button>
          <button
            onClick={() => {
              onClose();
              setCount('');
            }}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CupInventory() {
  const router = useRouter();

  const [iceRecords, setIceRecords] = useState<InventoryRecord[]>([]);
  const [hotRecords, setHotRecords] = useState<InventoryRecord[]>([]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const [showCalendar, setShowCalendar] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalCupType, setModalCupType] = useState<'アイス' | 'ホット'>('アイス');
  const [modalMode, setModalMode] = useState<'入庫' | '出庫'>('入庫');

  // 前日残カップ数用のstate
  const [previousRemaining, setPreviousRemaining] = useState<{ ice: number; hot: number }>({
    ice: 0,
    hot: 0,
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/orders/cup-inventory');
        const data = await res.json();
        if (Array.isArray(data)) {
          const ice = data.filter((r) => r.cupType === 'アイス');
          const hot = data.filter((r) => r.cupType === 'ホット');

          setIceRecords(
            ice.length
              ? ice
              : [{ date: '繰り越し', inStock: 0, outStock: 0, cupType: 'アイス' }]
          );
          setHotRecords(
            hot.length
              ? hot
              : [{ date: '繰り越し', inStock: 0, outStock: 0, cupType: 'ホット' }]
          );
        }
      } catch (error) {
        console.error('データ読み込み失敗', error);
      }
    }
    fetchData();
  }, []);

  // 前日残カップ数を取得するuseEffect
  useEffect(() => {
    async function fetchPreviousRemaining() {
      try {
        const res = await fetch(
          `/api/orders/get-previous-cup-remaining?year=${selectedYear}&month=${selectedMonth}`
        );
        if (!res.ok) throw new Error('Failed to fetch previous remaining cups');
        const data = await res.json();
        setPreviousRemaining({
          ice: data.ice ?? 0,
          hot: data.hot ?? 0,
        });
      } catch (error) {
        console.error('前日残カップ数取得失敗', error);
        setPreviousRemaining({ ice: 0, hot: 0 });
      }
    }
    fetchPreviousRemaining();
  }, [selectedYear, selectedMonth]);

  const calcRemaining = (records: InventoryRecord[]) => {
    const sorted = [...records].sort((a, b) => {
      if (a.date === '繰り越し') return -1;
      if (b.date === '繰り越し') return 1;
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

    let total = 200;
    return sorted.map((r) => {
      if (r.date === '繰り越し') {
        total = 200;
        return { ...r, remaining: total };
      }
      total += r.inStock - r.outStock;
      return { ...r, remaining: total };
    });
  };

  const filterByMonth = (records: InventoryRecord[]) => {
    return records.filter((r) => {
      if (r.date === '繰り越し') return true;
      const dt = parseDate(r.date);
      if (!dt) return false;
      return dt.getFullYear() === selectedYear && dt.getMonth() + 1 === selectedMonth;
    });
  };

  const iceWithRemaining = filterByMonth(calcRemaining(iceRecords));
  const hotWithRemaining = filterByMonth(calcRemaining(hotRecords));

  const openModal = (cupType: 'アイス' | 'ホット', mode: '入庫' | '出庫') => {
    setModalCupType(cupType);
    setModalMode(mode);
    setModalVisible(true);
  };

  async function postRecord(record: InventoryRecord) {
    try {
      const res = await fetch('/api/orders/cup-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        console.error('保存エラー', await res.text());
      }
    } catch (error) {
      console.error('保存時の例外', error);
    }
  }

  const handleModalSubmit = async (date: string, count: number) => {
    const newRecord: InventoryRecord = {
      date,
      inStock: modalMode === '入庫' ? count : 0,
      outStock: modalMode === '出庫' ? count : 0,
      cupType: modalCupType,
    };
    if (modalCupType === 'アイス') {
      setIceRecords((prev) => [...prev, newRecord]);
    } else {
      setHotRecords((prev) => [...prev, newRecord]);
    }
    setModalVisible(false);
    await postRecord(newRecord);
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto p-8 bg-[#f8f5f0] font-sans rounded-lg shadow-md mt-8 text-[#4b3b2b] relative">
      <button
        onClick={() => router.push('/order-list')}
        className="mb-8 px-6 py-2 bg-[#00704a] text-white rounded hover:bg-[#004b38] transition"
      >
        注文一覧に戻る
      </button>

      <button
        onClick={() => setShowCalendar(true)}
        className="absolute top-8 right-8 px-4 py-2 bg-[#00704a] text-white rounded hover:bg-[#004b38] transition flex items-center space-x-2"
        aria-label="カレンダー表示"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2v-7H3v7a2 2 0 002 2z" />
        </svg>
        <span>{selectedMonth}月を表示中</span>
      </button>

      <div className="grid grid-cols-2 gap-12">
        {/* アイスカップ */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-[#004b38]">アイスカップ</h2>

          <div className="mb-4 flex space-x-2">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              onClick={() => openModal('アイス', '入庫')}
            >
              入庫ボタン
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              onClick={() => openModal('アイス', '出庫')}
            >
              出庫ボタン
            </button>
          </div>

          <table className="w-full border-collapse border border-gray-300 rounded-md overflow-hidden">
            <thead>
              <tr className="bg-[#d1e7e0] text-[#004b38] select-none">
                <th className="border border-gray-300 p-2 text-left">日付</th>
                <th className="border border-gray-300 p-2 text-center">入庫数</th>
                <th className="border border-gray-300 p-2 text-center">出庫数</th>
                <th className="border border-gray-300 p-2 text-center">残数</th>
              </tr>
            </thead>
            <tbody>
              {iceWithRemaining.map(({ date, inStock, outStock, remaining }, idx) => (
                <tr
                  key={idx}
                  className={
                    idx === 0
                      ? 'font-bold bg-[#f0f5f4]'
                      : idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-[#fafafa]'
                  }
                >
                  <td className="border border-gray-300 p-2">{date}</td>
                  <td className="border border-gray-300 p-2 text-center">{inStock !== 0 ? `${inStock}個` : ''}</td>
                  <td className="border border-gray-300 p-2 text-center">{outStock !== 0 ? `${outStock}個` : ''}</td>
                  <td className="border border-gray-300 p-2 text-center">{remaining}個</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ホットカップ */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-[#004b38]">ホットカップ</h2>

          <div className="mb-4 flex space-x-2">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              onClick={() => openModal('ホット', '入庫')}
            >
              入庫ボタン
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              onClick={() => openModal('ホット', '出庫')}
            >
              出庫ボタン
            </button>
          </div>

          <table className="w-full border-collapse border border-gray-300 rounded-md overflow-hidden">
            <thead>
              <tr className="bg-[#d1e7e0] text-[#004b38] select-none">
                <th className="border border-gray-300 p-2 text-left">日付</th>
                <th className="border border-gray-300 p-2 text-center">入庫数</th>
                <th className="border border-gray-300 p-2 text-center">出庫数</th>
                <th className="border border-gray-300 p-2 text-center">残数</th>
              </tr>
            </thead>
            <tbody>
              {hotWithRemaining.map(({ date, inStock, outStock, remaining }, idx) => (
                <tr
                  key={idx}
                  className={
                    idx === 0
                      ? 'font-bold bg-[#f0f5f4]'
                      : idx % 2 === 0
                      ? 'bg-white'
                      : 'bg-[#fafafa]'
                  }
                >
                  <td className="border border-gray-300 p-2">{date}</td>
                  <td className="border border-gray-300 p-2 text-center">{inStock !== 0 ? `${inStock}個` : ''}</td>
                  <td className="border border-gray-300 p-2 text-center">{outStock !== 0 ? `${outStock}個` : ''}</td>
                  <td className="border border-gray-300 p-2 text-center">{remaining}個</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCalendar && (
        <CalendarModal
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onChange={(year, month) => {
            setSelectedYear(year);
            setSelectedMonth(month);
            setShowCalendar(false);
          }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      <StockModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
        cupType={modalCupType}
        mode={modalMode}
      />
    </div>
  );
}
