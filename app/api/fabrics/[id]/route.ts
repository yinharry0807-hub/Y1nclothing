import { requireUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const key of [
    "order_id",
    "material_code",
    "fabric_name",
    "category",
    "composition",
    "weight",
    "width",
    "usage_per_piece",
    "unit",
    "unit_price",
    "supplier",
    "colorway",
    "shrinkage_warp",
    "shrinkage_weft",
    "loss_rate",
    "position",
    "source",
    "notes",
  ]) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  if (update.order_id === "") update.order_id = null;

  const { error } = await supabase.from("fabric_info").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;
  const { error } = await supabase.from("fabric_info").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
