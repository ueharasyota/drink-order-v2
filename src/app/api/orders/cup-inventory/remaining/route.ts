import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date parameter is required" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "data", "cup-inventory.json");
    const fileData = await fs.readFile(filePath, "utf-8");
    const records = JSON.parse(fileData);

    // 日付が一致するデータを探す
    const record = records.find((r: any) => r.date === date);

    if (!record) {
      return NextResponse.json(null);
    }

    // 残カップ数だけ返す
    const { remainingIce, remainingHot } = record;
    return NextResponse.json({ date, remainingIce, remainingHot });
  } catch (error) {
    console.error("Error reading cup-inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
