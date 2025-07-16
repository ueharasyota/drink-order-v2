import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabaseClient';

// GET: 日付指定で注文取得
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  let query = supabase.from("orders").select("*").order("createdAt", { ascending: false });

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


 // ここでキャメルケースに変換
  const convertedData = data.map((order: any) => ({
    id: order.id,
    status: order.status,
    drinkType: order.drink_type,
    menu: order.menu,
    price: order.price,
    milk: order.milk,
    sugar: order.sugar,
    tableNumber: order.table_number,
    paymentMethod: order.paymentMethod,
    receiptStatus: order.receiptStatus,
    cashAmount: order.cashAmount,
    note: order.note,
    createdAt: order.createdAt,
  }));


  console.log("取得した注文データ:", data);
  return NextResponse.json(data);
}



// POST: 新規注文追加
export async function POST(request: NextRequest) {
  try {
    const newOrder = await request.json();

    if (!newOrder || !newOrder.menu || !newOrder.table_number) {
      return NextResponse.json({ success: false, error: '必要な項目が不足しています' }, { status: 400 });
    }

    const orderWithMeta = {
      ...newOrder,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([orderWithMeta])
      .select();

    if (error) {
       console.error("Supabase insert error:", error);
      return NextResponse.json({ success: false, error: '注文の保存に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data[0] });
  } catch (error) {
    console.error('注文保存例外エラー:', error);
    return NextResponse.json({ success: false, error: '注文の保存に失敗しました' }, { status: 500 });
  }
}

// PATCH: 注文ステータス更新
export async function PATCH(request: NextRequest) {
  try {
    const { id, status } = await request.json();

    if (typeof id !== 'number' || typeof status !== 'string') {
      return NextResponse.json({ success: false, error: 'id と status は正しい型である必要があります' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select();

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: false, error: '注文状態の更新に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data[0] });
  } catch (error) {
    console.error('注文状態更新例外エラー:', error);
    return NextResponse.json({ success: false, error: '注文状態の更新に失敗しました' }, { status: 500 });
  }

  
}
