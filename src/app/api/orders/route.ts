import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";


// GET: 日付指定で注文取得
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  let query = supabase
    .from("orders")
    .select("*")
    .order("createdAt", { ascending: false });

  if (dateParam) {
    const from = `${dateParam}T00:00:00+09:00`;
    const to   = `${dateParam}T23:59:59+09:00`;
    query = query.gte("createdAt", from).lte("createdAt", to);
  }

  const { data, error } = await query;
  if (error) {
    console.error("注文取得エラー:", error);
    return NextResponse.json(
      { success: false, error: "注文データ取得失敗" },
      { status: 500 }
    );
  }

  const converted = data.map((o: any) => ({
    id:            o.id,
    status:        o.status,
    // ← snake OR camel 両方拾う
    drinkType:     o.drink_type   ?? o.drinkType,
    menu:          o.menu,
    price:         o.price,
    milk:          o.milk,
    sugar:         o.sugar,
    tableNumber:   o.table_number ?? o.tableNumber,
    paymentMethod: o.paymentMethod ?? o.payment_method ?? o.paymentmethod,
    receiptStatus: o.receiptStatus ?? o.receipt_status ?? o.receiptstatus,
    cashAmount:    o.cashAmount    ?? o.cash_amount    ?? o.cashamount,
    note:          o.note,
    createdAt:     o.createdAt     ?? o.created_at     ?? o.createdat,
  }));

  return NextResponse.json(converted);
}

/* ---------------------------------------------------
   POST: 新規注文追加
   ── DB 列を camelCase に揃える ──
--------------------------------------------------- */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    const tableNum = body.tableNumber ?? body.table_number;
    if (!body.menu || !tableNum) {
      return NextResponse.json({ success: false, error: "必要な項目が不足しています" }, { status: 400 });
    }

    const orderWithMeta = {
      drink_type: body.drinkType ?? body.drink_type,        // ← DB は snake のまま
      menu: body.menu,
      price: body.price,
      milk: body.milk,
      sugar: body.sugar,
      table_number: tableNum,
      // 👇 camelCase 列で保存
      paymentMethod: body.paymentMethod ?? body.payment_method,
      receiptStatus: body.receiptStatus ?? body.receipt_status,
      cashAmount: body.cashAmount ?? body.cash_amount,
      note: body.note,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("orders").insert([orderWithMeta]).select();
    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ success: false, error: "注文の保存に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data[0] });
  } catch (err) {
    console.error("注文保存例外エラー:", err);
    return NextResponse.json({ success: false, error: "注文の保存に失敗しました" }, { status: 500 });
  }
}

/* ---------------------------------------------------
   PATCH: 注文ステータス更新（そのまま）
--------------------------------------------------- */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { id, status } = await request.json();

    if (typeof id !== "number" || typeof status !== "string") {
      return NextResponse.json({ success: false, error: "id と status は正しい型である必要があります" }, { status: 400 });
    }

    const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select();
    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: false, error: "注文状態の更新に失敗しました" }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data[0] });
  } catch (error) {
    console.error("注文状態更新例外エラー:", error);
    return NextResponse.json({ success: false, error: "注文状態の更新に失敗しました" }, { status: 500 });
  }
}
