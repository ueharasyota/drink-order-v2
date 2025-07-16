"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Order = {
  id: string;
  createdAt: string;
  drinkType: "ice" | "hot";
  menu: string;
  price: number;
  milk: string;
  sugar: string;
  tableNumber: string;
  paymentMethod: string;
  receiptStatus: string;
  cashAmount?: string;
  note: string;
  status: "pending" | "completed" | "cancelled";
};

function formatDate(isoString: string) {
  const date = new Date(isoString);
  date.setHours(date.getHours() + 9);
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function formatDateOnly(isoString: string) {
  const date = new Date(isoString);
  date.setHours(date.getHours() + 9);
  return date.toISOString().slice(0, 10);
}

function getTodayDateJST() {
  const now = new Date();
  now.setHours(now.getHours() + 9);
  return now.toISOString().slice(0, 10);
}

export default function CompletedOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterDate, setFilterDate] = useState<string>(getTodayDateJST());

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) {
        console.error("Supabase取得エラー:", error);
        return;
      }

  const converted: Order[] = data
  .map((order) => ({
    id: order.id,
    createdAt: order.createdAt,
    drinkType: order.drink_type === "ice" ? "ice" : "hot" as "ice" | "hot",
    menu: order.menu,
    price: order.price,
    milk: order.milk,
    sugar: order.sugar,
    tableNumber: order.table_number,
    paymentMethod: order.paymentMethod,
    receiptStatus: order.receiptStatus,
    cashAmount: order.cashAmount,
    note: order.note,
    status: order.status as "pending" | "completed" | "cancelled",
  }))
  .filter((o) => o.status === "completed" || o.status === "cancelled");

      setOrders(converted);
    }

    fetchOrders();
  }, []);

  const filteredOrders = filterDate
    ? orders.filter((o) => formatDateOnly(o.createdAt) === filterDate)
    : orders;

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-6 bg-[#f8f5f0] font-sans">
      <h1 className="text-3xl font-bold text-[#004b38] mb-6">
        対応済み・キャンセル注文一覧
      </h1>

      <button
        onClick={() => router.push("/order-list")}
        className="mb-4 px-4 py-2 bg-[#00704a] text-white rounded shadow hover:bg-[#004b38] transition"
      >
        一覧へ戻る
      </button>

      <div className="mb-6">
        <label htmlFor="dateFilter" className="mr-2 font-semibold text-[#004b38]">
          注文日で絞り込み：
        </label>
        <input
          id="dateFilter"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
        />
        {filterDate && (
          <button
            onClick={() => setFilterDate("")}
            className="ml-3 text-sm text-[#c2410c] underline hover:text-[#f97316]"
          >
            リセット
          </button>
        )}
      </div>

      <OrderList orders={filteredOrders} />
    </div>
  );
}

function OrderList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="text-center text-gray-500 text-lg">対応済み・キャンセルの注文はありません。</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className={`bg-white rounded-lg shadow px-4 py-3 text-sm min-h-[100px] relative
            ${order.status === "completed" ? "opacity-60" : ""}
            ${order.status === "cancelled" ? "opacity-40 line-through" : ""}
          `}
        >
          <div className="flex flex-col justify-between">
            <div className="mb-1 text-base text-gray-600">{formatDate(order.createdAt)}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 items-center mb-1 text-xl font-semibold text-[#004b38]">
              <span>{order.drinkType === "ice" ? "アイス" : "ホット"}</span>
              <span>{order.menu}</span>
              <span>{order.tableNumber}番台</span>
              <span className="text-[#4b3b2b]">砂糖: {order.sugar}</span>
              <span className="text-[#4b3b2b]">ミルク: {order.milk}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-xl text-[#4b3b2b]">
              <span>支払: {order.paymentMethod}</span>
              <span>受取: {order.receiptStatus}</span>
              {order.cashAmount && <span>金額: {order.cashAmount}円</span>}
              <span className="whitespace-nowrap">備考: {order.note || "（なし）"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
