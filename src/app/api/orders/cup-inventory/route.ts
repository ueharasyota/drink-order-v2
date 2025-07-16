import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabaseClient'; // ✅ ここに追加

const dataFile = path.join(process.cwd(), 'data', 'cupInventory.json');

export async function GET() {
  try {
    const raw = await fs.readFile(dataFile, 'utf-8');
    const data = raw.trim() === '' ? [] : JSON.parse(raw);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: '読み込みエラー' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const newRecord = await req.json();

    if (
      !newRecord.date ||
      typeof newRecord.inStock !== 'number' ||
      typeof newRecord.outStock !== 'number' ||
      !['アイス', 'ホット'].includes(newRecord.cupType)
    ) {
      return NextResponse.json({ error: '不正なデータ形式' }, { status: 400 });
    }

    const raw = await fs.readFile(dataFile, 'utf-8');
    const existing = raw.trim() === '' ? [] : JSON.parse(raw);

    const updated = [...existing, newRecord];
    await fs.writeFile(dataFile, JSON.stringify(updated, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '書き込みエラー' }, { status: 500 });
  }
}
