import { requireUser } from "@/lib/supabase/server";
import {
  IMAGE_MIME_BY_EXT,
  getCurrentVisionModel,
  recognizeImage,
} from "@/lib/vision";
import { NextResponse } from "next/server";

export const maxDuration = 120;

/**
 * 对图片资料调用当前视觉模型识别文字，结果写入 documents.original_text。
 * 供上传后自动调用 / 资料库手动重试使用。
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (!doc) return NextResponse.json({ error: "资料不存在" }, { status: 404 });

  const mime = IMAGE_MIME_BY_EXT[doc.file_type];
  if (!mime) {
    return NextResponse.json(
      { error: "该文件不是图片，无法进行视觉识别" },
      { status: 400 },
    );
  }
  if (!doc.storage_path) {
    return NextResponse.json(
      { error: "原文件不存在，无法识别" },
      { status: 400 },
    );
  }

  try {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 300);
    if (!signed?.signedUrl) {
      throw new Error("无法读取原文件");
    }

    const fileRes = await fetch(signed.signedUrl);
    if (!fileRes.ok) throw new Error("下载原文件失败");
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    const model = await getCurrentVisionModel(supabase);
    const text = await recognizeImage(buffer, mime, model);

    if (!text.trim()) {
      throw new Error("模型未识别到文字，可尝试在设置中切换其他模型");
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update({ original_text: text, status: "parsed", parse_error: null })
      .eq("id", id);
    if (updateError) throw updateError;

    return NextResponse.json({
      ok: true,
      charCount: text.length,
      model,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "识别失败";
    await supabase
      .from("documents")
      .update({ status: "vision_pending", parse_error: message })
      .eq("id", id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
