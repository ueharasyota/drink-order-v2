import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

// GET: 日付指定で注文取得
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  // 欲しい列を明示し、createdAt を AS で小文字始まりを防ぐ
  let query = supabase
    .from("orders")
    .select(
      `
      id,
      status,
      drink_type,
      menu,
      price,
      milk,
      sugar,
      table_number,
      paymentMethod,
      receiptStatus,
      cashAmount,
      note,
      createdAt   /* 👈 カラム名を明示 */
    `
    )
    .order("createdAt", { ascending: false });

  if (dateParam) {
    const from = `${dateParam}T00:00:00+09:00`;
    const to = `${dateParam}T23:59:59+09:00`;
    query = query.gte("createdAt", from).lte("createdAt", to);
  }

  const { data, error } = await query;

  if (error) {
    console.error("注文取得エラー:", error);
    return NextResponse.json({ success: false, error: "注文データ取得失敗" }, { status: 500 });
  }

  return NextResponse.json(data);      // ← createdAt が必ず入る
}

// POST: 新規注文追加
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    /* ---------- ① 必須チェック ---------- */
    const tableNum = body.tableNumber ?? body.table_number;
    if (!body.menu || !tableNum) {
      return NextResponse.json(
        { success: false, error: "必要な項目が不足しています" },
        { status: 400 }
      );
    }

    /* ---------- ② DBカラム名に合わせて整形 (camelCase) ---------- */
    const orderWithMeta = {
      drink_type: body.drinkType ?? body.drink_type, // DBでsnake_caseなら維持
      menu: body.menu,
      price: body.price,
      milk: body.milk,
      sugar: body.sugar,
      table_number: tableNum, // DBでsnake_caseなら維持
      paymentMethod: body.paymentMethod ?? body.payment_method,
      receiptStatus: body.receiptStatus ?? body.receipt_status,
      cashAmount: body.cashAmount ?? body.cash_amount,
      note: body.note,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    /* ---------- ③ SupabaseへINSERT ---------- */
    const { data, error } = await supabase.from("orders").insert([orderWithMeta]).select();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { success: false, error: "注文の保存に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order: data[0] });
  } catch (err) {
    console.error("注文保存例外エラー:", err);
    return NextResponse.json(
      { success: false, error: "注文の保存に失敗しました" },
      { status: 500 }
    );
  }
}

// PATCH: 注文ステータス更新
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    const { id, status } = await request.json();

    if (typeof id !== "number" || typeof status !== "string") {
      return NextResponse.json(
        { success: false, error: "id と status は正しい型である必要があります" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select();

    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { success: false, error: "注文状態の更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, order: data[0] });
  } catch (error) {
    console.error("注文状態更新例外エラー:", error);
    return NextResponse.json(
      { success: false, error: "注文状態の更新に失敗しました" },
      { status: 500 }
    );
  }
}
