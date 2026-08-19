"use client";

import { ImagePlus, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";

export function ImageCell({
  src,
  styleId,
  size = "h-11 w-11",
  onUpdated,
}: {
  src?: string | null;
  styleId: string;
  size?: string;
  onUpdated?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/styles/${styleId}/image`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? "上传失败");
      } else {
        onUpdated?.();
      }
    } catch {
      alert("上传失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {src ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`group relative overflow-hidden rounded border border-slate-300 ${size}`}
          title="点击更换图片"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="款式图" className="h-full w-full object-cover" />
          <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-[10px] text-white group-hover:flex">
            {busy ? <RefreshCw className="h-3 w-3 animate-spin" /> : "换图"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex items-center justify-center rounded border border-dashed border-slate-300 text-slate-300 hover:border-indigo-400 hover:text-indigo-500 ${size}`}
          title="上传款式图片"
        >
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </button>
      )}
    </>
  );
}
