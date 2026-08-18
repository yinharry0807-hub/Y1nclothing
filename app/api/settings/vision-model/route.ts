import { requireAppAccess } from "@/lib/supabase/server";
import { VISION_MODEL_OPTIONS } from "@/lib/vision";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const model = String(body.model ?? "").trim().toLowerCase();

  if (!VISION_MODEL_OPTIONS.some((o) => o.value === model)) {
    return NextResponse.json({ error: "不支持的视觉模型" }, { status: 400 });
  }

  const { error } = await supabase
    .from("app_settings")
    .upsert(
      { key: "vision_model", value: { model } },
      { onConflict: "key" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, model });
}
