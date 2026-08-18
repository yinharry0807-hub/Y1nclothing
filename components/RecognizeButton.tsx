"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useState } from "react";

export function RecognizeButton({
  documentId,
  label = "AI 识别图片文字",
  size = "sm",
}: {
  documentId: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRecognize() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/recognize`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "识别失败");
        return;
      }
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={handleRecognize}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-md bg-indigo-600 font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 ${
          size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {loading ? "识别中…" : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
