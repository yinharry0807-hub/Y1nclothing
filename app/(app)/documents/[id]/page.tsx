import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import {
  DOC_STATUS_META,
  fileTypeLabel,
  formatDateTime,
  formatNumber,
} from "@/lib/utils";
import { Download, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecognizeButton } from "@/components/RecognizeButton";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: doc }, { data: summary }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase
      .from("ai_summaries")
      .select("*")
      .eq("document_id", id)
      .eq("summary_type", "document")
      .maybeSingle(),
  ]);

  if (!doc) notFound();

  // 图片类资料：生成签名 URL 供预览
  let imageUrl: string | null = null;
  if (
    doc.storage_path &&
    ["png", "jpg", "jpeg", "webp", "gif", "bmp", "jfif"].includes(doc.file_type)
  ) {
    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 3600);
    imageUrl = signed?.signedUrl ?? null;
  }

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/documents"
          className="text-xs text-indigo-600 hover:underline"
        >
          ← 返回资料库
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">{doc.file_name}</h1>
          <StatusBadge
            label={DOC_STATUS_META[doc.status]?.label ?? doc.status}
            className={DOC_STATUS_META[doc.status]?.className}
          />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {fileTypeLabel(doc.file_type)}
          {doc.file_size != null && ` · ${formatNumber(doc.file_size)}`}
          {" · "}
          {formatDateTime(doc.upload_time)}
        </p>
      </div>

      {doc.source_path && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
          原始路径：{doc.source_path}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {doc.status === "vision_pending" && (
          <RecognizeButton documentId={doc.id} size="md" />
        )}
        <a
          href={`/api/documents/${doc.id}/download`}
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <Download className="h-4 w-4" />
          下载原文件
        </a>
      </div>

      {imageUrl && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={doc.file_name}
            className="max-h-[480px] rounded-lg object-contain"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">解析原文</p>
              {doc.original_text && (
                <p className="text-xs text-slate-400">
                  {doc.original_text.length.toLocaleString()} 字
                </p>
              )}
            </div>
            {doc.original_text ? (
              <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap px-4 py-4 font-sans text-xs leading-relaxed text-slate-700">
                {doc.original_text}
              </pre>
            ) : (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <FileText className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                  {doc.status === "vision_pending"
                    ? `这是图片资料，尚未识别出文字：${
                        doc.parse_error ?? "上传时识别失败"
                      }。可点击上方「AI 识别图片文字」重试，或在设置中切换模型。`
                    : "该文件没有解析出文本（可能是扫描版 PDF）。"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <p className="text-sm font-semibold text-slate-900">AI 总结</p>
            </div>
            <div className="px-4 py-4 text-sm leading-relaxed text-slate-600">
              {summary?.summary_text ? (
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                  {summary.summary_text}
                  <span className="mt-2 block text-[10px] text-slate-400">
                    模型：{summary.model} · {formatDateTime(summary.created_at)}
                  </span>
                </pre>
              ) : (
                <p className="text-xs text-slate-400">
                  阶段2接入 DeepSeek 后，将自动对这份资料生成详细总结（款式、面料、辅料、
                  价格、交期、供应商），提取结果写入结构化表，原文始终保留。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
