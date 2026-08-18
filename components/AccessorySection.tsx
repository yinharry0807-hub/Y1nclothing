"use client";

import { Plus, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AccessoryRow, OrderRow } from "@/lib/types";
import {
  TRACKING_STATUS_META,
  TRACKING_STATUS_OPTIONS,
  formatDate,
  formatPrice,
} from "@/lib/utils";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";
import { Field, FormActions, FormGrid, inputClass } from "./forms";

const EMPTY: Record<string, string> = {
  material_code: "",
  accessory_name: "",
  category: "",
  spec: "",
  colorway: "",
  unit: "",
  usage_per_piece: "",
  quantity: "",
  received_qty: "",
  unit_price: "",
  supplier: "",
  source: "",
  order_date: "",
  expected_arrival: "",
  actual_arrival: "",
  tracking_status: "未下单",
  notes: "",
  order_id: "",
};

export function AccessorySection({
  styleId,
  accessories,
  orders,
}: {
  styleId: string;
  accessories: AccessoryRow[];
  orders: OrderRow[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AccessoryRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(a: AccessoryRow) {
    setEditing(a);
    setForm({
      material_code: a.material_code ?? "",
      accessory_name: a.accessory_name,
      category: a.category ?? "",
      spec: a.spec ?? "",
      colorway: a.colorway ?? "",
      unit: a.unit ?? "",
      usage_per_piece: a.usage_per_piece ?? "",
      quantity: a.quantity?.toString() ?? "",
      received_qty: a.received_qty?.toString() ?? "",
      unit_price: a.unit_price?.toString() ?? "",
      supplier: a.supplier ?? "",
      source: a.source ?? "",
      order_date: a.order_date ?? "",
      expected_arrival: a.expected_arrival ?? "",
      actual_arrival: a.actual_arrival ?? "",
      tracking_status: a.tracking_status,
      notes: a.notes ?? "",
      order_id: a.order_id ?? "",
    });
    setModalOpen(true);
  }

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accessory_name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity: form.quantity ? Number(form.quantity) : null,
        received_qty: form.received_qty ? Number(form.received_qty) : null,
        unit_price: form.unit_price ? Number(form.unit_price) : null,
        order_id: form.order_id || null,
        order_date: form.order_date || null,
        expected_arrival: form.expected_arrival || null,
        actual_arrival: form.actual_arrival || null,
      };
      const res = await fetch(
        editing
          ? `/api/accessories/${editing.id}`
          : `/api/styles/${styleId}/accessories`,
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

  async function handleDelete(a: AccessoryRow) {
    if (!confirm(`确认删除辅料「${a.accessory_name}」？删除后可在审计日志中恢复。`))
      return;
    await fetch(`/api/accessories/${a.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleStatusChange(a: AccessoryRow, status: string) {
    await fetch(`/api/accessories/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_status: status }),
    });
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          辅料清单（{accessories.length}）
        </h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" />
          添加辅料
        </button>
      </div>

      {accessories.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
          还没有辅料记录，点击「添加辅料」录入并开始追踪
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">辅料名称</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">规格</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">追踪状态</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">订购/收货</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">单价</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">供应商</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">下单日期</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">预计到货</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">实际到货</th>
                <th className="px-3 py-2 text-right font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {accessories.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-900">{a.accessory_name}</p>
                    {a.category && (
                      <p className="text-[10px] text-slate-400">{a.category}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{a.spec || "—"}</td>
                  <td className="px-3 py-2">
                    <select
                      value={a.tracking_status}
                      onChange={(e) => handleStatusChange(a, e.target.value)}
                      className="rounded-md border border-transparent bg-transparent text-xs outline-none hover:border-slate-300"
                      title="点击切换追踪状态"
                    >
                      {TRACKING_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {a.quantity ?? "—"}
                    {a.received_qty != null && ` / ${a.received_qty}`}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{formatPrice(a.unit_price)}</td>
                  <td className="px-3 py-2 text-slate-600">{a.supplier || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(a.order_date)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(a.expected_arrival)}</td>
                  <td className="px-3 py-2 text-slate-600">{formatDate(a.actual_arrival)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                        title="编辑"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
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
        title={editing ? "编辑辅料" : "添加辅料"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <Field label="辅料名称" required>
              <input className={inputClass} value={form.accessory_name} onChange={(e) => set("accessory_name", e.target.value)} placeholder="如 3#Y牙白铜闭尾弹簧头" />
            </Field>
            <Field label="物料编码">
              <input className={inputClass} value={form.material_code} onChange={(e) => set("material_code", e.target.value)} />
            </Field>
            <Field label="分类">
              <input className={inputClass} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="裁床类/配件类/包装类/做工类" />
            </Field>
            <Field label="规格">
              <input className={inputClass} value={form.spec} onChange={(e) => set("spec", e.target.value)} placeholder="如 12.5cm*220条" />
            </Field>
            <Field label="颜色">
              <input className={inputClass} value={form.colorway} onChange={(e) => set("colorway", e.target.value)} />
            </Field>
            <Field label="单位">
              <input className={inputClass} value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="PCS/个/米" />
            </Field>
            <Field label="每件用量">
              <input className={inputClass} value={form.usage_per_piece} onChange={(e) => set("usage_per_piece", e.target.value)} />
            </Field>
            <Field label="订购数量">
              <input className={inputClass} type="number" step="0.01" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
            </Field>
            <Field label="收货数量">
              <input className={inputClass} type="number" step="0.01" value={form.received_qty} onChange={(e) => set("received_qty", e.target.value)} />
            </Field>
            <Field label="单价（元）">
              <input className={inputClass} type="number" step="0.01" value={form.unit_price} onChange={(e) => set("unit_price", e.target.value)} />
            </Field>
            <Field label="供应商">
              <input className={inputClass} value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="如 伟强/金泰/中广" />
            </Field>
            <Field label="提供方式">
              <input className={inputClass} value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="采购/加工/客供/存仓" />
            </Field>
            <Field label="追踪状态">
              <select className={inputClass} value={form.tracking_status} onChange={(e) => set("tracking_status", e.target.value)}>
                {TRACKING_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="下单日期">
              <input className={inputClass} type="date" value={form.order_date} onChange={(e) => set("order_date", e.target.value)} />
            </Field>
            <Field label="预计到货日期">
              <input className={inputClass} type="date" value={form.expected_arrival} onChange={(e) => set("expected_arrival", e.target.value)} />
            </Field>
            <Field label="实际到货日期">
              <input className={inputClass} type="date" value={form.actual_arrival} onChange={(e) => set("actual_arrival", e.target.value)} />
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
