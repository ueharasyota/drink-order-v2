import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

const CUP_INVENTORY_PATH = path.join(process.cwd(), "data", "cup-inventory.json");

type CupRecord = {
  date: string;
  plannedIce: number;
  plannedHot: number;
  usedIce: number;
  usedHot: number;
  remainingIce?: number;
  remainingHot?: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Missing date" }, { status: 400 });
  }

  try {
    const fileData = await readFile(CUP_INVENTORY_PATH, "utf-8");
    const data: CupRecord[] = JSON.parse(fileData);

    const current = data.find((d) => d.date === date);

    // 1営業日前の残カップを探す
    let prev: CupRecord | undefined;
    const targetDate = new Date(date);

    for (let i = 1; i <= 7; i++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      prev = data.find((r) => r.date === dStr);
      if (prev) break;
    }

    const totalAvailableIce = (current?.plannedIce || 0) + (prev?.remainingIce || 0);
    const totalAvailableHot = (current?.plannedHot || 0) + (prev?.remainingHot || 0);

    return NextResponse.json({
      date,
      totalAvailableIce,
      totalAvailableHot,
    });
  } catch (e) {
    console.error("Error reading cup inventory:", e);
    return NextResponse.json({ error: "Failed to load cup inventory" }, { status: 500 });
  }
}
