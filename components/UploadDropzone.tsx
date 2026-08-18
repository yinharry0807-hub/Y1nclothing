"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { fileTypeLabel } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

type UploadResult = {
  id?: string;
  name: string;
  type: string;
  status: "parsed" | "vision_pending" | "failed";
  error?: string;
  charCount?: number;
};

const ACCEPT =
  ".xlsx,.xls,.docx,.doc,.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.jfif";

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setResults(list.map((f) => ({ name: f.name, type: f.type, status: "parsed" })));

    const form = new FormData();
    list.forEach((f) => form.append("files", f));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.results) {
        setResults(data.results);
      } else {
        setResults([
          { name: "上传失败", type: "", status: "failed", error: data.error ?? "未知错误" },
        ]);
      }
    } catch {
      setResults((r) =>
        r.map((item) =>
          item.status === "parsed"
            ? { ...item, status: "failed", error: "网络错误" }
            : item,
        ),
      );
    } finally {
      setUploading(false);
    }
  }

  function removeResult(index: number) {
    setResults((r) => r.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition ${
          dragging
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40"
        }`}
      >
        <UploadCloud
          className={`mb-3 h-12 w-12 ${dragging ? "text-indigo-600" : "text-slate-300"}`}
        />
        <p className="text-sm font-medium text-slate-700">
          拖拽文件到这里，或点击选择（支持批量）
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Excel(.xlsx/.xls) · Word(.docx/.doc) · PDF · 图片，单个最大 25MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploading && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
            正在上传并解析文件…
          </p>
        </div>
      )}

      {results.length > 0 && !uploading && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              上传结果（{results.length} 个文件）
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {results.map((r, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {r.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {fileTypeLabel(r.type)}
                    {r.status === "parsed" &&
                      r.charCount != null &&
                      ` · 解析出 ${r.charCount} 字`}
                    {r.error && ` · ${r.error}`}
                  </p>
                </div>
                {r.status === "parsed" && (
                  <StatusBadge
                    label="已解析"
                    className="bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                  />
                )}
                {r.status === "vision_pending" && (
                  <StatusBadge
                    label="待视觉识别"
                    className="bg-amber-50 text-amber-700 ring-amber-600/20"
                  />
                )}
                {r.status === "failed" && (
                  <StatusBadge
                    label="解析失败"
                    className="bg-red-50 text-red-700 ring-red-600/20"
                  />
                )}
                {r.id && (
                  <div className="flex shrink-0 gap-1">
                    <Link
                      href={`/documents/${r.id}`}
                      className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                      title="查看原文"
                    >
                      <FileText className="h-4 w-4" />
                    </Link>
                    <a
                      href={`/api/documents/${r.id}/download`}
                      className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                      title="下载原文件"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                )}
                <button
                  onClick={() => removeResult(i)}
                  className="shrink-0 rounded p-1 text-slate-300 hover:text-slate-500"
                  aria-label="移除"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
          <strong>说明：</strong>Excel / Word / PDF 上传后立即解析全文并存入资料库；
          图片上传后自动调用智谱 GLM 视觉模型识别文字（可在设置页切换模型，识别失败可手动重试）。
          阶段2接入 DeepSeek 后，将对每份资料自动生成详细总结并归类到款式/面料/辅料。
          </span>
        </p>
      </div>
    </div>
  );
}
