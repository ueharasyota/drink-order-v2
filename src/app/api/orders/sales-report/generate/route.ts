import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type PaymentMethodType = "現金" | "4円" | "1円" | "スロ" | "その他";

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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");
    if (!dateParam) {
      return NextResponse.json(
        { success: false, error: "date パラメータが必要です" },
        { status: 400 }
      );
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "completed")
      .gte("created_at", `${dateParam}T00:00:00+09:00`)
      .lte("created_at", `${dateParam}T23:59:59+09:00`);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const cutoff = new Date(`${dateParam}T16:50:00+09:00`);

    const earlySummary = initSummary();
    const lateSummary = initSummary();

    orders?.forEach((order: {
      drink_type: "ice" | "hot";
      created_at: string;
      price: number;
      payment_method: string;
    }) => {
      const createdAt = new Date(order.created_at);
      const target = createdAt <= cutoff ? earlySummary : lateSummary;

      target.total += 1;
      target[order.drink_type] += 1;

      const normalizedMethod = normalizePaymentMethod(order.payment_method);

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

    const totalSummary: ShiftSummary = {
      total: earlySummary.total + lateSummary.total,
      ice: earlySummary.ice + lateSummary.ice,
      hot: earlySummary.hot + lateSummary.hot,
      sales: earlySummary.sales + lateSummary.sales,
      byType300: {
        現金: earlySummary.byType300.現金 + lateSummary.byType300.現金,
        "4円": earlySummary.byType300["4円"] + lateSummary.byType300["4円"],
        "1円": earlySummary.byType300["1円"] + lateSummary.byType300["1円"],
        スロ: earlySummary.byType300.スロ + lateSummary.byType300.スロ,
        その他: earlySummary.byType300.その他 + lateSummary.byType300.その他,
      },
      sales300: earlySummary.sales300 + lateSummary.sales300,
      byType500: {
        現金: earlySummary.byType500.現金 + lateSummary.byType500.現金,
        "4円": earlySummary.byType500["4円"] + lateSummary.byType500["4円"],
        "1円": earlySummary.byType500["1円"] + lateSummary.byType500["1円"],
        スロ: earlySummary.byType500.スロ + lateSummary.byType500.スロ,
        その他: earlySummary.byType500.その他 + lateSummary.byType500.その他,
      },
      sales500: earlySummary.sales500 + lateSummary.sales500,
    };

    const entriesToUpsert = [
      { date: dateParam, shift: "early", diff: "無し", note: "", summary: earlySummary },
      { date: dateParam, shift: "late", diff: "無し", note: "", summary: lateSummary },
      { date: dateParam, shift: "total", diff: "無し", note: "集計自動生成データ", summary: totalSummary },
    ];

    for (const entry of entriesToUpsert) {
      const { error: upsertError } = await supabase
        .from("sales_reports")
        .upsert([{
          date: entry.date,
          shift: entry.shift,
          diff: entry.diff,
          note: entry.note,
          summary: entry.summary,
          updated_at: new Date().toISOString(),
        }], { onConflict: "date,shift" });

      if (upsertError) {
        return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: "集計と保存が完了しました" });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
