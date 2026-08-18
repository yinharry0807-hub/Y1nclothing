"use client";

import { useRouter } from "next/navigation";
import { FileText, PackageSearch, Search, Shirt, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SearchGroup = {
  key: string;
  label: string;
  icon: "style" | "fabric" | "accessory" | "document";
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    href: string;
  }>;
};

const GROUP_META: Record<
  string,
  { label: string; icon: "style" | "fabric" | "accessory" | "document" }
> = {
  styles: { label: "款式", icon: "style" },
  fabrics: { label: "面料", icon: "fabric" },
  accessories: { label: "辅料", icon: "accessory" },
  orders: { label: "大货单", icon: "accessory" },
  documents: { label: "资料", icon: "document" },
};

function GroupIcon({ kind }: { kind: string }) {
  if (kind === "style") return <Shirt className="h-3.5 w-3.5" />;
  if (kind === "accessory") return <PackageSearch className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

export function TopSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (!query) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        setGroups(data.groups ?? []);
        setOpen(true);
      } catch {
        // 网络异常时静默
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="relative w-full max-w-2xl">
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim() && setOpen(true)}
          placeholder="搜索款式 / 款号 / 面料 / 辅料 / 供应商 / PO…"
          className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {loading ? (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
        ) : q ? (
          <button
            onClick={() => {
              setQ("");
              setGroups([]);
            }}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600"
            aria-label="清空"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">
            Ctrl K
          </kbd>
        )}
      </div>

      {open && q.trim() && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            {total === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                没有找到与「{q}」相关的资料
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="py-1">
                  <p className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <GroupIcon kind={GROUP_META[group.key]?.icon} />
                    {GROUP_META[group.key]?.label ?? group.label}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setOpen(false);
                        router.push(item.href);
                      }}
                      className="block w-full px-4 py-2 text-left hover:bg-indigo-50"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p
                          className={cn(
                            "mt-0.5 text-xs text-slate-500",
                            item.subtitle.length > 100 && "truncate",
                          )}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
