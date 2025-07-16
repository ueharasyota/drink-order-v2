import { NextResponse } from "next/server";
import { readFile } from "fs/promises";

export async function GET() {
  try {
    const data = await readFile("data/cup-inventory.json", "utf-8");
    const records = JSON.parse(data);

    // 最終営業日を見つけるロジック（例：最も直近の日付の remainingIce / remainingHot を返す）
    const latest = [...records]
      .reverse()
      .find((r) => r.remainingIce != null && r.remainingHot != null);

    if (!latest) {
      return NextResponse.json({ remainingIce: 0, remainingHot: 0 });
    }

    return NextResponse.json({
      remainingIce: latest.remainingIce,
      remainingHot: latest.remainingHot,
    });
  } catch (err) {
    console.error("Failed to fetch previous remaining cups", err);
    return new NextResponse("Failed to fetch previous remaining cups", {
      status: 500,
    });
  }
}

