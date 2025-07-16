import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  const supabase = await createServerClient();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const shift = searchParams.get("shift");
  const drink_type = searchParams.get("drink_type");

  if (!date || !shift || !drink_type) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("start_cups")
    .select("*")
    .eq("date", date)
    .eq("shift", shift)
    .eq("drink_type", drink_type)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data?.[0] ?? null);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();

  const body = await request.json();
  const { date, shift, drink_type, count } = body;

  if (!date || !shift || !drink_type || count === undefined) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const { data: existing, error: selectError } = await supabase
    .from("start_cups")
    .select("id")
    .eq("date", date)
    .eq("shift", shift)
    .eq("drink_type", drink_type)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (existing && existing.length > 0) {
    const { error: updateError } = await supabase
      .from("start_cups")
      .update({ count, updated_at: new Date().toISOString() })
      .eq("id", existing[0].id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Updated" });
  } else {
    const { error: insertError } = await supabase
      .from("start_cups")
      .insert([{ date, shift, drink_type, count }]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Inserted" });
  }
}
