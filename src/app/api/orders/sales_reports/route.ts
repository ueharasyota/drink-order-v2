import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient"; 

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, shift, diff, note } = body;

    if (!date || !shift || diff === undefined || diff === null) {
      return NextResponse.json(
        { success: false, error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

 const supabase = await createServerClient();


    const { error } = await supabase
      .from("sales_reports")
      .upsert(
        [
          {
            date,
            shift,
            diff,
            note: note ?? "",
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "date,shift" }
      );

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "報告を保存しました" });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 }
    );
  }
}
