'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

type PaymentMethodType = "現金" | "4円" | "1円" | "スロ" | "その他";
type DrinkType = "ice" | "hot";
type ShiftType = "early" | "late";

interface Order {
  id: number;
  createdAt: string;
  drinkType: DrinkType;
  menu: string;
  price: number;
  milk: string;
  sugar: string;
  tableNumber: number | string;
  paymentMethod: PaymentMethodType | string;
  receiptStatus: string;
  cashAmount?: number;
  note: string;
  status: "pending" | "completed" | "cancelled";
}

interface RawOrder {
  id: number;
  created_at?: string;
  createdAt?: string;
  drink_type: string | null;
  menu?: string;
  price?: number | string;
  milk?: string;
  sugar?: string;
  table_number?: number | string;
  paymentMethod?: string;
  receiptStatus?: string;
  cashAmount?: number | string | null;
  note?: string;
  status?: "pending" | "completed" | "cancelled";
}

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

interface SalesReport {
  date: string;
  shift: ShiftType;
  diff: string | number;
  staff?: string;
  note?: string;
}

const LOCAL_STORAGE_KEY = "startCupData";

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

const toCamelCaseOrder = (raw: RawOrder): Order => {
  const drinkType: DrinkType = raw.drink_type === "ice" || raw.drink_type === "hot"
    ? raw.drink_type
    : "ice";

  return {
    id: raw.id,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    drinkType,
    menu: raw.menu ?? "",
    price: Number(raw.price) || 0,
    milk: raw.milk ?? "",
    sugar: raw.sugar ?? "",
    tableNumber: raw.table_number ?? "",
    paymentMethod: typeof raw.paymentMethod === "string" ? raw.paymentMethod : "その他",
    receiptStatus: raw.receiptStatus ?? "",
    cashAmount: raw.cashAmount !== null && raw.cashAmount !== undefined ? Number(raw.cashAmount) : undefined,
    note: raw.note ?? "",
    status: raw.status ?? "pending",
  };
};

export default function SalesPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [early, setEarly] = useState<ShiftSummary>(initSummary());
  const [late, setLate] = useState<ShiftSummary>(initSummary());
  const [adjustmentOpen, setAdjustmentOpen] = useState<boolean>(false);
  const [diffValue, setDiffValue] = useState<number>(0);
  const [staffName, setStaffName] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<ShiftType>("early");
  const [noDifferenceChecked, setNoDifferenceChecked] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startCup, setStartCupState] = useState<StartCupState>({
    early: { ice: 0, hot: 0 },
    late: { ice: 0, hot: 0 },
  });
  const [keypadOpen, setKeypadOpen] = useState<boolean>(false);
  const [keypadTarget, setKeypadTarget] = useState<{ shift: ShiftType; type: DrinkType } | null>(null);
  const [keypadInput, setKeypadInput] = useState<string>("");

  const [reportEarly, setReportEarly] = useState<SalesReport | null>(null);
  const [reportLate, setReportLate] = useState<SalesReport | null>(null);

  /** Supabaseからstart_cupsテーブルの該当日の値を取得 */
  const fetchStartCupFromSupabase = async (): Promise<void> => {
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

      data?.forEach((row: { shift: ShiftType; drink_type: DrinkType; count?: number }) => {
        initial[row.shift][row.drink_type] = row.count ?? 0;
      });

      setStartCupState(initial);
    } catch (e) {
      console.error("スタートカップ読み込み失敗", e);
      // ローカルストレージから復元試み
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          setStartCupState(JSON.parse(saved));
        }
      } catch {}
    }
  };

/** Supabaseから売上調整レポート取得 */
const fetchReports = async (): Promise<void> => {
  const dateStr = selectedDate.toISOString().slice(0, 10);
  try {
    const { data, error } = await supabase
      .from("sales_reports")
      .select("*")
      .eq("date", dateStr);

    if (error) throw error;

    const typedData = data as SalesReport[] | null;

    setReportEarly(typedData?.find(item => item.shift === "early") ?? null);
    setReportLate(typedData?.find(item => item.shift === "late") ?? null);
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error("報告データ取得エラー", e.message);
    } else {
      console.error("報告データ取得エラー", e);
    }
  }
};

  /** スタートカップ状態更新 + ローカルストレージに保存 */
  const setStartCup = (
    updater: StartCupState | ((prev: StartCupState) => StartCupState)
  ): void => {
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

  /** JST変換 */
  const toJST = (date: Date): Date => new Date(date.getTime() + 9 * 60 * 60 * 1000);

  /** 選択日付の注文データをAPIから取得し集計 */
  const fetchOrdersByDate = async (date: Date): Promise<void> => {
    try {
      const dateStr = date.toISOString().slice(0, 10);

      const resOrders = await fetch(`/api/orders?date=${dateStr}`);
      if (!resOrders.ok) throw new Error(`Orders API error: ${resOrders.statusText}`);

      const rawData: RawOrder[] = await resOrders.json();
      const data: Order[] = rawData.map(toCamelCaseOrder);

      const filtered = data.filter((o) => {
        if (!o.createdAt) return false;
        const created = new Date(o.createdAt);
        if (isNaN(created.getTime())) return false;

        const createdJST = toJST(created);
        return createdJST.toISOString().slice(0, 10) === dateStr;
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

  /** 指定シフト・種類の残りカップ数計算 */
  const calcRemaining = (shift: ShiftType, type: DrinkType): number => {
    return Math.max(startCup[shift][type] - (shift === "early" ? early : late)[type], 0);
  };

  /** スタートカップ保存（追加・更新） */
  const saveStartCupToSupabase = async (
    dateStr: string,
    shift: ShiftType,
    drinkType: DrinkType,
    count: number
  ): Promise<void> => {
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

  /** 売上調整保存 */
  const handleSubmitAdjustment = async (): Promise<void> => {
    const dateStr = selectedDate.toISOString().slice(0, 10);
    const shift = selectedShift;

    try {
      const { data, error } = await supabase
        .from("sales_reports")
        .upsert(
          [
            {
              date: dateStr,
              shift,
              diff: noDifferenceChecked ? 0 : diffValue,
              note: staffName,
              staff: staffName,
            },
          ],
          { onConflict: "date,shift" }
        );

      if (error) throw error;

      alert("調整額を保存しました！");
      setAdjustmentOpen(false);
    } catch (err) {
      console.error("保存エラー:", err);
      alert("保存に失敗しました");
    }
  };

  /** キーパッド関連 */
  const openKeypad = (shift: ShiftType, type: DrinkType): void => {
    setKeypadTarget({ shift, type });
    setKeypadInput(startCup[shift][type].toString());
    setKeypadOpen(true);
  };

  const closeKeypad = (): void => {
    setKeypadOpen(false);
    setKeypadTarget(null);
    setKeypadInput("");
  };

  const onKeypadInput = (num: string): void => {
    if (keypadInput === "0") {
      setKeypadInput(num);
    } else {
      setKeypadInput((prev) => prev + num);
    }
  };

  const onKeypadDelete = (): void => {
    setKeypadInput((prev) => (prev.length <= 1 ? "" : prev.slice(0, -1)));
  };

  const onKeypadConfirm = async (): Promise<void> => {
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

  /** 種別別合計を計算 */
  const calcSumByType = (byType: Record<PaymentMethodType, number>): number => {
    return (
      byType.現金 + byType["4円"] + byType["1円"] + byType.スロ + byType.その他
    );
  };

  /** 支払い種別別テーブルレンダリング */
  const renderPaymentTable = (
    title: string,
    byType: Record<PaymentMethodType, number>,
    salesTotal: number
  ) => (
    <>
      <h4>{title}</h4>
      <table>
        <thead>
          <tr>
            {(["現金", "4円", "1円", "スロ", "その他"] as PaymentMethodType[]).map(
              (method) => (
                <th key={method}>{method}</th>
              )
            )}
            <th>合計</th>
            <th>売上</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {(["現金", "4円", "1円", "スロ", "その他"] as PaymentMethodType[]).map(
              (method) => (
                <td key={method}>{byType[method]}</td>
              )
            )}
            <td>{calcSumByType(byType)}</td>
            <td>¥{salesTotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </>
  );

  /** useEffectでデータ取得を連動 */
  useEffect(() => {
    fetchStartCupFromSupabase();
    fetchReports();
    fetchOrdersByDate(selectedDate);
  }, [selectedDate]);

  return (
    <main>
      <h2>売上ページ</h2>
      <label>
        日付選択:
        <input
          type="date"
          value={selectedDate.toISOString().slice(0, 10)}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
        />
      </label>

      <section>
        <h3>早番スタートカップ数</h3>
        <button onClick={() => openKeypad("early", "ice")}>
          アイス: {startCup.early.ice}
        </button>
        <button onClick={() => openKeypad("early", "hot")}>
          ホット: {startCup.early.hot}
        </button>
        <p>
          残り: アイス {calcRemaining("early", "ice")}, ホット{" "}
          {calcRemaining("early", "hot")}
        </p>
        {renderPaymentTable("300円種別別", early.byType300, early.sales300)}
        {renderPaymentTable("500円種別別", early.byType500, early.sales500)}
        <p>売上合計: ¥{early.sales.toLocaleString()}</p>
      </section>

      <section>
        <h3>遅番スタートカップ数</h3>
        <button onClick={() => openKeypad("late", "ice")}>
          アイス: {startCup.late.ice}
        </button>
        <button onClick={() => openKeypad("late", "hot")}>
          ホット: {startCup.late.hot}
        </button>
        <p>
          残り: アイス {calcRemaining("late", "ice")}, ホット{" "}
          {calcRemaining("late", "hot")}
        </p>
        {renderPaymentTable("300円種別別", late.byType300, late.sales300)}
        {renderPaymentTable("500円種別別", late.byType500, late.sales500)}
        <p>売上合計: ¥{late.sales.toLocaleString()}</p>
      </section>

      <section>
        <h3>売上調整</h3>
        <label>
          シフト選択:
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value as ShiftType)}
          >
            <option value="early">早番</option>
            <option value="late">遅番</option>
          </select>
        </label>
        <label>
          差額（調整額）:
          <input
            type="number"
            value={diffValue}
            onChange={(e) => setDiffValue(Number(e.target.value))}
            disabled={noDifferenceChecked}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={noDifferenceChecked}
            onChange={() => {
              setNoDifferenceChecked((prev) => !prev);
              if (!noDifferenceChecked) setDiffValue(0);
            }}
          />
          差額なし
        </label>
        <label>
          担当スタッフ名:
          <input
            type="text"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
          />
        </label>
        <button onClick={handleSubmitAdjustment}>調整を保存</button>
      </section>

      {keypadOpen && (
        <div className="keypad">
          <h3>
            スタートカップ入力 ({keypadTarget?.shift} - {keypadTarget?.type})
          </h3>
          <input
            type="text"
            value={keypadInput}
            readOnly
            style={{ fontSize: "2rem", width: "100%" }}
          />
          <div>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((num) => (
              <button key={num} onClick={() => onKeypadInput(num)}>
                {num}
              </button>
            ))}
            <button onClick={onKeypadDelete}>削除</button>
            <button onClick={onKeypadConfirm}>決定</button>
            <button onClick={closeKeypad}>キャンセル</button>
          </div>
        </div>
      )}
    </main>
  );
}
