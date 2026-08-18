import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import {
  DOC_STATUS_META,
  fileTypeLabel,
  formatDateTime,
  formatNumber,
} from "@/lib/utils";
import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { RecognizeButton } from "@/components/RecognizeButton";

export const metadata = { title: "资料库 - 服装跟单智能工作台" };

export default async function DocumentsPage() {
  const supabase = await createClient();
  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .order("upload_time", { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">资料库</h1>
          <p className="mt-1 text-sm text-slate-500">
            所有上传的原始文件与解析原文，AI 总结永不覆盖原文。
          </p>
        </div>
        <Link
          href="/upload"
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          导入资料
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-red-600">加载失败：{error.message}</p>
      ) : !documents || documents.length === 0 ? (
        <EmptyState
          title="资料库还是空的"
          description="把桌面的 Excel / Word / PDF 拖进「资料导入」，自动解析存档。"
          action={
            <Link
              href="/upload"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              去导入
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">文件名</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">类型</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">状态</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">大小</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">上传时间</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/documents/${d.id}`}
                      className="flex items-center gap-2 font-medium text-slate-900 hover:text-indigo-600"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="max-w-[360px] truncate">{d.file_name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {fileTypeLabel(d.file_type)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={DOC_STATUS_META[d.status]?.label ?? d.status}
                      className={DOC_STATUS_META[d.status]?.className}
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {formatNumber(d.file_size ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(d.upload_time)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.status === "vision_pending" && (
                      <span className="mr-2 inline-block">
                        <RecognizeButton documentId={d.id} label="识别" size="sm" />
                      </span>
                    )}
                    <a
                      href={`/api/documents/${d.id}/download`}
                      className="inline-flex items-center gap-1 rounded p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                      title="下载原文件"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
