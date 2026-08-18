"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { STYLE_STATUS_OPTIONS } from "@/lib/utils";
import type { StyleRow } from "@/lib/types";
import { Field, FormActions, FormGrid, inputClass } from "./forms";

export function StyleForm({
  documents,
  initial,
  onDone,
}: {
  documents?: Array<{ id: string; file_name: string }>;
  initial?: StyleRow | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    style_no: initial?.style_no ?? "",
    style_name: initial?.style_name ?? "",
    customer_style_no: initial?.customer_style_no ?? "",
    brand: initial?.brand ?? "Halara",
    customer: initial?.customer ?? "全速",
    category: initial?.category ?? "",
    status: initial?.status ?? "打样中",
    notes: initial?.notes ?? "",
    document_id: initial?.document_id ?? "",
    image_url: initial?.image_url ?? "",
  });

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.style_no.trim()) {
      setError("款式编号必填");
      return;
    }
    setSubmitting(true);
    try {
      const url = initial
        ? `/api/styles/${initial.id}`
        : "/api/styles";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, document_id: form.document_id || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存失败");
        return;
      }
      router.refresh();
      if (initial && onDone) onDone();
      if (!initial) router.push(`/styles/${data.id}`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormGrid>
        <Field label="款式编号" required>
          <input
            className={inputClass}
            value={form.style_no}
            onChange={(e) => set("style_no", e.target.value)}
            placeholder="如 24N1109PT4233"
          />
        </Field>
        <Field label="款式名称">
          <input
            className={inputClass}
            value={form.style_name}
            onChange={(e) => set("style_name", e.target.value)}
            placeholder="如 高腰直筒针织牛仔裤"
          />
        </Field>
        <Field label="客户款号">
          <input
            className={inputClass}
            value={form.customer_style_no}
            onChange={(e) => set("customer_style_no", e.target.value)}
          />
        </Field>
        <Field label="品牌">
          <input
            className={inputClass}
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
          />
        </Field>
        <Field label="客户">
          <input
            className={inputClass}
            value={form.customer}
            onChange={(e) => set("customer", e.target.value)}
          />
        </Field>
        <Field label="品类">
          <input
            className={inputClass}
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="牛仔裤 / 针织裤 / 短裤…"
          />
        </Field>
        <Field label="状态">
          <select
            className={inputClass}
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {STYLE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        {documents && (
          <Field label="关联原始资料">
            <select
              className={inputClass}
              value={form.document_id}
              onChange={(e) => set("document_id", e.target.value)}
            >
              <option value="">不关联</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.file_name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="款式图片 URL">
          <input
            className={inputClass}
            value={form.image_url}
            onChange={(e) => set("image_url", e.target.value)}
            placeholder="（阶段3支持上传图片）"
          />
        </Field>
      </FormGrid>
      <div className="mt-3">
        <Field label="备注">
          <textarea
            className={inputClass}
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <FormActions
        onCancel={() => onDone?.()}
        submitting={submitting}
        submitLabel={initial ? "保存修改" : "创建款式"}
      />
    </form>
  );
}
