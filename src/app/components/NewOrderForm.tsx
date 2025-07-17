'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

  // テーブル番号テンキーモーダルの外クリックで閉じる処理
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsKeypadOpen(false);
      }
    }
    if (isKeypadOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isKeypadOpen]);

  // 受取金額テンキーモーダルの外クリックで閉じる処理
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cashModalRef.current && !cashModalRef.current.contains(event.target as Node)) {
        setIsCashKeypadOpen(false);
      }
    }
    if (isCashKeypadOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCashKeypadOpen]);

  // テーブル番号テンキー入力処理
  const addDigit = (digit: number) => {
    if (tableNumber.length >= 3) return;
    const newValue = tableNumber + digit.toString();
    const num = parseInt(newValue, 10);
    if (num > 300) return;
    setTableNumber(newValue);
  };

  const clearNumber = () => setTableNumber('');

  // 受取金額テンキー入力処理
  const addCashDigit = (digit: number) => {
    if (cashAmount.length >= 6) return; // 最大6桁まで
    const newValue = cashAmount + digit.toString();
    setCashAmount(newValue);
  };

  const clearCashNumber = () => setCashAmount('');

  const iceMenus = [
    'コーヒー', 'カフェオレ', 'ミックスジュース', 'ココア', 'ハニーレモン',
    '抹茶オーレ', 'イチゴオーレ', 'アイスティー', 'ミルクティー',
    '美酢(ザクロ)', '美酢(マスカット)', '美酢(レモン)', 'オレンジ', 'アップル', 'マンゴー'
  ];
  const hotMenus = [
    'コーヒー', 'カフェオレ', 'ココア', '紅茶', '昆布茶',
    '梅昆布茶', 'オニオンスープ', 'コーンポタージュ', 'ポタージュ', 'プレミアムコーヒー'
  ];
  const currentMenus = drinkType === 'ice' ? iceMenus : hotMenus;

  const getPrice = () => (menu === 'プレミアムコーヒー' ? 500 : 300);

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

  try {
    if (!menu || !tableNumber || !paymentMethod || !receiptStatus) {
      alert('メニュー・台番号・支払方法・受取状況はすべて必須です。');
      return;
    }

  // 🔽 現金＋受取済のときは金額が必要
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
  table_number: parseInt(tableNumber, 10),
  payment_method: paymentMethod,
  receipt_status: receiptStatus,
  cash_amount: cashAmount || undefined,
  note,
};


    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('注文APIエラー:', errorText);
      throw new Error('注文送信に失敗しました');
    }

    alert('注文が送信されました！');
    router.push('/order-list'); // 遷移先を変更する場合ここも
  } catch (error) {
    console.error('注文送信エラー:', error);
    alert('送信中にエラーが発生しました。もう一度お試しください。');
  }
};


  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto p-6 space-y-6 text-xl bg-[#f5f3ef] font-sans text-[#4b3b2b] rounded-lg shadow-lg"
    >
      
      <h1 className="text-3xl font-extrabold mb-6 text-[#00704a] text-center tracking-wide">新規オーダー</h1>

      <div className="flex gap-8 justify-center mb-6">
        {['ice', 'hot'].map((type) => (
          <label key={type} className="flex items-center gap-3 cursor-pointer select-none">
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
            <span className="text-lg font-semibold">{type === 'ice' ? 'アイス' : 'ホット'}</span>
          </label>
        ))}
      </div>

      <div>
        <label className="block font-semibold mb-3 text-[#004b38] text-xl">メニュー</label>
        <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto border border-[#4b3b2b] rounded-lg p-5 bg-white shadow-sm">
          {currentMenus.map((m) => (
            <label key={m} className="flex items-center gap-3 cursor-pointer select-none text-base hover:text-[#00704a] transition-colors">
              <input
                type="radio"
                name="menu"
                value={m}
                checked={menu === m}
                onChange={() => setMenu(m)}
                required
                className="w-5 h-5 accent-[#00704a]"
              />
              <span>{m}（{m === 'プレミアムコーヒー' ? 500 : 300}円）</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2 text-[#004b38]">ミルク</label>
        <div className="flex flex-wrap gap-6">
          {['無し', '1杯', '少ない', '多い', '超多い'].map((option) => (
            <label key={option} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="radio"
                name="milk"
                value={option}
                checked={milk === option}
                onChange={() => setMilk(option)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2 text-[#004b38]">砂糖</label>
        <div className="flex flex-wrap gap-6">
          {['無し', '1杯', '少ない', '多い', '超多い'].map((option) => (
            <label key={option} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="radio"
                name="sugar"
                value={option}
                checked={sugar === option}
                onChange={() => setSugar(option)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2 text-[#004b38]">台番号</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{1,3}"
          maxLength={3}
          placeholder="例: 123"
          value={tableNumber}
          readOnly
          onClick={() => setIsKeypadOpen(true)}
          className="w-full border border-[#4b3b2b] p-3 rounded-lg text-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00704a]"
        />

        {isKeypadOpen && (
          <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] flex justify-center items-center z-50">
            <div
              ref={modalRef}
              className="bg-white rounded-xl p-6 w-72 shadow-lg flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => addDigit(num)}
                    className="bg-[#00704a] hover:bg-[#004b38] text-white p-4 rounded-xl text-xl font-semibold select-none shadow"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearNumber}
                  className="bg-[#4b3b2b] hover:bg-[#3b2f1d] text-white p-4 rounded-xl col-span-2 text-xl font-semibold select-none shadow"
                >
                  クリア
                </button>
                <button
                  type="button"
                  onClick={() => addDigit(0)}
                  className="bg-[#00704a] hover:bg-[#004b38] text-white p-4 rounded-xl text-xl font-semibold select-none shadow"
                >
                  0
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsKeypadOpen(false)}
                  className="text-[#00704a] hover:underline font-semibold select-none"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block font-semibold mb-2 text-[#004b38]">支払方法</label>
        <div className="flex flex-wrap gap-6">
          {['現金', '1パチ', '4パチ', 'スロ'].map((method) => (
            <label key={method} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={() => setPaymentMethod(method)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{method}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-2 text-[#004b38]">受取状況</label>
        <div className="flex gap-6">
          {['未', '済'].map((status) => (
            <label key={status} className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="radio"
                name="receiptStatus"
                value={status}
                checked={receiptStatus === status}
                onChange={() => setReceiptStatus(status)}
                className="w-6 h-6 accent-[#00704a]"
              />
              <span>{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 支払方法が「現金」かつ受取状況が「済」のときに受取金額入力表示 */}
      {paymentMethod === '現金' && receiptStatus === '済' && (
        <div>
          <label className="block font-semibold mb-2 text-[#004b38]">受取金額</label>
          <div className="flex gap-4">
            {['300', '500', '1000'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCashAmount(amt)}
                className="px-6 py-2 bg-[#e0e0d1] rounded hover:bg-[#c0c0af] text-lg font-semibold select-none"
              >
                {amt}円
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCashKeypadOpen(true)}
              className="px-6 py-2 bg-[#e0e0d1] rounded hover:bg-[#c0c0af] text-lg font-semibold select-none"
            >
              手入力
            </button>
          </div>
          {cashAmount && <p className="mt-2 text-[#4b3b2b]">受取金額：{cashAmount}円</p>}

          {/* 受取金額テンキーモーダル */}
          {isCashKeypadOpen && (
            <div
              className="fixed inset-0 bg-[rgba(0,0,0,0.3)] flex justify-center items-center z-50"
              onClick={() => setIsCashKeypadOpen(false)}
            >
              <div
                ref={cashModalRef}
                className="bg-white rounded-xl p-6 w-72 shadow-lg flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => addCashDigit(num)}
                      className="bg-[#00704a] hover:bg-[#004b38] text-white p-4 rounded-xl text-xl font-semibold select-none shadow"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearCashNumber}
                    className="bg-[#4b3b2b] hover:bg-[#3b2f1d] text-white p-4 rounded-xl col-span-2 text-xl font-semibold select-none shadow"
                  >
                    クリア
                  </button>
                  <button
                    type="button"
                    onClick={() => addCashDigit(0)}
                    className="bg-[#00704a] hover:bg-[#004b38] text-white p-4 rounded-xl text-xl font-semibold select-none shadow"
                  >
                    0
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCashKeypadOpen(false)}
                    className="text-[#00704a] hover:underline font-semibold select-none"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block font-semibold mb-2 text-[#004b38]">備考</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border border-[#4b3b2b] p-3 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-[#00704a]"
          rows={3}
          placeholder="ご要望などあればご記入ください"
        />
      </div>

      <div className="flex gap-4 mt-6">
        <button
          type="submit"
          className="flex-1 bg-[#00704a] text-white py-3 rounded-lg text-xl font-semibold hover:bg-[#004b38] shadow-md transition-colors"
        >
          注文する
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 bg-[#b22222] text-white py-3 rounded-lg text-xl font-semibold hover:bg-[#7a1616] shadow-md transition-colors"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
