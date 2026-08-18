import { requireUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id: styleId } = await params;
  const body = await request.json();

  if (!String(body.accessory_name ?? "").trim()) {
    return NextResponse.json({ error: "辅料名称必填" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("accessory_info")
    .insert({
      style_id: styleId,
      order_id: body.order_id || null,
      material_code: body.material_code || null,
      accessory_name: body.accessory_name,
      category: body.category || null,
      spec: body.spec || null,
      colorway: body.colorway || null,
      unit: body.unit || null,
      usage_per_piece: body.usage_per_piece || null,
      quantity: body.quantity ?? null,
      received_qty: body.received_qty ?? null,
      unit_price: body.unit_price ?? null,
      supplier: body.supplier || null,
      source: body.source || null,
      order_date: body.order_date || null,
      expected_arrival: body.expected_arrival || null,
      actual_arrival: body.actual_arrival || null,
      tracking_status: body.tracking_status || "未下单",
      notes: body.notes || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
