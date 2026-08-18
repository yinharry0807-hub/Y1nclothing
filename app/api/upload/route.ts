import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, getExtension, parseFile } from "@/lib/parsers";
import { requireAppAccess } from "@/lib/supabase/server";
import {
  IMAGE_MIME_BY_EXT,
  getCurrentVisionModel,
  recognizeImage,
} from "@/lib/vision";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const form = await request.formData();
  const files = form
    .getAll("files")
    .filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "没有收到文件" }, { status: 400 });
  }

  const results: Array<{
    id?: string;
    name: string;
    type: string;
    status: "parsed" | "vision_pending" | "failed";
    charCount?: number;
    error?: string;
  }> = [];

  for (const file of files) {
    const ext = getExtension(file.name);
    try {
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(`不支持的文件类型：.${ext || "(无扩展名)"}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("文件超过 25MB 上限");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const storagePath = `uploads/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      let text: string | null = null;
      let status: "parsed" | "vision_pending" = "parsed";
      let parseError: string | null = null;
      try {
        const parsed = await parseFile(file.name, buffer);
        text = parsed.text;
        status = parsed.status;
      } catch (e) {
        status = "parsed";
        parseError = e instanceof Error ? e.message : "解析失败";
      }

      const { data: inserted, error: insertError } = await supabase
        .from("documents")
        .insert({
          file_name: file.name,
          file_type: ext,
          file_size: file.size,
          original_text: text,
          storage_path: storagePath,
          status: parseError ? "failed" : status,
          parse_error: parseError,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // 图片：上传后自动调用当前视觉模型识别文字（失败则保持待识别，可手动重试）
      let recognizedText: string | null = null;
      if (status === "vision_pending") {
        const mime = IMAGE_MIME_BY_EXT[ext];
        try {
          const model = await getCurrentVisionModel(supabase);
          recognizedText = await recognizeImage(buffer, mime, model);
          if (recognizedText?.trim()) {
            await supabase
              .from("documents")
              .update({
                original_text: recognizedText,
                status: "parsed",
                parse_error: null,
              })
              .eq("id", inserted.id);
          } else {
            await supabase
              .from("documents")
              .update({ parse_error: "模型未识别到文字，可在设置切换模型后重试" })
              .eq("id", inserted.id);
          }
        } catch (e) {
          await supabase
            .from("documents")
            .update({
              parse_error: e instanceof Error ? e.message : "视觉识别失败",
            })
            .eq("id", inserted.id);
        }
      }

      results.push({
        id: inserted.id,
        name: file.name,
        type: ext,
        status: parseError ? "failed" : recognizedText ? "parsed" : status,
        charCount: (recognizedText ?? text)?.length,
      });
    } catch (e) {
      results.push({
        name: file.name,
        type: ext,
        status: "failed",
        error: e instanceof Error ? e.message : "上传失败",
      });
    }
  }

  return NextResponse.json({ results });
}
