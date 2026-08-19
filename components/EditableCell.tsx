"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string | number | null;
  type?: "text" | "number" | "date" | "select";
  options?: string[];
  placeholder?: string;
  className?: string;
  display?: (v: string | number | null) => string;
  onSave: (value: string | number | null) => Promise<boolean> | boolean;
  title?: string;
};

/** 在线编辑单元格：点击进入编辑，回车/失焦保存，Esc 取消 */
export function EditableCell({
  value,
  type = "text",
  options,
  placeholder = "—",
  className,
  display,
  onSave,
  title,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const shown = value == null || value === "" ? placeholder : display ? display(value) : String(value);

  function start() {
    setDraft(value == null ? "" : String(value));
    setFailed(false);
    setEditing(true);
  }

  async function commit() {
    if (!editing) return;
    setEditing(false);
    const next = type === "number" ? (draft.trim() === "" ? null : Number(draft)) : draft;
    if (next === value) return;
    setSaving(true);
    setFailed(false);
    try {
      const ok = await onSave(next);
      if (ok === false) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    const common =
      "w-full min-w-[72px] rounded border border-indigo-400 bg-white px-1.5 py-0.5 text-left text-xs text-slate-800 outline-none";
    return (
      <span className={cn("inline-block", className)}>
        {type === "select" ? (
          <select
            autoFocus
            className={common}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
          >
            <option value="">{placeholder}</option>
            {(options ?? []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            autoFocus
            type={type === "date" ? "date" : type === "number" ? "number" : "text"}
            className={common}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={title ?? "点击编辑"}
      onClick={start}
      className={cn(
        "inline-block max-w-[220px] truncate rounded px-1.5 py-0.5 text-left text-xs transition hover:bg-indigo-50 hover:ring-1 hover:ring-indigo-200",
        value == null || value === "" ? "text-slate-300" : "text-slate-700",
        failed && "bg-red-50 text-red-600",
        className,
      )}
    >
      {saving ? "保存中…" : shown}
    </button>
  );
}
