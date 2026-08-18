import { requireAppAccess } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const key of [
    "style_no",
    "style_name",
    "customer_style_no",
    "brand",
    "customer",
    "category",
    "status",
    "notes",
    "image_url",
    "document_id",
  ]) {
    if (body[key] !== undefined) update[key] = body[key] || null;
  }
  if (body.style_no && !String(body.style_no).trim()) {
    return NextResponse.json({ error: "款式编号不能为空" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("styles")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "该款式编号已存在" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;

  const { error } = await supabase.from("styles").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
