import { requireAppAccess } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id: styleId } = await params;
  const body = await request.json();

  if (!String(body.fabric_name ?? "").trim()) {
    return NextResponse.json({ error: "面料名称必填" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("fabric_info")
    .insert({
      style_id: styleId,
      order_id: body.order_id || null,
      material_code: body.material_code || null,
      fabric_name: body.fabric_name,
      category: body.category || null,
      composition: body.composition || null,
      weight: body.weight || null,
      width: body.width || null,
      usage_per_piece: body.usage_per_piece || null,
      unit: body.unit || null,
      unit_price: body.unit_price ?? null,
      supplier: body.supplier || null,
      colorway: body.colorway || null,
      shrinkage_warp: body.shrinkage_warp || null,
      shrinkage_weft: body.shrinkage_weft || null,
      loss_rate: body.loss_rate || null,
      position: body.position || null,
      source: body.source || null,
      notes: body.notes || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
