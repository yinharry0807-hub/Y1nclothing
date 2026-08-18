"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FabricRow, OrderRow } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/utils";
import { Modal } from "./Modal";
import { Field, FormActions, FormGrid, inputClass } from "./forms";

const EMPTY: Record<string, string> = {
  material_code: "",
  fabric_name: "",
  category: "",
  composition: "",
  weight: "",
  width: "",
  usage_per_piece: "",
  unit: "",
  unit_price: "",
  supplier: "",
  colorway: "",
  shrinkage_warp: "",
  shrinkage_weft: "",
  loss_rate: "",
  position: "",
  source: "",
  notes: "",
  order_id: "",
};

export function FabricSection({
  styleId,
  fabrics,
  orders,
}: {
  styleId: string;
  fabrics: FabricRow[];
  orders: OrderRow[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FabricRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(f: FabricRow) {
    setEditing(f);
    setForm({
      material_code: f.material_code ?? "",
      fabric_name: f.fabric_name,
      category: f.category ?? "",
      composition: f.composition ?? "",
      weight: f.weight ?? "",
      width: f.width ?? "",
      usage_per_piece: f.usage_per_piece ?? "",
      unit: f.unit ?? "",
      unit_price: f.unit_price?.toString() ?? "",
      supplier: f.supplier ?? "",
      colorway: f.colorway ?? "",
      shrinkage_warp: f.shrinkage_warp ?? "",
      shrinkage_weft: f.shrinkage_weft ?? "",
      loss_rate: f.loss_rate ?? "",
      position: f.position ?? "",
      source: f.source ?? "",
      notes: f.notes ?? "",
      order_id: f.order_id ?? "",
    });
    setModalOpen(true);
  }

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fabric_name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        unit_price: form.unit_price ? Number(form.unit_price) : null,
        order_id: form.order_id || null,
      };
      const res = await fetch(
        editing
          ? `/api/fabrics/${editing.id}`
          : `/api/styles/${styleId}/fabrics`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) return;
      setModalOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(f: FabricRow) {
    if (!confirm(`确认删除面料「${f.fabric_name}」？删除后可在审计日志中恢复。`))
      return;
    await fetch(`/api/fabrics/${f.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          面料清单（{fabrics.length}）
        </h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" />
          添加面料
        </button>
      </div>

      {fabrics.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
          还没有面料记录，点击「添加面料」录入
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">面料名称</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">物料编码</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">分类</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">成分</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">幅宽</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">用量/件</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">单价</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">供应商</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">来源</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {fabrics.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">{f.fabric_name}</td>
                  <td className="px-3 py-2 text-slate-500">{f.material_code || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{f.category || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{f.composition || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{f.width || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{f.usage_per_piece || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{formatPrice(f.unit_price)}</td>
                  <td className="px-3 py-2 text-slate-600">{f.supplier || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{f.source || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(f)}
                        className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={editing ? "编辑面料" : "添加面料"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <Field label="面料名称" required>
              <input className={inputClass} value={form.fabric_name} onChange={(e) => set("fabric_name", e.target.value)} placeholder="如 四面弹 / M14219" />
            </Field>
            <Field label="物料编码">
              <input className={inputClass} value={form.material_code} onChange={(e) => set("material_code", e.target.value)} />
            </Field>
            <Field label="分类">
              <input className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="主身布/袋布/朴/网布" />
            </Field>
            <Field label="成分">
              <input className={inputClass} value={form.composition} onChange={(e) => set("composition", e.target.value)} placeholder="如 80%涤 20%棉" />
            </Field>
            <Field label="克重">
              <input className={inputClass} value={form.weight} onChange={(e) => set("weight", e.target.value)} />
            </Field>
            <Field label="幅宽">
              <input className={inputClass} value={form.width} onChange={(e) => set("width", e.target.value)} placeholder="如 155cm / 55寸" />
            </Field>
            <Field label="用量/件">
              <input className={inputClass} value={form.usage_per_piece} onChange={(e) => set("usage_per_piece", e.target.value)} placeholder="如 0.13 米/件" />
            </Field>
            <Field label="单位">
              <input className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value)} />
            </Field>
            <Field label="单价（元）">
              <input className={inputClass} type="number" step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} />
            </Field>
            <Field label="供应商">
              <input className={inputClass} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} />
            </Field>
            <Field label="颜色">
              <input className={inputClass} value={form.colorway} onChange={(e) => set("colorway", e.target.value)} />
            </Field>
            <Field label="经缩率%">
              <input className={inputClass} value={form.shrinkage_warp} onChange={(e) => set("shrinkage_warp", e.target.value)} />
            </Field>
            <Field label="纬缩率%">
              <input className={inputClass} value={form.shrinkage_weft} onChange={(e) => set("shrinkage_weft", e.target.value)} />
            </Field>
            <Field label="损耗%">
              <input className={inputClass} value={form.loss_rate} onChange={(e) => set("loss_rate", e.target.value)} />
            </Field>
            <Field label="使用部位">
              <input className={inputClass} value={form.position} onChange={(e) => set("position", e.target.value)} />
            </Field>
            <Field label="物料来源">
              <input className={inputClass} value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="采购/调拨/存仓" />
            </Field>
            {orders.length > 0 && (
              <Field label="关联订单（可选）">
                <select className={inputClass} value={form.order_id} onChange={(e) => set("order_id", e.target.value)}>
                  <option value="">仅关联款式</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.po_no || o.order_no || ""} {o.colorway || ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </FormGrid>
          <div className="mt-3">
            <Field label="备注">
              <textarea className={inputClass} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <FormActions onCancel={() => setModalOpen(false)} submitting={submitting} />
        </form>
      </Modal>
    </div>
  );
}
