import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const ORDERS_PATH = path.join(process.cwd(), 'data/orders.json');
const CUP_INVENTORY_PATH = path.join(process.cwd(), 'data/cup-inventory.json');

export async function POST() {
  try {
    const ordersRaw = await fs.readFile(ORDERS_PATH, 'utf8');
    const cupInventoryRaw = await fs.readFile(CUP_INVENTORY_PATH, 'utf8');

    const orders = JSON.parse(ordersRaw);
    const cupInventory = JSON.parse(cupInventoryRaw);

    // 対象日 = 今日の日付 -1日（＝前日）
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;

    // すでに登録済みならスキップ
    const alreadyExists = cupInventory.some((entry: any) => entry.date === dateKey);
    if (alreadyExists) {
      return NextResponse.json({ success: true, message: 'すでに記録済みです' });
    }

    // 対象日の注文を取得
    const targetOrders = orders.filter((o: any) => {
      const orderDate = new Date(o.createdAt);
      const orderYMD = orderDate.toISOString().slice(0, 10); // YYYY-MM-DD
      return orderYMD === dateKey && o.status === 'completed';
    });

    const iceUsed = targetOrders.filter((o: any) => o.drinkType === 'ice').length;
    const hotUsed = targetOrders.filter((o: any) => o.drinkType === 'hot').length;

    // 新しいエントリ
    const newEntry = {
      date: dateKey,
      iceUsed,
      hotUsed,
      plannedIce: 0, // 廃止
      plannedHot: 0, // 廃止
    };

    cupInventory.push(newEntry);
    await fs.writeFile(CUP_INVENTORY_PATH, JSON.stringify(cupInventory, null, 2), 'utf8');

    return NextResponse.json({ success: true, message: '自動記録完了', data: newEntry });
  } catch (error) {
    console.error('自動在庫記録エラー:', error);
    return NextResponse.json({ success: false, error: '記録処理失敗' }, { status: 500 });
  }
}

