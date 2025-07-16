'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipContentProps,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

type Database = {
  orders: {
    Row: {
      createdAt: string;
      status: string;
      paymentMethod: string;
      price: number;
    };
  };
};

type MonthChartData = {
  name: string; // '2025/1'など
  earlyAvg: number;
  lateAvg: number;
  totalAvg: number;
  cashTotal: number;
  cashDayAvg: number;
};

type DayChartData = {
  day: number; // 1～31
  earlyCount: number;
  lateCount: number;
  totalCount: number;
  cashTotal: number;
};

export default function SalesPage() {
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [selectedYear, setSelectedYear] = useState(2025);
  // 初期値を現在の月に変更
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().month() + 1);
  const [chartData, setChartData] = useState<MonthChartData[] | DayChartData[]>([]);

  const chartMargin = { top: 20, right: 30, left: 0, bottom: 20 };
  const xAxisPadding = { left: 20, right: 20 };
  const xAxisTickStyle = { fontSize: 12 };

  // viewModeがdayに切り替わったらselectedMonthを現在月にセット
  useEffect(() => {
    if (viewMode === 'day') {
      setSelectedMonth(dayjs().month() + 1);
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'month') {
      fetchMonthlyData(selectedYear);
    } else {
      fetchDailyData(selectedYear, selectedMonth);
    }
  }, [viewMode, selectedYear, selectedMonth]);

  async function fetchMonthlyData(year: number) {
    const supabase = createClientComponentClient<Database>();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('createdAt', `${year}-01-01T00:00:00Z`)
      .lte('createdAt', `${year}-12-31T23:59:59Z`);

    if (error || !orders) {
      console.error(error);
      return;
    }

    const monthlyStats: Record<
      string,
      {
        year: number;
        month: number;
        earlyCount: number;
        earlyDays: Set<string>;
        lateCount: number;
        lateDays: Set<string>;
        totalDays: Set<string>;
        cashTotal: number;
        cashDays: Set<string>;
      }
    > = {};

    for (let month = 1; month <= 12; month++) {
      const key = `${year}-${month}`;
      monthlyStats[key] = {
        year,
        month,
        earlyCount: 0,
        earlyDays: new Set<string>(),
        lateCount: 0,
        lateDays: new Set<string>(),
        totalDays: new Set<string>(),
        cashTotal: 0,
        cashDays: new Set<string>(),
      };
    }

    orders.forEach((order) => {
      const jst = dayjs.utc(order.createdAt).tz('Asia/Tokyo');
      const orderYear = jst.year();
      const month = jst.month() + 1;
      const day = jst.format('YYYY-MM-DD');
      const hour = jst.hour();
      const minute = jst.minute();

      if (orderYear !== year) return;

      const key = `${orderYear}-${month}`;
      const stat = monthlyStats[key];
      if (!stat) return;

      if (hour < 16 || (hour === 16 && minute <= 50)) {
        stat.earlyCount += 1;
        stat.earlyDays.add(day);
      } else {
        stat.lateCount += 1;
        stat.lateDays.add(day);
      }

      stat.totalDays.add(day);

      if (order.status === 'completed' && order.paymentMethod === '現金') {
        stat.cashTotal += order.price;
        stat.cashDays.add(day);
      }
    });

    const chartRows = Object.values(monthlyStats).map((stat) => {
      const earlyAvg = stat.earlyDays.size
        ? stat.earlyCount / stat.earlyDays.size
        : 0;
      const lateAvg = stat.lateDays.size
        ? stat.lateCount / stat.lateDays.size
        : 0;
      const totalAvg = stat.totalDays.size
        ? (stat.earlyCount + stat.lateCount) / stat.totalDays.size
        : 0;
      const cashDayAvg = stat.cashDays.size
        ? stat.cashTotal / stat.cashDays.size
        : 0;

      return {
        name: `${stat.year}/${stat.month}`,
        earlyAvg: Number(earlyAvg.toFixed(2)),
        lateAvg: Number(lateAvg.toFixed(2)),
        totalAvg: Number(totalAvg.toFixed(2)),
        cashTotal: stat.cashTotal,
        cashDayAvg: Number(cashDayAvg.toFixed(2)),
      };
    });

    setChartData(chartRows);
  }

  async function fetchDailyData(year: number, month: number) {
    const supabase = createClientComponentClient<Database>();

    const start = dayjs(`${year}-${month}-01`).startOf('day').toISOString();
    const end = dayjs(`${year}-${month}-01`).endOf('month').endOf('day').toISOString();

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('createdAt', start)
      .lte('createdAt', end);

    if (error || !orders) {
      console.error(error);
      return;
    }

    type DailyStat = {
      earlyCount: number;
      lateCount: number;
      cashTotal: number;
    };
    const daysInMonth = dayjs(`${year}-${month}-01`).daysInMonth();

    const dailyStats: Record<string, DailyStat> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = dayjs(`${year}-${month}-${d}`).format('YYYY-MM-DD');
      dailyStats[dateKey] = { earlyCount: 0, lateCount: 0, cashTotal: 0 };
    }

    orders.forEach((order) => {
      if (order.status !== 'completed') return;

      const jst = dayjs.utc(order.createdAt).tz('Asia/Tokyo');
      const dayKey = jst.format('YYYY-MM-DD');
      const hour = jst.hour();
      const minute = jst.minute();

      if (!(dayKey in dailyStats)) return;

      if (hour < 16 || (hour === 16 && minute <= 50)) {
        dailyStats[dayKey].earlyCount += 1;
      } else {
        dailyStats[dayKey].lateCount += 1;
      }

      if (order.paymentMethod === '現金') {
        dailyStats[dayKey].cashTotal += order.price;
      }
    });

    const dayChartRows: DayChartData[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = dayjs(`${year}-${month}-${d}`).format('YYYY-MM-DD');
      const stat = dailyStats[dateKey];
      dayChartRows.push({
        day: d,
        earlyCount: stat.earlyCount,
        lateCount: stat.lateCount,
        totalCount: stat.earlyCount + stat.lateCount,
        cashTotal: stat.cashTotal,
      });
    }

    setChartData(dayChartRows);
  }

  const xAxisKey = viewMode === 'month' ? 'name' : 'day';

  const customTooltip = ({
    active,
    payload,
    label,
  }: TooltipContentProps<number, string>): React.ReactNode => {
    if (!active || !payload || payload.length === 0) return null;

    const orderMapMonth: Record<string, number> = {
      earlyAvg: 1,
      lateAvg: 2,
      totalAvg: 3,
    };

    const orderMapDay: Record<string, number> = {
      earlyCount: 1,
      lateCount: 2,
      totalCount: 3,
      cashTotal: 4,
    };

    const orderMap = viewMode === 'month' ? orderMapMonth : orderMapDay;

    const sorted = [...payload].sort(
      (a, b) =>
        (orderMap[a.dataKey as string] ?? 99) - (orderMap[b.dataKey as string] ?? 99)
    );

    return (
      <div className="bg-white p-2 border rounded shadow">
        <p>{label}</p>
        {sorted.map((item) => (
          <p key={item.dataKey} style={{ color: item.color }}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  };

  const cashFormatter = (value: number) => `¥${value.toLocaleString()}`;

  return (
    <div className="bg-cream min-h-screen p-4 max-w-4xl mx-auto space-y-8">
      {/* タイトルと右端ボタンを横並び */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">売上推移</h1>
        <Link href="/order-list">
          <button className="bg-[#00704a] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#004b38] shadow-md transition">
            出品一覧に戻る
          </button>
        </Link>
      </div>

      {/* ラジオボタンとセレクター群 横並び */}
      <div className="flex flex-wrap items-center space-x-8">
        {/* ラジオボタン */}
        <div className="flex space-x-8">
          <label className="flex items-center cursor-pointer select-none text-base">
            <input
              type="radio"
              name="viewMode"
              value="month"
              checked={viewMode === 'month'}
              onChange={() => setViewMode('month')}
              className="w-6 h-6 cursor-pointer"
            />
            <span className="ml-2">月毎</span>
          </label>
          <label className="flex items-center cursor-pointer select-none text-base">
            <input
              type="radio"
              name="viewMode"
              value="day"
              checked={viewMode === 'day'}
              onChange={() => setViewMode('day')}
              className="w-6 h-6 cursor-pointer"
            />
            <span className="ml-2">日毎</span>
          </label>
        </div>

        {/* 年セレクター */}
        <label className="flex items-center space-x-2">
          <span>年:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {[2025, 2026, 2027, 2028, 2029].map((year) => (
              <option key={year} value={year}>
                {year}年
              </option>
            ))}
          </select>
        </label>

        {/* 月セレクター（日毎のみ表示） */}
        {viewMode === 'day' && (
          <label className="flex items-center space-x-2">
            <span>月:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border rounded px-3 py-2"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}月
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* グラフタイトル */}
      <h2 className="text-lg font-semibold mt-4">
        {viewMode === 'month'
          ? `${selectedYear}年 月別 平均杯数・現金売上 推移`
          : `${selectedYear}年${selectedMonth}月 日別 杯数・現金売上 推移`}
      </h2>

      {/* 上のグラフ：杯数 */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} tick={xAxisTickStyle} padding={xAxisPadding} />
           <YAxis domain={viewMode === 'day' ? [0, 'dataMax + 2'] : ['auto', 'auto']} />

            <Tooltip content={customTooltip} />
            <Legend />
            {viewMode === 'month' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="earlyAvg"
                  stroke="#8884d8"
                  name="早番 平均杯数"
                />
                <Line
                  type="monotone"
                  dataKey="lateAvg"
                  stroke="#82ca9d"
                  name="遅番 平均杯数"
                />
                <Line
                  type="monotone"
                  dataKey="totalAvg"
                  stroke="#ff7300"
                  name="早遅合計 1日平均"
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="earlyCount"
                  stroke="#8884d8"
                  name="早番 杯数"
                />
                <Line
                  type="monotone"
                  dataKey="lateCount"
                  stroke="#82ca9d"
                  name="遅番 杯数"
                />
                <Line
                  type="monotone"
                  dataKey="totalCount"
                  stroke="#ff7300"
                  name="合計 杯数"
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* 下のグラフ：現金売上 */}
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={chartMargin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} tick={xAxisTickStyle} padding={xAxisPadding} />
         <YAxis
  orientation="left"
  domain={viewMode === 'day' ? [0, 'dataMax + 500'] : ['auto', 'auto']}
/>

            <Tooltip formatter={cashFormatter} />
            <Legend />
            <Line
              type="monotone"
              dataKey="cashTotal"
              stroke="#0000ff" 
              name="現金売上 合計"
            />
            {viewMode === 'month' && (
              <Line
                type="monotone"
                dataKey="cashDayAvg"
                stroke="#00bcd4"
                name="現金売上 1日平均"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
