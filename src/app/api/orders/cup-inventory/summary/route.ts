import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    // URLのクエリから日付を取得
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date query parameter is required" }, { status: 400 });
    }

    // ファイルのパスを指定
    const dataDir = path.resolve("data");
    const cupInventoryPath = path.join(dataDir, "cupInventory.json");
    const cupInventoryDayPath = path.join(dataDir, "cup-inventory.json");

    // ファイルを文字列として読み込み
    const cupInventoryRaw = await fs.readFile(cupInventoryPath, "utf8");
    const cupInventoryDayRaw = await fs.readFile(cupInventoryDayPath, "utf8");

    // JSONに変換
    const cupInventoryData = JSON.parse(cupInventoryRaw);
    const cupInventoryDayData = JSON.parse(cupInventoryDayRaw);

    // 日付をISO形式で切り詰めておく（YYYY-MM-DD）
    const targetDate = date.slice(0, 10);

    // 前日の日付を計算（Dateオブジェクトを使う）
    const prevDateObj = new Date(targetDate);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDate = prevDateObj.toISOString().slice(0, 10);

    // 前日の残カップを探す
    const prevDay = cupInventoryDayData.find((r: any) => r.date.slice(0, 10) === prevDate);
    const prevRemainingIce = prevDay?.remainingIce || 0;
    const prevRemainingHot = prevDay?.remainingHot || 0;

    // 当日の予定・使用を探す
    const today = cupInventoryDayData.find((r: any) => r.date.slice(0, 10) === targetDate);
    const plannedIce = today?.plannedIce || 0;
    const plannedHot = today?.plannedHot || 0;
    const iceUsed = today?.iceUsed || 0;
    const hotUsed = today?.hotUsed || 0;

    // 入出庫データを集計（アイス・ホット別に）
    const inStockIce = cupInventoryData
      .filter((r: any) => r.date === targetDate && r.cupType === "アイス")
      .reduce((sum: number, r: any) => sum + r.inStock, 0);
    const outStockIce = cupInventoryData
      .filter((r: any) => r.date === targetDate && r.cupType === "アイス")
      .reduce((sum: number, r: any) => sum + r.outStock, 0);
    const inStockHot = cupInventoryData
      .filter((r: any) => r.date === targetDate && r.cupType === "ホット")
      .reduce((sum: number, r: any) => sum + r.inStock, 0);
    const outStockHot = cupInventoryData
      .filter((r: any) => r.date === targetDate && r.cupType === "ホット")
      .reduce((sum: number, r: any) => sum + r.outStock, 0);

    // 残カップ計算
    const remainingIce = prevRemainingIce + plannedIce + inStockIce - outStockIce - iceUsed;
    const remainingHot = prevRemainingHot + plannedHot + inStockHot - outStockHot - hotUsed;

    // 結果を返す
    return NextResponse.json({
      date: targetDate,
      plannedIce,
      plannedHot,
      iceUsed,
      hotUsed,
      inStockIce,
      outStockIce,
      inStockHot,
      outStockHot,
      remainingIce,
      remainingHot,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
