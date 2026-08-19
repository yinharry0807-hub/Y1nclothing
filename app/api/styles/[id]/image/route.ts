import { requireAppAccess } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// 上传款式图片（公开桶，图片直接展示在总表/款式卡）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;

  const { data: style } = await supabase.from("styles").select("id").eq("id", id).maybeSingle();
  if (!style) return NextResponse.json({ error: "款式不存在" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "请选择图片文件" }, { status: 400 });
  }
  const type = file.type;
  if (!ALLOWED.includes(type)) {
    return NextResponse.json({ error: "仅支持 PNG/JPG/WebP/GIF 图片" }, { status: 400 });
  }

  const { error: bucketErr } = await supabase.storage.getBucket("style-images");
  if (bucketErr) {
    await supabase.storage.createBucket("style-images", { public: true });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${id}/${Date.now()}.${EXT[type]}`;
  const { error: uploadErr } = await supabase.storage
    .from("style-images")
    .upload(path, bytes, { contentType: type, upsert: false });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/style-images/${path}`;
  const { error: updateErr } = await supabase
    .from("styles")
    .update({ image_url: url })
    .eq("id", id);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, url });
}
