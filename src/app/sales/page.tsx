'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Supabase 初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl, supabaseKey);

type PaymentMethodType = '現金' | '4円' | '1円' | 'スロ' | 'その他';
type DrinkType = 'ice' | 'hot';
type ShiftType = 'early' | 'late';

interface ShiftSummary {
  total: number;
  ice: number;
  hot: number;
  sales: number;
  byType300: Record<PaymentMethodType, number>;
  sales300: number;
  byType500: Record<PaymentMethodType, number>;
  sales500: number;
}

interface StartCupState {
  early: Record<DrinkType, number>;
  late: Record<DrinkType, number>;
}

// ★ adjusted_sales に合わせてフィールド名を変更
interface SalesReport {
  id: number;
  date: string;
  shift: ShiftType;
  diff: number;
  staff: string | null;
  note: string | null;
  adjusted_sales: number;   // ← adjusted → adjusted_sales
}

const LOCAL_STORAGE_KEY = 'startCupData';
const initSummary = (): ShiftSummary => ({
  total: 0,
  ice: 0,
  hot: 0,
  sales: 0,
  byType300: { 現金: 0, '4円': 0, '1円': 0, スロ: 0, その他: 0 },
  sales300: 0,
  byType500: { 現金: 0, '4円': 0, '1円': 0, スロ: 0, その他: 0 },
  sales500: 0,
});

const normalizePaymentMethod = (m: string): PaymentMethodType => {
  if (m === '現金') return '現金';
  if (m === '4円' || m === '4パチ') return '4円';
  if (m === '1円' || m === '1パチ') return '1円';
  if (m === 'スロ') return 'スロ';
  return 'その他';
};

// 種別テーブルコンポーネント
function PaymentTable({
  title,
  byType,
}: {
  title: string;
  byType: Record<PaymentMethodType, number>;
}) {
  const methods = ['現金', '4円', '1円', 'スロ'] as PaymentMethodType[];
  const countSum = methods.reduce((sum, m) => sum + byType[m], 0);

  return (
    <div className="overflow-x-auto mb-6">
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <table className="w-full table-auto text-xl border border-gray-300 border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {methods.map((m) => (
              <th key={m} className="px-2 py-1 border border-gray-200 text-2xl">
                {m}
              </th>
            ))}
            <th className="px-2 py-1 border border-gray-200 text-2xl text-right">
              合計
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {methods.map((m) => (
              <td
                key={m}
                className="px-2 py-1 text-center border border-gray-200 text-3xl"
              >
                {byType[m]}
              </td>
            ))}
            <td className="px-2 py-1 text-right border border-gray-200 text-3xl">
              {countSum}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// シフトカードコンポーネント
function ShiftCard({
  title,
  startCup,
  summary,
  openKeypad,
  calcRemaining,
  PaymentTable,
  isTotal = false,
}: {
  title: string;
  startCup: { ice: number; hot: number };
  summary: ShiftSummary;
  openKeypad: (s: ShiftType, t: DrinkType) => void;
  calcRemaining: (t: DrinkType) => number;
  PaymentTable: React.FC<{ title: string; byType: Record<PaymentMethodType, number> }>;
  isTotal?: boolean;
}) {
  const shift: ShiftType = title === '早番' ? 'early' : title === '遅番' ? 'late' : 'early';

  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-2xl font-semibold text-green-800 mb-4">{title}</h3>

      {/* 開始杯数ボタン */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => openKeypad(shift, 'ice')}
          disabled={isTotal}
          className={`px-4 py-2 text-xl rounded ${
            isTotal ? 'bg-gray-100 text-gray-500' : 'bg-green-700 text-white'
          }`}
        >
          アイス開始杯数: {startCup.ice}
        </button>
        <button
          onClick={() => openKeypad(shift, 'hot')}
          disabled={isTotal}
          className={`px-4 py-2 text-xl rounded ${
            isTotal ? 'bg-gray-100 text-gray-500' : 'bg-green-700 text-white'
          }`}
        >
          ホット開始杯数: {startCup.hot}
        </button>
      </div>

      {/* 売上杯数／残カップ サマリ表 */}
      <div className="mb-6 overflow-auto">
        <table className="w-full text-3xl border border-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-300">
              <th className="px-2 py-1 border border-gray-200"></th>
              <th className="px-2 py-1 border border-gray-200 text-2xl">アイス</th>
              <th className="px-2 py-1 border border-gray-200 text-2xl">ホット</th>
              <th className="px-2 py-1 border border-gray-200 text-2xl">合計</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-1 text-left border border-gray-200 text-2xl">
                売上杯数
              </th>
              <td className="px-2 py-1 text-center border border-gray-200 text-3xl">
                {summary.ice}
              </td>
              <td className="px-2 py-1 text-center border border-gray-200 text-3xl">
                {summary.hot}
              </td>
              <td className="px-2 py-1 text-center border border-gray-200 text-3xl">
                {summary.total}
              </td>
            </tr>
            {!isTotal && (
              <tr className="border-b border-gray-200">
                <th className="px-2 py-1 text-left border border-gray-200 text-2xl">
                  残カップ
                </th>
                <td className="px-2 py-1 text-center border border-gray-200 text-3xl">
                  {calcRemaining('ice')}
                </td>
                <td className="px-2 py-1 text-center border border-gray-200 text-3xl">
                  {calcRemaining('hot')}
                </td>
                <td className="px-2 py-1 text-center border border-gray-200 text-3xl">
                  {calcRemaining('ice') + calcRemaining('hot')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 種別別テーブル呼び出し */}
      <PaymentTable title="300円 種別" byType={summary.byType300} />
      <PaymentTable title="500円 種別" byType={summary.byType500} />

      <p className="text-right font-semibold mt-6 text-3xl">
        売上合計：¥{summary.sales.toLocaleString()}
      </p>
    </div>
  );
}

export default function SalesPage() {
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [early, setEarly] = useState<ShiftSummary>(initSummary());
  const [late, setLate] = useState<ShiftSummary>(initSummary());
  const [startCup, setStartCup] = useState<StartCupState>({
    early: { ice: 0, hot: 0 },
    late: { ice: 0, hot: 0 },
  });

  const [keypadOpen, setKeypadOpen] = useState(false);
  const [keypadShift, setKeypadShift] = useState<ShiftType | null

  >(null);
  const [keypadTarget, setKeypadTarget] = useState<DrinkType | null>(null);
  const [keypadInput, setKeypadInput] = useState('');

  // レポート用 state
  const [reportOpen, setReportOpen] = useState(false);
  const [reportShift, setReportShift] = useState<ShiftType>('early');
  const [reportDiff, setReportDiff] = useState<number>(0);
  const [reportNoDiff, setReportNoDiff] = useState(false);
  const [reportStaff, setReportStaff] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reports, setReports] = useState<SalesReport[]>([]);

  useEffect(() => {
    fetchStartCup();
    fetchSales();
    fetchSalesReports();
  }, [selectedDate]);

  // start_cups 読み込み
  const fetchStartCup = async () => {
    try {
      const { data, error } = await supabase
        .from('start_cups')
        .select('shift,drink_type,count')
        .eq('date', selectedDate);
      if (error) throw error;
      const init: StartCupState = {
        early: { ice: 0, hot: 0 },
        late: { ice: 0, hot: 0 },
      };
      (data as any[]).forEach((r) => {
        init[r.shift as ShiftType][r.drink_type as DrinkType] = r.count ?? 0;
      });
      setStartCup(init);
    } catch {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) setStartCup(JSON.parse(saved));
      } catch {}
    }
  };

  // orders API 売上集計
  const fetchSales = async () => {
    try {
      const res = await fetch(`/api/orders?date=${selectedDate}`);
      if (!res.ok) throw new Error();
      const raw: any[] = await res.json();
      const eSum = initSummary();
      const lSum = initSummary();
      const cutoff = new Date(`${selectedDate}T16:50:00`);
      raw.forEach((o) => {
        if (o.status !== 'completed') return;
        const dt = new Date(o.createdAt);
        const tgt = dt <= cutoff ? eSum : lSum;
        const kind = o.drinkType as DrinkType;
        tgt.total++;
        tgt[kind]++;
        const m = normalizePaymentMethod(o.paymentMethod);
        if (o.price === 300) {
          tgt.byType300[m]++;
          if (m === '現金') tgt.sales300 += o.price;
        } else {
          tgt.byType500[m]++;
          if (m === '現金') tgt.sales500 += o.price;
        }
        if (m === '現金') tgt.sales += o.price;
      });
      setEarly(eSum);
      setLate(lSum);
    } catch {}
  };

  // レポート一覧取得
  const fetchSalesReports = async () => {
    const { data, error } = await supabase
      .from('sales_reports')
      // ★ adjusted_sales を指定
      .select('id,date,shift,diff,staff,note,adjusted_sales')
      .eq('date', selectedDate);

    console.log('▶ fetchSalesReports', { data, error });
    setReports(data ?? []);
  };

  // レポート送信
  const onReportSubmit = async () => {
    const baseCash =
      reportShift === 'early'
        ? early.byType300.現金 * 300 + early.byType500.現金 * 500
        : late.byType300.現金 * 300 + late.byType500.現金 * 500;
    const adjusted = baseCash + reportDiff;

    const { data, error } = await supabase
    .from('sales_reports')
    .upsert(
      {
         date: selectedDate,
         shift: reportShift,
         diff: reportDiff,
         staff: reportStaff || null,
         note: reportNote || null,
         adjusted_sales: adjusted,
       },
       {
         onConflict: 'date,shift',   // ← ここを string[] ではなくカンマ区切り文字列に
       }
     )
     .select(); // upsert 後の最新行を返してもらう


    console.log(error ? '▶ insert error' : '▶ insert success', error || data);
    setReportOpen(false);
    fetchSalesReports();
  };

  // キーパッドハンドラ
  const openKeypad = (shift: ShiftType, tgt: DrinkType) => {
    setKeypadShift(shift);
    setKeypadTarget(tgt);
    setKeypadInput('');
    setKeypadOpen(true);
  };
  const closeKeypad = () => {
    setKeypadOpen(false);
    setKeypadShift(null);
    setKeypadTarget(null);
  };
  const onKeypadInput = (n: string) => setKeypadInput((p) => p + n);
  const onKeypadDelete = () => setKeypadInput((p) => p.slice(0, -1));
  const onKeypadConfirm = async () => {
    if (!keypadShift || !keypadTarget) return;
    const cnt = parseInt(keypadInput || '0', 10);
    const upd = { ...startCup };
    upd[keypadShift][keypadTarget] = cnt;
    setStartCup(upd);
    await supabase.from('start_cups').upsert({
      date: selectedDate,
      shift: keypadShift,
      drink_type: keypadTarget,
      count: cnt,
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(upd));
    closeKeypad();
  };

  const calcRemaining = (shift: ShiftType, t: DrinkType) =>
    Math.max(startCup[shift][t] - (shift === 'early' ? early[t] : late[t]), 0);

  return (
    <div className="min-h-screen bg-[#f8f5f0] p-6">
      <div className="max-w-screen-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">

        {/* ヘッダー */}
        <header className="flex flex-col md:flex-row items-center justify-between p-4 border-b">
          <h2 className="text-2xl font-semibold text-green-800">売上ページ</h2>
          <div className="flex items-center space-x-2 mt-3 md:mt-0">
            <label className="text-base">日付選択:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-1 text-base"
            />
          </div>
          <button
            onClick={() => router.push('/order-list')}
            className="mt-3 md:mt-0 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600 text-base"
          >
            出品一覧に戻る
          </button>
        </header>

        {/* シフトカード群 */}
        <section className="p-4 space-y-6">
          {(['早番', '遅番'] as const).map((t) => (  
            <ShiftCard
              key={t}
              title={t}
              startCup={t === '早番' ? startCup.early : startCup.late}
              summary={t === '早番' ? early : late}
              openKeypad={openKeypad}
              calcRemaining={(d) => calcRemaining(t === '早番' ? 'early' : 'late', d)}
              PaymentTable={PaymentTable}
            />
          ))}
          <ShiftCard
            title="合計"
            startCup={{
              ice: startCup.early.ice + startCup.late.ice,
              hot: startCup.early.hot + startCup.late.hot,
            }}
            summary={{
              total: early.total + late.total,
              ice: early.ice + late.ice,
              hot: early.hot + late.hot,
              sales: early.sales + late.sales,
              byType300: Object.fromEntries(
                (Object.keys(early.byType300) as PaymentMethodType[]).map((k) => [
                  k,
                  early.byType300[k] + late.byType300[k],
                ])
              ) as Record<PaymentMethodType, number>,
              sales300: early.sales300 + late.sales300,
              byType500: Object.fromEntries(
                (Object.keys(early.byType500) as PaymentMethodType[]).map((k) => [
                  k,
                  early.byType500[k] + late.byType500[k],
                ])
              ) as Record<PaymentMethodType, number>,
              sales500: early.sales500 + late.sales500,
            }}
            openKeypad={openKeypad}
            calcRemaining={() => 0}
            isTotal
            PaymentTable={PaymentTable}
          />
        </section>

        {/* 報告一覧 */}
        {(['early', 'late'] as ShiftType[]).map((s) => (
          <div key={s} className="p-4 border-t">
            <h4 className="text-xl font-semibold">
              {s === 'early' ? '早番報告' : '遅番報告'}
            </h4>
            {reports
              .filter((r) => r.shift === s)
              .map((r) => (
                <div key={r.id} className="mt-2 p-2 border rounded bg-gray-50 text-lg">
                  調整額: {r.diff}円 ／ 調整後売上: {r.adjusted_sales}円 ／
                  担当: {r.staff || '-'} ／ 備考: {r.note || '-'}
                </div>
              ))}
          </div>
        ))}

        {/* 報告ボタン */}
        <div className="p-4 border-t">
          <button
            onClick={() => setReportOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-lg"
          >
            報告
          </button>
        </div>
      </div>

       {reportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-2xl font-semibold mb-4">売上報告</h3>

            <label className="block mb-2">
              シフト：
              <select
                value={reportShift}
                onChange={(e) => setReportShift(e.target.value as ShiftType)}
                className="ml-2 border rounded px-2 py-1"
              >
                <option value="early">早番</option>
                <option value="late">遅番</option>
              </select>
            </label>

            <label className="block mb-2">
              調整額：
              <input
                type="number"
                value={reportDiff}
                onChange={(e) => setReportDiff(parseInt(e.target.value, 10) || 0)}
                className="ml-2 w-24 border rounded px-2 py-1 text-right"
              />{' '}
              円
            </label>

            <label className="block mb-2">
              <input
                type="checkbox"
                checked={reportNoDiff}
                onChange={(e) => setReportNoDiff(e.target.checked)}
                className="mr-1"
              />
              誤差無し
            </label>

            <label className="block mb-2">
              担当者：
              <input
                type="text"
                value={reportStaff}
                onChange={(e) => setReportStaff(e.target.value)}
                className="ml-2 border rounded px-2 py-1"
              />
            </label>

            <label className="block mb-4">
              備考：
              <textarea
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                className="w-full border rounded px-2 py-1 mt-1"
                rows={3}
              />
            </label>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setReportOpen(false)}
                className="px-4 py-2 border rounded"
              >
                キャンセル
              </button>
              <button
                onClick={onReportSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}


      {/* キーパッドモーダル */}
      {keypadOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xs">
            <h3 className="mb-3 text-lg font-medium">スタートカップ入力</h3>
            <input
              type="text"
              readOnly
              value={keypadInput}
              className="w-full border mb-4 p-2 text-center text-xl rounded"
            />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[...'1234567890'].map((n) => (
                <button
                  key={n}
                  onClick={() => onKeypadInput(n)}
                  className="p-2 border rounded text-lg"
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={onKeypadDelete}
                className="px-3 py-1 border rounded text-base"
              >
                削除
              </button>
              <button
                onClick={onKeypadConfirm}
                className="px-3 py-1 bg-green-600 text-white rounded text-base"
              >
                決定
              </button>
              <button
                onClick={closeKeypad}
                className="px-3 py-1 bg-red-600 text-white rounded text-base"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
