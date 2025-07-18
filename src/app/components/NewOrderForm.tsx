// src/app/new-order/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// ★ ここでメニュー定義をインポート
import { menuItems } from '../date/menuItems';

export default function NewOrderForm() {
  const router = useRouter();

  const [drinkType, setDrinkType] = useState<'ice' | 'hot'>('ice');
  const [menu, setMenu] = useState('');
  const [milk, setMilk] = useState('無し');
  const [sugar, setSugar] = useState('無し');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptStatus, setReceiptStatus] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [note, setNote] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isCashKeypadOpen, setIsCashKeypadOpen] = useState(false);
  const cashModalRef = useRef<HTMLDivElement>(null);

  // -- モーダル外クリックで閉じる --
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsKeypadOpen(false);
      }
    }
    if (isKeypadOpen) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isKeypadOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cashModalRef.current && !cashModalRef.current.contains(event.target as Node)) {
        setIsCashKeypadOpen(false);
      }
    }
    if (isCashKeypadOpen) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCashKeypadOpen]);

  // -- テーブル番号テンキー --
  const addDigit = (digit: number) => {
    if (tableNumber.length >= 3) return;
    const newValue = tableNumber + digit.toString();
    const num = parseInt(newValue, 10);
    if (num > 300) return;
    setTableNumber(newValue);
  };
  const clearNumber = () => setTableNumber('');

  // -- 受取金額テンキー --
  const addCashDigit = (digit: number) => {
    if (cashAmount.length >= 6) return;
    setCashAmount(cashAmount + digit.toString());
  };
  const clearCashNumber = () => setCashAmount('');

  // ★ 動的に ICE / HOT メニューを取得
  const currentMenus = menuItems
    .filter((item) =>
      drinkType === 'ice'
        ? item.type === 'アイス'
        : item.type === 'ホット'
    )
    .map((item) => item.name);

  // ★ 価格取得（「プレミアム」のみ500円、それ以外は300円）
  const getPrice = () => (menu === 'プレミアム' ? 500 : 300);

  const handleCancel = () => {
    setDrinkType('ice');
    setMenu('');
    setMilk('無し');
    setSugar('無し');
    setTableNumber('');
    setPaymentMethod('');
    setReceiptStatus('');
    setCashAmount('');
    setNote('');
    router.push('/order-list');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tableNum = parseInt(tableNumber, 10);
    if (isNaN(tableNum) || tableNum < 1 || tableNum > 300) {
      alert('台番号は1〜300の範囲で入力してください');
      return;
    }

    if (!menu || !tableNumber || !paymentMethod || !receiptStatus) {
      alert('メニュー・台番号・支払方法・受取状況はすべて必須です。');
      return;
    }

    if (paymentMethod === '現金' && receiptStatus === '済' && !cashAmount) {
      alert('現金で受取済の場合、受取金額を入力してください。');
      return;
    }

    const newOrder = {
      drink_type: drinkType,
      menu,
      price: getPrice(),
      milk,
      sugar,
      table_number: tableNum,
      payment_method: paymentMethod,
      receipt_status: receiptStatus,
      cash_amount: cashAmount || undefined,
      note,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('注文が送信されました！');
      router.push('/order-list');
    } catch (err) {
      console.error('注文送信エラー:', err);
      alert('送信中にエラーが発生しました。もう一度お試しください。');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto p-6 space-y-6 text-xl bg-[#f5f3ef] rounded-lg shadow-lg"
    >
      <h1 className="text-3xl font-extrabold text-center text-[#00704a]">
        新規オーダー
      </h1>

      {/* ドリンクタイプ */}
      <div className="flex gap-8 justify-center">
        {['ice', 'hot'].map((type) => (
          <label key={type} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="drinkType"
              value={type}
              checked={drinkType === type}
              onChange={() => {
                setDrinkType(type as 'ice' | 'hot');
                setMenu('');
              }}
              className="w-6 h-6 accent-[#00704a]"
            />
            <span>{type === 'ice' ? 'アイス' : 'ホット'}</span>
          </label>
        ))}
      </div>

      {/* メニュー */}
      <div>
        <label className="block mb-2 font-semibold">メニュー</label>
        <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto border rounded p-4 bg-white">
          {currentMenus.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="menu"
                value={m}
                checked={menu === m}
                onChange={() => setMenu(m)}
                required
                className="w-5 h-5 accent-[#00704a]"
              />
              <span>
                {m}（{m === 'プレミアム' ? 500 : 300}円）
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ミルク／砂糖 */}
      <div>
        <label className="block mb-2 font-semibold">ミルク</label>
        <div className="flex flex-wrap gap-6">
          {['無し', '1杯', '少ない', '多い', '超多い'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="milk"
                value={opt}
                checked={milk === opt}
                onChange={() => setMilk(opt)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block mb-2 font-semibold">砂糖</label>
        <div className="flex flex-wrap gap-6">
          {['無し', '1杯', '少ない', '多い', '超多い'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="sugar"
                value={opt}
                checked={sugar === opt}
                onChange={() => setSugar(opt)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 台番号 */}
      <div>
        <label className="block mb-2 font-semibold">台番号</label>
        <input
          type="text"
          value={tableNumber}
          readOnly
          onClick={() => setIsKeypadOpen(true)}
          placeholder="1〜300"
          className="w-full border rounded p-2 cursor-pointer bg-white"
        />
        {isKeypadOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.3)] z-50">
            <div
                ref={modalRef}
       onClick={(e) => e.stopPropagation()}
       className="bg-white p-8 w-96 rounded-xl shadow-lg flex flex-col"
     >            
              <div className="grid grid-cols-3 gap-6 mb-4">
                {[1,2,3,4,5,6,7,8,9].map((n) => (
                 <button
            key={n}
            type="button"
            onClick={() => addDigit(n)}
            className="p-6 bg-[#00704a] hover:bg-[#004b38] text-white rounded-xl text-2xl font-semibold"
         >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearNumber}
                  className="col-span-2 p-4 bg-[#4b3b2b] text-white rounded"
                >
                  クリア
                </button>
                <button
                  type="button"
                  onClick={() => addDigit(0)}
                  className="p-4 bg-[#00704a] text-white rounded"
                >
                  0
                </button>
              </div>
              <button onClick={() => setIsKeypadOpen(false)} className="text-[#00704a]">
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 支払方法 */}
      <div>
        <label className="block mb-2 font-semibold">支払方法</label>
        <div className="flex flex-wrap gap-6">
          {['現金', '1パチ', '4パチ', 'スロ'].map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value={m}
                checked={paymentMethod === m}
                onChange={() => setPaymentMethod(m)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{m}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 受取状況 */}
      <div>
        <label className="block mb-2 font-semibold">受取状況</label>
        <div className="flex gap-6">
          {['未', '済'].map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="receiptStatus"
                value={s}
                checked={receiptStatus === s}
                onChange={() => setReceiptStatus(s)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 受取金額 (現金/済 の場合) */}
      {paymentMethod === '現金' && receiptStatus === '済' && (
        <div>
          <label className="block mb-2 font-semibold">受取金額</label>
          <div className="flex gap-4">
            {['300','500','1000'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCashAmount(amt)}
                className="px-4 py-2 bg-[#e0e0d1] rounded"
              >
                {amt}円
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCashKeypadOpen(true)}
              className="px-4 py-2 bg-[#e0e0d1] rounded"
            >
              手入力
            </button>
          </div>
          {cashAmount && <p>受取金額: {cashAmount} 円</p>}

          {isCashKeypadOpen && (
            <div
              onClick={() => setIsCashKeypadOpen(false)}
              className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.3)]"
            >
              <div
                ref={cashModalRef}
                onClick={(e) => e.stopPropagation()}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[1,2,3,4,5,6,7,8,9].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => addCashDigit(n)}
                      className="p-4 bg-[#00704a] text-white rounded"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearCashNumber}
                    className="col-span-2 p-4 bg-[#4b3b2b] text-white rounded"
                  >
                    クリア
                  </button>
                  <button
                    type="button"
                    onClick={() => addCashDigit(0)}
                    className="p-4 bg-[#00704a] text-white rounded"
                  >
                    0
                  </button>
                </div>
                <button onClick={() => setIsCashKeypadOpen(false)} className="text-[#00704a]">
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 備考 */}
      <div>
        <label className="block mb-2 font-semibold">備考</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full border rounded p-2"
        />
      </div>

      {/* ボタン */}
      <div className="flex gap-4">
        <button type="submit" className="flex-1 bg-[#00704a] text-white py-3 rounded">
          注文する
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 bg-[#b22222] text-white py-3 rounded"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
