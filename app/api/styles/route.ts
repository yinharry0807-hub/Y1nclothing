import { requireUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();
  const style_no = String(body.style_no ?? "").trim();
  if (!style_no) {
    return NextResponse.json({ error: "款式编号必填" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("styles")
    .insert({
      style_no,
      style_name: body.style_name || null,
      customer_style_no: body.customer_style_no || null,
      brand: body.brand || "Halara",
      customer: body.customer || "全速",
      category: body.category || null,
      status: body.status || "打样中",
      notes: body.notes || null,
      image_url: body.image_url || null,
      document_id: body.document_id || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `款式编号 ${style_no} 已存在，请检查或换一个编号` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
