"use client";

import { EditableCell } from "@/components/EditableCell";
import { ImageCell } from "@/components/ImageCell";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";

type OrderRow = {
  id: string;
  styleId: string;
  styleNo: string;
  styleName: string | null;
  imageUrl: string | null;
  poNo: string | null;
  orderNo: string | null;
  fit: string | null;
  colorway: string | null;
  quantity: number | null;
  targetQty: number | null;
  actualQty: number | null;
  sizeBreakdown: Record<string, number> | null;
  orderDate: string | null;
  deliveryDate: string | null;
  productionType: string | null;
  currentProgress: string | null;
  riskLevel: string | null;
  status: string;
  threadInfo: string | null;
  fabricSummary: string | null;
  notes: string | null;
  mainFabric: { code: string | null; name: string | null; colorway: string | null; supplier: string | null } | null;
  pocket: { code: string | null; colorway: string | null } | null;
  interlining: { code: string | null; colorway: string | null } | null;
  felt: { code: string | null; colorway: string | null } | null;
  threadAcc: { name: string | null; code: string | null; colorway: string | null; spec: string | null; supplier: string | null; notes: string | null; trackingStatus: string | null } | null;
  accessories: Array<{
    id: string;
    name: string;
    code: string | null;
    colorway: string | null;
    spec: string | null;
    supplier: string | null;
    notes: string | null;
    trackingStatus: string;
    expectedArrival: string | null;
  }>;
  accessoriesReady: boolean;
  accessoriesMissing: string[];
  stage: string;
  milestones: Array<{ id: string; node: string; status: string; plannedTime: string | null; note: string | null }>;
};

type PreRow = {
  id: string;
  style_id: string;
  sample_no: string | null;
  version: string | null;
  colorway: string | null;
  quantity: number | null;
  sample_date: string | null;
  progress: string | null;
  fabric_summary: string | null;
  notes: string | null;
  styles?: Array<{ style_no: string; style_name: string | null; image_url: string | null }>;
};

const TRACK_OPTIONS = ["未下单", "已下单", "在途", "已到货"];
const MILESTONE_STATUS = ["待开始", "进行中", "已完成"];
const PROGRESS_OPTIONS = ["待排期", "剪版", "车版", "试缩水", "洗水", "寄板", "客户批核", "通过", "返修"];
const VERSION_OPTIONS = ["第一次版", "第二次版", "第三次版", "第四次版", "第五次版", "开发板", "开发板第二次"];
const ORDER_STATUS = ["草稿", "生产中", "已完成", "已取消"];
const RISK_OPTIONS = ["低", "中", "中高", "高", "正常"];

function sizeToText(s: Record<string, number> | null): string {
  if (!s) return "";
  return Object.entries(s)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
}
function textToSize(t: string): Record<string, number> | null {
  const out: Record<string, number> = {};
  t.split(/[\s,，;；]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p) => {
      const m = p.match(/^([A-Za-z0-9]+)[:：=](\d+)$/);
      if (m) out[m[1].toUpperCase()] = Number(m[2]);
    });
  return Object.keys(out).length ? out : null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(await res.text().then((t) => t.slice(0, 120)));
  return res.json() as Promise<T>;
}

function StageBadge({ stage }: { stage: string }) {
  const color =
    stage === "裁剪" || stage === "试缩水"
      ? "bg-amber-50 text-amber-700 ring-amber-600/20"
      : stage === "车缝"
        ? "bg-blue-50 text-blue-700 ring-blue-600/20"
        : stage === "洗水"
          ? "bg-cyan-50 text-cyan-700 ring-cyan-600/20"
          : stage === "后整"
            ? "bg-violet-50 text-violet-700 ring-violet-600/20"
            : stage === "出货" || stage === "货期校验"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
              : "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", color)}>
      {stage}
    </span>
  );
}

function ReadyBadge({ ready, missing }: { ready: boolean; missing: string[] }) {
  return ready ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
      ✅ 齐备
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20" title={missing.join("；")}>
      ⚠️ 差 {missing.length}
    </span>
  );
}

function OrderBoard() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ rows: OrderRow[] }>("/api/board/orders");
      // 按 PO 号从小到大排序（数字越小越早下单）
      const sorted = [...(res.rows ?? [])].sort((a, b) => {
        const na = Number(a.poNo ?? "0") || 0;
        const nb = Number(b.poNo ?? "0") || 0;
        return na - nb;
      });
      setRows(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveOrder = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        await api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await load();
        return true;
      } catch {
        return false;
      }
    },
    [load],
  );
  const saveAccessory = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        await api(`/api/accessories/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await load();
        return true;
      } catch {
        return false;
      }
    },
    [load],
  );
  const saveMilestone = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        await api(`/api/board/milestones/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await load();
        return true;
      } catch {
        return false;
      }
    },
    [load],
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const th = "border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[11px] font-semibold text-slate-600";
  const td = "border border-slate-300 px-2 py-1.5 align-middle";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          共 {rows.length} 张大货单 · 按 PO 号从小到大（越早越靠上）· 点单元格直接改，点行首箭头展开辅料/进度明细 · 点图片格上传款式图
        </p>
        <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> 刷新
        </button>
      </div>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={cn(th, "sticky left-0 z-20 min-w-[28px] text-center")}>#</th>
              <th className={cn(th, "min-w-[44px]")}>图片</th>
              <th className={cn(th, "sticky left-[72px] z-20 min-w-[120px]")}>款号</th>
              <th className={cn(th, "sticky left-[192px] z-20 min-w-[110px]")}>颜色</th>
              <th className={cn(th, "min-w-[78px]")}>PO</th>
              <th className={cn(th, "min-w-[86px]")}>制单号</th>
              <th className={cn(th, "min-w-[60px] text-right")}>下单量</th>
              <th className={cn(th, "min-w-[60px] text-right")}>目标裁数</th>
              <th className={cn(th, "min-w-[60px] text-right")}>实裁数</th>
              <th className={cn(th, "min-w-[130px]")}>尺码分布</th>
              <th className={cn(th, "min-w-[110px]")}>面料布号</th>
              <th className={cn(th, "min-w-[70px]")}>面料颜色</th>
              <th className={cn(th, "min-w-[60px]")}>朴色</th>
              <th className={cn(th, "min-w-[60px]")}>袋布色</th>
              <th className={cn(th, "min-w-[110px]")}>线(厂家/号)</th>
              <th className={cn(th, "min-w-[76px]")}>辅料</th>
              <th className={cn(th, "min-w-[200px]")}>生产进度</th>
              <th className={cn(th, "min-w-[78px]")}>货期</th>
              <th className={cn(th, "min-w-[120px]")}>欠/备注</th>
              <th className={cn(th, "min-w-[72px]")}>阶段</th>
              <th className={cn(th, "min-w-[70px]")}>状态</th>
              <th className={cn(th, "min-w-[44px]")}>打印</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <Fragment key={r.id}>
                <tr className={idx % 2 ? "bg-slate-50/60" : "bg-white"}>
                  <td className={cn(td, "sticky left-0 z-10 bg-inherit text-center text-slate-400")}>{idx + 1}</td>
                  <td className={td}>
                    <ImageCell src={r.imageUrl} styleId={r.styleId} onUpdated={load} />
                  </td>
                  <td className={cn(td, "sticky left-[72px] z-10 bg-inherit")}>
                    <Link href={`/styles/${r.styleId}`} className="font-semibold text-indigo-600 hover:underline">
                      {r.styleNo}
                    </Link>
                    {r.fit && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">{r.fit}</span>}
                  </td>
                  <td className={cn(td, "sticky left-[192px] z-10 bg-inherit")}>
                    <EditableCell value={r.colorway} onSave={(v) => saveOrder(r.id, { colorway: v })} />
                  </td>
                  <td className={cn(td, "font-medium text-slate-800")}>{r.poNo ?? "—"}</td>
                  <td className={td}>
                    <EditableCell value={r.orderNo} onSave={(v) => saveOrder(r.id, { order_no: v })} />
                  </td>
                  <td className={cn(td, "text-right")}>
                    <EditableCell type="number" value={r.quantity} className="text-right" onSave={(v) => saveOrder(r.id, { quantity: v })} />
                  </td>
                  <td className={cn(td, "text-right")}>
                    <EditableCell type="number" value={r.targetQty} className="text-right" onSave={(v) => saveOrder(r.id, { target_qty: v })} />
                  </td>
                  <td className={cn(td, "text-right")}>
                    <EditableCell type="number" value={r.actualQty} className="text-right" onSave={(v) => saveOrder(r.id, { actual_qty: v })} />
                  </td>
                  <td className={td}>
                    <EditableCell
                      value={sizeToText(r.sizeBreakdown)}
                      display={(v) => (v === "" || v == null ? "未填" : String(v))}
                      title="格式：XS:27 S:50 M:80 L:40"
                      onSave={(v) => saveOrder(r.id, { size_breakdown: textToSize(String(v ?? "")) })}
                    />
                  </td>
                  <td className={cn(td, "font-medium")}>{r.mainFabric?.code ?? "—"}</td>
                  <td className={td}>{r.mainFabric?.colorway ?? "—"}</td>
                  <td className={td}>{r.interlining?.colorway ?? "—"}</td>
                  <td className={td}>{r.pocket?.colorway ?? "—"}</td>
                  <td className={cn(td, "max-w-[150px]")} title={r.threadAcc?.notes ?? r.threadInfo ?? ""}>
                    <span className="line-clamp-2">{r.threadAcc ? `${r.threadAcc.code ?? ""} ${r.threadAcc.colorway ?? ""}`.trim() || "—" : r.threadInfo || "—"}</span>
                  </td>
                  <td className={td}>
                    <ReadyBadge ready={r.accessoriesReady} missing={r.accessoriesMissing} />
                  </td>
                  <td className={td}>
                    <EditableCell value={r.currentProgress} placeholder="—" className="w-full min-w-[180px]" onSave={(v) => saveOrder(r.id, { current_progress: v })} />
                  </td>
                  <td className={td}>
                    <EditableCell type="date" value={r.deliveryDate} onSave={(v) => saveOrder(r.id, { delivery_date: v })} />
                  </td>
                  <td className={td}>
                    <EditableCell value={r.notes} placeholder="—" className="w-full min-w-[110px]" onSave={(v) => saveOrder(r.id, { notes: v })} />
                  </td>
                  <td className={td}>
                    <StageBadge stage={r.stage} />
                  </td>
                  <td className={td}>
                    <EditableCell type="select" options={ORDER_STATUS} value={r.status} onSave={(v) => saveOrder(r.id, { status: v })} />
                  </td>
                  <td className={cn(td, "text-center")}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => toggle(r.id)} className="rounded p-1 text-slate-400 hover:text-indigo-600" title="展开明细">
                        {expanded.has(r.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <Link href={`/orders/${r.id}/print`} className="rounded p-1 text-slate-400 hover:text-indigo-600" title="打印大货单">
                        <Printer className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
                {expanded.has(r.id) && (
                  <tr className={idx % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td colSpan={22} className="border border-slate-300 px-4 py-3">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-bold text-slate-700">🧵 辅料明细（状态可直接改）</h4>
                          {r.accessories.length === 0 ? (
                            <p className="text-xs text-slate-400">暂无辅料记录</p>
                          ) : (
                            <div className="space-y-1.5">
                              {r.accessories.map((a) => (
                                <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
                                  <span className="w-36 truncate font-medium text-slate-700">{a.name}</span>
                                  <span className="text-slate-500">{a.code ?? ""} {a.spec ?? ""}</span>
                                  <span className="text-slate-500">{a.colorway ?? ""}</span>
                                  <span className="text-slate-500">{a.supplier ?? ""}</span>
                                  <EditableCell type="select" options={TRACK_OPTIONS} value={a.trackingStatus} className="ml-auto" onSave={(v) => saveAccessory(a.id, { tracking_status: v })} />
                                  <EditableCell value={a.notes} placeholder="备注" className="w-44" onSave={(v) => saveAccessory(a.id, { notes: v })} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="mb-2 text-xs font-bold text-slate-700">📋 大货进度里程碑（状态可直接改）</h4>
                          {r.milestones.length === 0 ? (
                            <p className="text-xs text-slate-400">暂无里程碑</p>
                          ) : (
                            <div className="space-y-1">
                              {r.milestones.map((m) => (
                                <div key={m.id} className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="w-40 font-medium text-slate-700">{m.node}</span>
                                  <EditableCell type="select" options={MILESTONE_STATUS} value={m.status} onSave={(v) => saveMilestone(m.id, { status: v })} />
                                  <span className="text-slate-400">{m.plannedTime ?? ""}</span>
                                  <span className="max-w-[260px] truncate text-slate-500">{m.note ?? ""}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <h4 className="mb-1 mt-3 text-xs font-bold text-slate-700">📝 生产方式 / 风险 / 用线用布</h4>
                          <div className="flex flex-wrap gap-3">
                            <EditableCell value={r.productionType} placeholder="生产方式" className="w-56" onSave={(v) => saveOrder(r.id, { production_type: v })} />
                            <EditableCell type="select" options={RISK_OPTIONS} value={r.riskLevel} onSave={(v) => saveOrder(r.id, { risk_level: v })} />
                            <EditableCell value={r.threadInfo} placeholder="用线" className="w-48" onSave={(v) => saveOrder(r.id, { thread_info: v })} />
                            <EditableCell value={r.fabricSummary} placeholder="用布" className="w-56" onSave={(v) => saveOrder(r.id, { fabric_summary: v })} />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">暂无大货单数据</p>
        )}
      </div>
    </div>
  );
}

function PreBoard() {
  const [rows, setRows] = useState<PreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    style_no: "",
    colorway: "",
    sample_no: "",
    version: "第一次版",
    sample_date: "",
    progress: "待排期",
    fabric_summary: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api<{ data: PreRow[] }>("/api/preproduction");
      const sorted = [...(res.data ?? [])].sort((a, b) =>
        (a.sample_date ?? "").localeCompare(b.sample_date ?? "") || (a.sample_no ?? "").localeCompare(b.sample_no ?? ""),
      );
      setRows(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        await api(`/api/preproduction/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        await load();
        return true;
      } catch {
        return false;
      }
    },
    [load],
  );

  const remove = async (id: string) => {
    if (!confirm("确定删除这条产前版记录？")) return;
    try {
      await api(`/api/preproduction/${id}`, { method: "DELETE" });
      await load();
    } catch {
      alert("删除失败");
    }
  };

  const add = async () => {
    if (!form.style_no.trim()) {
      alert("请填写款号");
      return;
    }
    try {
      await api("/api/preproduction", { method: "POST", body: JSON.stringify(form) });
      setForm({ style_no: "", colorway: "", sample_no: "", version: "第一次版", sample_date: "", progress: "待排期", fabric_summary: "", notes: "" });
      setShowAdd(false);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "新增失败");
    }
  };

  const inputCls = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const th = "border border-slate-300 bg-slate-100 px-2 py-2 text-left text-[11px] font-semibold text-slate-600";
  const td = "border border-slate-300 px-2 py-1.5 align-middle";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">共 {rows.length} 条产前版/开发板 · 按开单日排列 · 全部可在线编辑，可新增</p>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> 刷新
          </button>
          <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
            <Plus className="h-3.5 w-3.5" /> 新增产前版
          </button>
        </div>
      </div>
      {showAdd && (
        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
          <h3 className="mb-3 text-sm font-bold text-indigo-900">新增产前版 / 开发板（款号不存在会自动建档）</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <input className={inputCls} placeholder="款号 *（如 24Q1109JE3231）" value={form.style_no} onChange={(e) => setForm({ ...form, style_no: e.target.value })} />
            <input className={inputCls} placeholder="颜色" value={form.colorway} onChange={(e) => setForm({ ...form, colorway: e.target.value })} />
            <input className={inputCls} placeholder="样板单号" value={form.sample_no} onChange={(e) => setForm({ ...form, sample_no: e.target.value })} />
            <select className={inputCls} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}>
              {VERSION_OPTIONS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <input type="date" className={inputCls} value={form.sample_date} onChange={(e) => setForm({ ...form, sample_date: e.target.value })} />
            <select className={inputCls} value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })}>
              {PROGRESS_OPTIONS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <input className={inputCls} placeholder="布种/面辅料（如 M13557/SK9743）" value={form.fabric_summary} onChange={(e) => setForm({ ...form, fabric_summary: e.target.value })} />
            <input className={inputCls} placeholder="备注（可写 寄客日：xx）" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={add} className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">保存</button>
            <button onClick={() => setShowAdd(false)} className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs text-slate-600">取消</button>
          </div>
        </div>
      )}
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={cn(th, "sticky left-0 z-20 min-w-[28px] text-center")}>#</th>
              <th className={cn(th, "min-w-[44px]")}>图片</th>
              <th className={cn(th, "sticky left-[72px] z-20 min-w-[120px]")}>款号</th>
              <th className={cn(th, "min-w-[140px]")}>款式名称</th>
              <th className={cn(th, "min-w-[90px]")}>颜色</th>
              <th className={cn(th, "min-w-[90px]")}>办类/版本</th>
              <th className={cn(th, "min-w-[100px]")}>单据编号</th>
              <th className={cn(th, "min-w-[76px]")}>开单日</th>
              <th className={cn(th, "min-w-[160px]")}>布种/面辅料</th>
              <th className={cn(th, "min-w-[200px]")}>进度</th>
              <th className={cn(th, "min-w-[220px]")}>备注/寄客日</th>
              <th className={cn(th, "min-w-[44px]")}>打印</th>
              <th className={cn(th, "min-w-[36px]")}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id} className={idx % 2 ? "bg-slate-50/60" : "bg-white"}>
                <td className={cn(td, "sticky left-0 z-10 bg-inherit text-center text-slate-400")}>{idx + 1}</td>
                <td className={td}>
                  <ImageCell src={r.styles?.[0]?.image_url ?? null} styleId={r.style_id} onUpdated={load} />
                </td>
                <td className={cn(td, "sticky left-[72px] z-10 bg-inherit")}>
                  <Link href={`/styles/${r.style_id}`} className="font-semibold text-indigo-600 hover:underline">
                    {r.styles?.[0]?.style_no ?? "—"}
                  </Link>
                </td>
                <td className={td}>{r.styles?.[0]?.style_name ?? "—"}</td>
                <td className={td}>
                  <EditableCell value={r.colorway} onSave={(v) => save(r.id, { colorway: v })} />
                </td>
                <td className={td}>
                  <EditableCell type="select" options={VERSION_OPTIONS} value={r.version} onSave={(v) => save(r.id, { version: v })} />
                </td>
                <td className={td}>
                  <EditableCell value={r.sample_no} onSave={(v) => save(r.id, { sample_no: v })} />
                </td>
                <td className={td}>
                  <EditableCell type="date" value={r.sample_date} onSave={(v) => save(r.id, { sample_date: v })} />
                </td>
                <td className={td}>
                  <EditableCell value={r.fabric_summary} placeholder="—" className="min-w-[140px]" onSave={(v) => save(r.id, { fabric_summary: v })} />
                </td>
                <td className={td}>
                  <EditableCell value={r.progress ?? "待排期"} placeholder="—" className="min-w-[180px]" onSave={(v) => save(r.id, { progress: v })} />
                </td>
                <td className={td}>
                  <EditableCell value={r.notes} placeholder="—" className="min-w-[200px]" onSave={(v) => save(r.id, { notes: v })} />
                </td>
                <td className={cn(td, "text-center")}>
                  <Link href={`/preproduction/${r.id}/print`} className="inline-flex rounded p-1 text-slate-400 hover:text-indigo-600" title="打印">
                    <Printer className="h-3.5 w-3.5" />
                  </Link>
                </td>
                <td className={cn(td, "text-center")}>
                  <button onClick={() => remove(r.id)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500" title="删除">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <p className="px-4 py-8 text-center text-sm text-slate-400">暂无产前版记录，点右上角「新增产前版」开始</p>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const [tab, setTab] = useState<"orders" | "pre">("orders");
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">追踪总表</h1>
        <p className="mt-1 text-sm text-slate-500">大货 & 产前版一站式在线表格：点单元格直接改，自动保存云端；点图片格上传款式图</p>
      </div>
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-200/70 p-1">
        {(
          [
            ["orders", "🧥 大货追踪总表"],
            ["pre", "🧵 产前版追踪总表"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition",
              tab === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-800",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "orders" ? <OrderBoard /> : <PreBoard />}
    </div>
  );
}
