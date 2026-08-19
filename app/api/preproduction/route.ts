import { requireAppAccess } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 产前版列表（带款号），供追踪总表使用
export async function GET() {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { data, error } = await supabase
    .from("preproduction")
    .select("*, styles(style_no,style_name,image_url)")
    .order("sample_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// 新增产前版（在线添加新下单的产前版）
export async function POST(request: Request) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const styleNo = String(body.style_no ?? "").trim().toUpperCase();
  if (!styleNo) {
    return NextResponse.json({ error: "请填写款号" }, { status: 400 });
  }
  let styleId: string | null = null;
  const { data: existing } = await supabase
    .from("styles")
    .select("id")
    .eq("style_no", styleNo)
    .maybeSingle();
  if (existing?.id) {
    styleId = existing.id;
  } else {
    const { data: ins, error: insErr } = await supabase
      .from("styles")
      .insert({ style_no: styleNo, category: body.category ?? null })
      .select("id")
      .single();
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    styleId = ins.id;
  }
  const { data, error } = await supabase
    .from("preproduction")
    .insert({
      style_id: styleId,
      sample_no: body.sample_no ?? null,
      version: body.version ?? "第一次版",
      colorway: body.colorway ?? null,
      quantity: body.quantity != null && body.quantity !== "" ? Number(body.quantity) : null,
      sample_date: body.sample_date ?? null,
      progress: body.progress ?? "待排期",
      fabric_summary: body.fabric_summary ?? null,
      notes: body.notes ?? null,
    })
    .select("*, styles(style_no)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data });
}
