'use client';

import React, { useState, useEffect } from 'react';

type Props = {
  selectedYear: number;
  selectedMonth: number; // 1〜12
  onChange: (year: number, month: number) => void;
  onClose: () => void;
};

export default function CalendarModal({
  selectedYear,
  selectedMonth,
  onChange,
  onClose,
}: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const [year, setYear] = useState(selectedYear);
  const [month, setMonth] = useState(selectedMonth);

  useEffect(() => {
    setYear(selectedYear);
    setMonth(selectedMonth);
  }, [selectedYear, selectedMonth]);

  const handleConfirm = () => {
    onChange(year, month);
    onClose();
  };

  return (
    <div className="absolute top-24 right-10 z-50">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-300 p-8 w-[420px]">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#333] tracking-wide">
          年と月を選択
        </h2>
        <div className="flex justify-center gap-6 mb-8 text-xl">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-xl px-5 py-3 bg-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-xl px-5 py-3 bg-white hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end space-x-5">
          <button
            onClick={handleConfirm}
            className="text-xl font-semibold bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition"
          >
            決定
          </button>
          <button
            onClick={onClose}
            className="text-xl font-semibold bg-gray-400 text-white px-6 py-3 rounded-xl hover:bg-gray-500 transition"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
