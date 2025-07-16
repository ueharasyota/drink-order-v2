import { promises as fs } from 'fs';
import path from 'path';

type CupInventoryRecord = {
  date: string; // e.g., "2025-06-29"
  iceUsed: number;
  hotUsed: number;
  plannedIce: number;
  plannedHot: number;
};

export async function getPreviousCupRemaining(baseDate: Date) {
  const targetDate = new Date(baseDate);
  targetDate.setDate(targetDate.getDate() - 1);
  const targetDateStr = targetDate.toISOString().slice(0, 10);

  const filePath = path.join(process.cwd(), 'data/cup-inventory.json');
  const json = await fs.readFile(filePath, 'utf-8');
  const data: CupInventoryRecord[] = JSON.parse(json);

  const record = data.find((d) => d.date === targetDateStr);
  if (!record) {
    return { ice: 0, hot: 0 }; // 前日データが無ければ 0 扱い
  }

  return {
    ice: Math.max(record.plannedIce - record.iceUsed, 0),
    hot: Math.max(record.plannedHot - record.hotUsed, 0),
  };
}
