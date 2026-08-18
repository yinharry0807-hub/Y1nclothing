"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StyleRow } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { Modal } from "./Modal";
import { StyleForm } from "./StyleForm";

export function StyleInfoCard({
  style,
  documents,
}: {
  style: StyleRow;
  documents: Array<{ id: string; file_name: string }>;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `确认删除款式 ${style.style_no}？其面料、辅料、大货单等将一并删除，但审计日志保留全部历史，可恢复。`,
      )
    )
      return;
    setDeleting(true);
    const res = await fetch(`/api/styles/${style.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/styles");
      router.refresh();
    } else {
      alert("删除失败，请稍后重试");
    }
    setDeleting(false);
  }

  const fields: Array<{ label: string; value: string | null }> = [
    { label: "款式编号", value: style.style_no },
    { label: "款式名称", value: style.style_name },
    { label: "客户款号", value: style.customer_style_no },
    { label: "品牌", value: style.brand },
    { label: "客户", value: style.customer },
    { label: "品类", value: style.category },
    { label: "创建时间", value: formatDateTime(style.created_at) },
    { label: "更新时间", value: formatDateTime(style.updated_at) },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">{style.style_no}</h2>
            <StatusBadge label={style.status} />
          </div>
          {style.style_name && (
            <p className="mt-1 text-sm text-slate-500">{style.style_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-3 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-[11px] font-medium text-slate-400">{f.label}</p>
            <p className="mt-0.5 text-sm text-slate-800">{f.value || "—"}</p>
          </div>
        ))}
        {style.notes && (
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <p className="text-[11px] font-medium text-slate-400">备注</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
              {style.notes}
            </p>
          </div>
        )}
      </div>

      <Modal
        title={`编辑款式 ${style.style_no}`}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        wide
      >
        <StyleForm
          documents={documents}
          initial={style}
          onDone={() => setEditOpen(false)}
        />
      </Modal>
    </div>
  );
}
