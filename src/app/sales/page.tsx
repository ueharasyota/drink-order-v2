'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);


type PaymentMethodType = "現金" | "4円" | "1円" | "スロ" | "その他";

type Order = {
  id: number;
  createdAt: string;
  drinkType: "ice" | "hot";
  menu: string;
  price: number;
  milk: string;
  sugar: string;
  tableNumber: number | string;
  paymentMethod: string;
  receiptStatus: string;
  cashAmount?: number;
  note: string;
  status: "pending" | "completed" | "cancelled";
};

type ShiftSummary = {
  total: number;
  ice: number;
  hot: number;
  sales: number;
  byType300: { [key in PaymentMethodType]: number };
  sales300: number;
  byType500: { [key in PaymentMethodType]: number };
  sales500: number;
};

type StartCupState = {
  early: { ice: number; hot: number };
  late: { ice: number; hot: number };
};

const initSummary = (): ShiftSummary => ({
  total: 0,
  ice: 0,
  hot: 0,
  sales: 0,
  byType300: { 現金: 0, "4円": 0, "1円": 0, スロ: 0, その他: 0 },
  sales300: 0,
  byType500: { 現金: 0, "4円": 0, "1円": 0, スロ: 0, その他: 0 },
  sales500: 0,
});

const normalizePaymentMethod = (method: string): PaymentMethodType => {
  if (method === "現金") return "現金";
  if (method === "4円" || method === "4パチ") return "4円";
  if (method === "1円" || method === "1パチ") return "1円";
  if (method === "スロ") return "スロ";
  return "その他";
};
const validDrinkTypes = ["ice", "hot"] as const;
type DrinkType = typeof validDrinkTypes[number];

const toCamelCaseOrder = (raw: any): Order => {
  if (!raw) {
    throw new Error("rawデータがありません");
  }

  const drinkType: DrinkType = validDrinkTypes.includes(raw.drink_type)
    ? raw.drink_type
    : (() => {
        console.warn("無効な drink_type:", raw.drink_type);
        return "ice";
      })();

  return {
    id: raw.id,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    drinkType: raw.drink_type,
    menu: raw.menu ?? "",
    price: Number(raw.price) || 0,
    milk: raw.milk ?? "",
    sugar: raw.sugar ?? "",
    tableNumber: raw.table_number ?? "",
    paymentMethod:
      typeof raw.paymentMethod === "string" ? raw.paymentMethod : "その他",
    receiptStatus: raw.receiptStatus ?? "",
    cashAmount:
      raw.cashAmount !== null && raw.cashAmount !== undefined
        ? Number(raw.cashAmount)
        : undefined,
    note: raw.note ?? "",
    status: raw.status ?? "pending",
  };
};

export default function SalesPage() {
  const router = useRouter();

  const saveStartCupToSupabase = async (
  dateStr: string,
  shift: "early" | "late",
  drinkType: "ice" | "hot",
  count: number
) => {
  try {
    const { data: existing, error: selectError } = await supabase
      .from("start_cups")
      .select("id")
      .eq("date", dateStr)
      .eq("shift", shift)
      .eq("drink_type", drinkType)
      .limit(1)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      throw selectError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("start_cups")
        .update({ count })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("start_cups")
        .insert([{ date: dateStr, shift, drink_type: drinkType, count }]);
      if (insertError) throw insertError;
    }
  } catch (e) {
    console.error("スタートカップ保存失敗", e);
    throw e;
  }
};

  const [orders, setOrders] = useState<Order[]>([]);
  const [early, setEarly] = useState<ShiftSummary>(initSummary());
  const [late, setLate] = useState<ShiftSummary>(initSummary());
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
const [diffValue, setDiffValue] = useState(0);
const [staffName, setStaffName] = useState("");
const [selectedShift, setSelectedShift] = useState<"early" | "late">("early");
const [noDifferenceChecked, setNoDifferenceChecked] = useState(false);


  const [selectedDate, setSelectedDate] = useState(new Date());

  const [startCup, setStartCupState] = useState<StartCupState>({
    early: { ice: 0, hot: 0 },
    late: { ice: 0, hot: 0 },
  });

  const [keypadOpen, setKeypadOpen] = useState(false);
  const [keypadTarget, setKeypadTarget] = useState<{
    shift: "early" | "late";
    type: "ice" | "hot";
  } | null>(null);
  const [keypadInput, setKeypadInput] = useState("");

const [reportEarly, setReportEarly] = useState<Report | null>(null);
const [reportLate, setReportLate] = useState<Report | null>(null);

  const LOCAL_STORAGE_KEY = "startCupData";

  useEffect(() => {
  const fetchStartCupFromSupabase = async () => {
    const dateStr = selectedDate.toISOString().slice(0, 10);
    try {
      const { data, error } = await supabase
        .from("start_cups")
        .select("shift, drink_type, count")
        .eq("date", dateStr);

      if (error) throw error;

      const initial: StartCupState = {
        early: { ice: 0, hot: 0 },
        late: { ice: 0, hot: 0 },
      };

      data.forEach((row: any) => {
        const shift = row.shift as "early" | "late";
        const drink_type = row.drink_type as "ice" | "hot";
        const count = row.count ?? 0;
        initial[shift][drink_type] = count;
      });

      setStartCupState(initial);
    } catch (e) {
      console.error("スタートカップ読み込み失敗", e);
      // 失敗時はローカルストレージ読み込みを残すならここに処理を追加してもOK
    }
  };

  fetchStartCupFromSupabase();
}, [selectedDate]);

useEffect(() => {
  const fetchReports = async () => {
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("sales_reports")
      .select("*")
      .eq("date", dateStr);

    if (error) {
      console.error("報告データ取得エラー", error);
      return;
    }

    setReportEarly(data.find((item) => item.shift === "early") || null);
    setReportLate(data.find((item) => item.shift === "late") || null);
  };

  fetchReports();
}, [selectedDate]);


  const setStartCup = (
    updater: StartCupState | ((prev: StartCupState) => StartCupState)
  ) => {
    setStartCupState((prev) => {
      const newState = typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
      } catch (e) {
        console.error("スタートカップ保存失敗", e);
      }
      return newState;
    });
  };

  useEffect(() => {
    fetchOrdersByDate(selectedDate);
  }, [selectedDate]);

  const fetchOrdersByDate = async (date: Date) => {
    try {
      const dateStr = date.toISOString().slice(0, 10);

      const resOrders = await fetch(`/api/orders?date=${dateStr}`);
      const text = await resOrders.text();
      const rawData = text ? JSON.parse(text) : [];

      const data: Order[] = rawData.map((raw: any) => toCamelCaseOrder(raw));

      const filtered = data.filter((o) => {
        if (!o.createdAt) return false;

        const created = new Date(o.createdAt);
        if (isNaN(created.getTime())) return false;

        const createdJST = new Date(created.getTime() + 9 * 60 * 60 * 1000);
        const createdDateStr = createdJST.toISOString().slice(0, 10);
        const targetDateStr = date.toISOString().slice(0, 10);
        return createdDateStr === targetDateStr;
      });

      setOrders(filtered);

      const cutoff = new Date(`${dateStr}T16:50:00`);
      const completed = filtered.filter((o) => o.status === "completed");

      const earlySummary = initSummary();
      const lateSummary = initSummary();

      completed.forEach((order) => {
        const time = new Date(order.createdAt);
        const target = time <= cutoff ? earlySummary : lateSummary;

        target.total += 1;
        target[order.drinkType] += 1;

        const normalizedMethod = normalizePaymentMethod(order.paymentMethod);

        if (normalizedMethod !== "その他") {
          if (order.price === 300) {
            target.byType300[normalizedMethod] += 1;
            if (normalizedMethod === "現金") target.sales300 += order.price;
          } else if (order.price === 500) {
            target.byType500[normalizedMethod] += 1;
            if (normalizedMethod === "現金") target.sales500 += order.price;
          }
        }

        if (normalizedMethod === "現金") {
          target.sales += order.price;
        }
      });

      setEarly(earlySummary);
      setLate(lateSummary);
    } catch (error) {
      console.error("データ取得失敗", error);
    }
  };

  const calcRemaining = (
    shift: "early" | "late",
    type: "ice" | "hot"
  ): number => {
    return Math.max(
      startCup[shift][type] - (shift === "early" ? early : late)[type],
      0
    );
  };

const handleSubmitAdjustment = async () => {
  const dateStr = selectedDate.toISOString().slice(0, 10);
  const shift = selectedShift; 


  try {
    const { data, error } = await supabase
      .from("sales_reports")
      .upsert([
        {
          date: dateStr,
          shift,
          diff: (noDifferenceChecked ? 0 : diffValue).toString(),
          note: staffName,
          staff: staffName,  // ここを追加
        },
      ], { onConflict: "date,shift" });

    console.log("APIレスポンス:", { data, error });

    if (error) {
      throw error;
    }

    alert("調整額を保存しました！");
    setAdjustmentOpen(false);
  } catch (err) {
    console.error("保存エラー:", err);
    alert("保存に失敗しました");
  }
};


  const openKeypad = (shift: "early" | "late", type: "ice" | "hot") => {
    setKeypadTarget({ shift, type });
    setKeypadInput(startCup[shift][type].toString());
    setKeypadOpen(true);
  };

  const closeKeypad = () => {
    setKeypadOpen(false);
    setKeypadTarget(null);
    setKeypadInput("");
  };

  const onKeypadInput = (num: string) => {
    if (keypadInput === "0") {
      setKeypadInput(num);
    } else {
      setKeypadInput((prev) => prev + num);
    }
  };

  const onKeypadDelete = () => {
    setKeypadInput((prev) => (prev.length <= 1 ? "" : prev.slice(0, -1)));
  };

const onKeypadConfirm = async () => {
  if (!keypadTarget) return;
  const val = Number(keypadInput);
  if (isNaN(val) || val < 0) {
    alert("正しい数字を入力してください");
    return;
  }

  const dateStr = selectedDate.toISOString().slice(0, 10);
  try {
    await saveStartCupToSupabase(dateStr, keypadTarget.shift, keypadTarget.type, val);
    setStartCup((prev) => ({
      ...prev,
      [keypadTarget.shift]: {
        ...prev[keypadTarget.shift],
        [keypadTarget.type]: val,
      },
    }));
  } catch {
    alert("スタートカップの保存に失敗しました");
  }

  closeKeypad();
};


  const calcSumByType = (byType: { [key in PaymentMethodType]: number }) => {
    return (
      byType.現金 + byType["4円"] + byType["1円"] + byType.スロ + byType.その他
    );
  };

  const renderPaymentTable = (
    title: string,
    byType: { [key in PaymentMethodType]: number },
    sales: number
  ) => {
    const 合計杯数 = calcSumByType(byType);

    return (
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2 text-[#004b38]">{title}</h3>
        <table className="table-auto w-full text-center border-collapse border border-gray-300">
          <thead>
            <tr className="bg-[#e6f2ec]">
              <th className="border border-gray-300 p-2">現金</th>
              <th className="border border-gray-300 p-2">4円</th>
              <th className="border border-gray-300 p-2">1円</th>
              <th className="border border-gray-300 p-2">スロ</th>
              <th className="border border-gray-300 p-2">合計</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold">
                {byType.現金} 杯
              </td>
              <td className="border border-gray-300 p-2 font-semibold">
                {byType["4円"]} 杯
              </td>
              <td className="border border-gray-300 p-2 font-semibold">
                {byType["1円"]} 杯
              </td>
              <td className="border border-gray-300 p-2 font-semibold">
                {byType.スロ} 杯
              </td>
              <td className="border border-gray-300 p-2 font-semibold">
                {合計杯数} 杯
              </td>
            </tr>
            <tr>
              <td
                className="border border-gray-300 p-2 font-semibold text-left"
                colSpan={5}
              >
                現金売上：{sales.toLocaleString()} 円
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummaryTable = (
    label: string,
    s: ShiftSummary,
    shift: "early" | "late",
    report: Report | null
) => {
  const 合計杯数 = s.ice + s.hot;
  const 合計残カップ = calcRemaining(shift, "ice") + calcRemaining(shift, "hot");
  const diff = report ? Number(report.diff) : 0;
  const 合計現金売上 = s.sales + diff;

    return (
      <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-xl mx-auto mb-8">
        <h2 className="text-2xl font-bold text-[#004b38] mb-4">{label}</h2>

        <div className="mb-4 flex flex-col items-center gap-1 text-lg font-semibold text-[#004b38]">
          <div className="flex gap-6">
            <div className="text-center">
              スタートカップ アイス:{" "}
              <input
                type="text"
                readOnly
                value={startCup[shift].ice}
                className="w-20 text-center border border-[#004b38] rounded p-1 cursor-pointer bg-green-50"
                onClick={() => openKeypad(shift, "ice")}
              />{" "}
              個
            </div>
            <div className="text-center">
              スタートカップ ホット:{" "}
              <input
                type="text"
                readOnly
                value={startCup[shift].hot}
                className="w-20 text-center border border-[#004b38] rounded p-1 cursor-pointer bg-green-50"
                onClick={() => openKeypad(shift, "hot")}
              />{" "}
              個
            </div>
          </div>
        </div>

        <table className="table-auto w-full mb-4 text-center border-collapse border border-gray-300">
          <thead>
            <tr className="bg-[#e6f2ec]">
              <th className="border border-gray-300 p-2"></th>
              <th className="border border-gray-300 p-2">アイス</th>
              <th className="border border-gray-300 p-2">ホット</th>
              <th className="border border-gray-300 p-2">合計</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold text-[#004b38]">
                杯数
              </td>
              <td className="border border-gray-300 p-2">{s.ice} 杯</td>
              <td className="border border-gray-300 p-2">{s.hot} 杯</td>
              <td className="border border-gray-300 p-2">{合計杯数} 杯</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 font-semibold text-[#004b38]">
                残カップ数
              </td>
              <td className="border border-gray-300 p-2">
                {calcRemaining(shift, "ice")} 個
              </td>
              <td className="border border-gray-300 p-2">
                {calcRemaining(shift, "hot")} 個
              </td>
              <td className="border border-gray-300 p-2">{合計残カップ} 個</td>
            </tr>
          </tbody>
        </table>

        {renderPaymentTable("300円商品 支払内訳", s.byType300, s.sales300)}

        {renderPaymentTable("500円商品 支払内訳", s.byType500, s.sales500)}

    <div className="mb-3 text-right font-bold text-lg text-[#004b38]">
        合計売上：{(s.sales300 + s.sales500).toLocaleString()} 円
      </div>

      <div className="mb-3 text-right font-bold text-lg text-[#004b38]">
        合計現金売上（調整額込）：{合計現金売上.toLocaleString()} 円
        {diff !== 0 && (
          <span className="ml-3 text-sm text-gray-600">
            （調整額 {diff > 0 ? "+" : ""}
            {diff.toLocaleString()} 円）
          </span>
        )}
      </div>
    </div>
  );
};

type Report = {
  diff: string | number;
  staff?: string;
  note?: string;
};

function ReportInfo({ report }: { report: Report }) {
  if (!report) return null;

  const diff = Number(report.diff);
  const staff = report.staff || report.note || "";

  return (
    <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-300 text-[#004b38] max-w-xl mx-auto">
      {diff === 0 ? (
        <div>
          調整額：0円（{staff ? `担当者: ${staff}、誤差無し` : "誤差無し"}）
        </div>
      ) : (
        <div>
          調整額：{diff > 0 ? "+" : ""}
          {diff.toLocaleString()}円
          {staff && `（担当者: ${staff}）`}
        </div>
      )}
    </div>
  );
}




  const renderTotalTable = (label: string, s: ShiftSummary) => {
    const 合計杯数 = s.ice + s.hot;

    return (
      <div className="bg-white rounded-2xl shadow-md p-6 w-full max-w-xl mx-auto mb-8">
        <h2 className="text-2xl font-bold text-[#004b38] mb-4">{label}</h2>

        <table className="table-auto w-full mb-4 text-center border-collapse border border-gray-300">
          <thead>
            <tr className="bg-[#e6f2ec]">
              <th className="border border-gray-300 p-2">アイス</th>
              <th className="border border-gray-300 p-2">ホット</th>
              <th className="border border-gray-300 p-2">合計</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">{s.ice} 杯</td>
                           <td className="border border-gray-300 p-2">{s.hot} 杯</td>
              <td className="border border-gray-300 p-2">{合計杯数} 杯</td>
            </tr>
          </tbody>
        </table>

        {renderPaymentTable("300円商品 支払内訳", s.byType300, s.sales300)}

        {renderPaymentTable("500円商品 支払内訳", s.byType500, s.sales500)}

        <div className="mb-3 text-right font-bold text-lg text-[#004b38]">
  合計現金売上：{s.sales.toLocaleString()} 円
</div>

      </div>
    );
  };

  const onDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
  };

  const goBack = () => {
    router.back();
  };

const totalDiff =
  (reportEarly ? Number(reportEarly.diff) : 0) +
  (reportLate ? Number(reportLate.diff) : 0);

  return (
  <div className="p-6 bg-[#f8f5f0] min-h-screen">

      <button
        className="bg-[#004b38] text-white rounded-md px-5 py-2 mb-6 hover:bg-[#003424] transition-colors"
        onClick={goBack}
      >
        戻る
      </button>

      <div className="mb-6 max-w-xl mx-auto">
        <label
          htmlFor="date"
          className="block mb-2 font-bold text-[#004b38] text-lg"
        >
          集計日を選択してください
        </label>
        <input
          id="date"
          type="date"
          value={selectedDate.toISOString().slice(0, 10)}
          onChange={onDateChange}
          className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#004b38]"
        />
      </div>

  {renderSummaryTable("早番集計 (〜16:50)", early, "early", reportEarly)}
{reportEarly && <ReportInfo report={reportEarly} />}

{renderSummaryTable("遅番集計 (16:51～)", late, "late", reportLate)}
{reportLate && <ReportInfo report={reportLate} />}

{renderTotalTable(
  "合計",
  {
    total: early.total + late.total,
    ice: early.ice + late.ice,
    hot: early.hot + late.hot,
    sales: early.sales + late.sales + totalDiff,  // ←ここで調整額をプラス
    byType300: {
      現金: early.byType300.現金 + late.byType300.現金,
      "4円": early.byType300["4円"] + late.byType300["4円"],
      "1円": early.byType300["1円"] + late.byType300["1円"],
      スロ: early.byType300.スロ + late.byType300.スロ,
      その他: early.byType300.その他 + late.byType300.その他,
    },
    sales300: early.sales300 + late.sales300,
    byType500: {
      現金: early.byType500.現金 + late.byType500.現金,
      "4円": early.byType500["4円"] + late.byType500["4円"],
      "1円": early.byType500["1円"] + late.byType500["1円"],
      スロ: early.byType500.スロ + late.byType500.スロ,
      その他: early.byType500.その他 + late.byType500.その他,
    },
    sales500: early.sales500 + late.sales500,
  }
)}

      
      <div className="mb-8 text-center">
  <button
    className="bg-[#004b38] text-white rounded-md px-6 py-3 text-lg font-semibold hover:bg-[#003424] transition-colors"
    onClick={() => setAdjustmentOpen(true)}
  >
    報告
  </button>
</div>

      {/* 数字入力キーパッド */}
      {keypadOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
            <div className="mb-5 text-center text-xl font-semibold text-[#004b38]">
              スタートカップ入力
            </div>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md p-3 mb-5 text-right text-3xl font-mono"
              value={keypadInput}
              readOnly
            />
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  className="bg-[#004b38] hover:bg-[#003424] text-white rounded-lg py-3 text-2xl font-semibold transition-colors"
                  onClick={() => onKeypadInput(num.toString())}
                >
                  {num}
                </button>
              ))}
              <button
                className="bg-gray-300 hover:bg-gray-400 rounded-lg py-3 text-2xl font-semibold transition-colors"
                onClick={onKeypadDelete}
              >
                ←
              </button>
              <button
                className="bg-[#004b38] hover:bg-[#003424] text-white rounded-lg py-3 text-2xl font-semibold transition-colors"
                onClick={() => onKeypadInput("0")}
              >
                0
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 text-2xl font-semibold transition-colors"
                onClick={closeKeypad}
              >
                ×
              </button>
            </div>
            <button
              className="bg-green-700 hover:bg-green-800 text-white rounded-lg py-3 w-full text-2xl font-semibold transition-colors"
              onClick={onKeypadConfirm}
            >
              確定
            </button>
          </div>
        </div>
      )}

      {adjustmentOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg">
      <div className="mb-5 text-center text-xl font-semibold text-[#004b38]">
        売上調整報告
      </div>

      <div className="mb-4">

        <div className="mb-4">
  <label className="block mb-1 font-bold">シフト選択</label>
  <select
    value={selectedShift}
    onChange={(e) => setSelectedShift(e.target.value as "early" | "late")}
    className="w-full border rounded-md p-2"
  >
    <option value="early">早番</option>
    <option value="late">遅番</option>
  </select>
</div>

        <label className="block mb-1 font-bold">調整額 (±円)</label>
        <input
  type="number"
  value={noDifferenceChecked ? 0 : diffValue === 0 ? "" : diffValue}
  onChange={(e) => {
    const val = e.target.value;
    // 空文字は0として扱うなら別途調整可能
    setDiffValue(val === "" ? 0 : Number(val));
  }}
  disabled={noDifferenceChecked}
  className="w-full border rounded-md p-2"
/>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-bold">担当者名 (任意)</label>
        <input
          type="text"
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
          className="w-full border rounded-md p-2"
        />
      </div>

      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={noDifferenceChecked}
            onChange={(e) => setNoDifferenceChecked(e.target.checked)}
            className="mr-2"
          />
          誤算無し
        </label>
      </div>

      <button
        className="bg-green-700 hover:bg-green-800 text-white rounded-lg py-3 w-full text-2xl font-semibold transition-colors"
        onClick={handleSubmitAdjustment}
      >
        保存
      </button>
      <button
        className="mt-3 bg-gray-300 hover:bg-gray-400 text-black rounded-lg py-2 w-full text-lg font-semibold transition-colors"
        onClick={() => setAdjustmentOpen(false)}
      >
        閉じる
      </button>
    </div>
  </div>
)}

    </div>
  );
}

