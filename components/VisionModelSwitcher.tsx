"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VISION_MODEL_OPTIONS } from "@/lib/vision";
import { cn } from "@/lib/utils";

export function VisionModelSwitcher({
  current,
  configured,
}: {
  current: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(current);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/vision-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "保存失败" });
        return;
      }
      setMessage({
        type: "ok",
        text: `已切换为 ${VISION_MODEL_OPTIONS.find((o) => o.value === selected)?.label ?? selected}，云端已同步，图片识别立即生效`,
      });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-xs text-slate-500">
        {configured
          ? "API Key 已配置。图片上传后自动用当前模型识别文字；识别失败可在资料库手动重试。"
          : "视觉模型 API Key 未配置，请先在 .env 中填写 VISION_MODEL_API_KEY。"}
      </p>
      <div className="space-y-2">
        {VISION_MODEL_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition",
              selected === opt.value
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-slate-300",
            )}
          >
            <input
              type="radio"
              name="vision-model"
              value={opt.value}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
              className="h-4 w-4 accent-indigo-600"
            />
            <div>
              <p className="text-sm font-medium text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-400">{opt.value}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || selected === current}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
        >
          {saving ? "保存中…" : "保存模型选择"}
        </button>
        {message && (
          <p
            className={cn(
              "text-xs",
              message.type === "ok" ? "text-emerald-600" : "text-red-600",
            )}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
