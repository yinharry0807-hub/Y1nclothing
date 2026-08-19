"use client";

import { EditableCell } from "@/components/EditableCell";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";

type OrderRow = {
  id: string;
  styleId: string;
  styleNo: string;
  styleName: string | null;
  poNo: string | null;
  orderNo: string | null;
  fit: string | null;
  colorway: string | null;
  quantity: number | null;
  targetQty: number | null;
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
  accessoriesSummary: string;
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
  styles?: Array<{ style_no: string; style_name: string | null }>;
};

const TRACK_OPTIONS = ["未下单", "已下单", "在途", "已到货"];
const MILESTONE_STATUS = ["待开始", "进行中", "已完成"];
const PROGRESS_OPTIONS = ["待排期", "剪版", "车版", "试缩水", "洗水", "寄板", "客户批核", "通过", "返修"];
const VERSION_OPTIONS = ["第一次版", "第二次版", "第三次版", "第四次版", "第五次版"];
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
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
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
      ⚠️ 差 {missing.length} 项
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
      setRows(res.rows ?? []);
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

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          共 {rows.length} 张大货单 · 点击任意单元格直接在线修改，点击行首箭头展开辅料与进度明细
        </p>
        <button onClick={load} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> 刷新
        </button>
      </div>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-2 py-2"></th>
              <th className="px-2 py-2 font-medium">下单时间</th>
              <th className="px-2 py-2 font-medium">款号</th>
              <th className="px-2 py-2 font-medium">颜色</th>
              <th className="px-2 py-2 font-medium">PO</th>
              <th className="px-2 py-2 text-right font-medium">下单量</th>
              <th className="px-2 py-2 text-right font-medium">目标裁数</th>
              <th className="px-2 py-2 font-medium">尺码分布</th>
              <th className="px-2 py-2 font-medium">货期</th>
              <th className="px-2 py-2 font-medium">面料布号</th>
              <th className="px-2 py-2 font-medium">面料颜色</th>
              <th className="px-2 py-2 font-medium">朴色</th>
              <th className="px-2 py-2 font-medium">袋布色</th>
              <th className="px-2 py-2 font-medium">线(厂家/号)</th>
              <th className="px-2 py-2 font-medium">辅料齐备</th>
              <th className="px-2 py-2 font-medium">当前阶段</th>
              <th className="px-2 py-2 font-medium">状态</th>
              <th className="px-2 py-2 font-medium">打印</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="hover:bg-slate-50/70">
                  <td className="px-2 py-2">
                    <button onClick={() => toggle(r.id)} className="rounded p-0.5 text-slate-400 hover:text-indigo-600">
                      {expanded.has(r.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <EditableCell type="date" value={r.orderDate} onSave={(v) => saveOrder(r.id, { order_date: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <Link href={`/styles/${r.styleId}`} className="font-semibold text-indigo-600 hover:underline">
                      {r.styleNo}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <EditableCell value={r.colorway} onSave={(v) => saveOrder(r.id, { colorway: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <EditableCell value={r.poNo} onSave={(v) => saveOrder(r.id, { po_no: v })} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <EditableCell type="number" value={r.quantity} className="text-right" onSave={(v) => saveOrder(r.id, { quantity: v })} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <EditableCell type="number" value={r.targetQty} className="text-right" onSave={(v) => saveOrder(r.id, { target_qty: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <EditableCell
                      value={sizeToText(r.sizeBreakdown)}
                      display={(v) => (v === "" || v == null ? "未填" : String(v))}
                      title="格式：XS:27 S:50 M:80 L:40"
                      onSave={(v) => saveOrder(r.id, { size_breakdown: textToSize(String(v ?? "")) })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <EditableCell type="date" value={r.deliveryDate} onSave={(v) => saveOrder(r.id, { delivery_date: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-slate-700">{r.mainFabric?.code ?? "—"}</span>
                  </td>
                  <td className="px-2 py-2 text-slate-700">{r.mainFabric?.colorway ?? "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{r.interlining?.colorway ?? "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{r.pocket?.colorway ?? "—"}</td>
                  <td className="max-w-[140px] truncate px-2 py-2 text-slate-600" title={r.threadAcc?.notes ?? r.threadInfo ?? ""}>
                    {r.threadAcc ? `${r.threadAcc.code ?? ""} ${r.threadAcc.colorway ?? ""}`.trim() || "—" : r.threadInfo || "—"}
                  </td>
                  <td className="px-2 py-2">
                    <ReadyBadge ready={r.accessoriesReady} missing={r.accessoriesMissing} />
                  </td>
                  <td className="px-2 py-2">
                    <StageBadge stage={r.stage} />
                  </td>
                  <td className="px-2 py-2">
                    <EditableCell type="select" options={ORDER_STATUS} value={r.status} onSave={(v) => saveOrder(r.id, { status: v })} />
                  </td>
                  <td className="px-2 py-2">
                    <Link href={`/orders/${r.id}/print`} className="inline-flex rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" title="打印大货单">
                      <Printer className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
                {expanded.has(r.id) && (
                  <tr className="bg-slate-50/60">
                    <td colSpan={18} className="px-4 py-3">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <h4 className="mb-2 text-xs font-bold text-slate-700">🧵 辅料明细（点击状态可直接改）</h4>
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
                                  <EditableCell
                                    type="select"
                                    options={TRACK_OPTIONS}
                                    value={a.trackingStatus}
                                    className="ml-auto"
                                    onSave={(v) => saveAccessory(a.id, { tracking_status: v })}
                                  />
                                  <EditableCell
                                    value={a.notes}
                                    placeholder="备注"
                                    className="w-44"
                                    onSave={(v) => saveAccessory(a.id, { notes: v })}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="mb-2 text-xs font-bold text-slate-700">📋 大货进度里程碑（点击状态可直接改）</h4>
                          {r.milestones.length === 0 ? (
                            <p className="text-xs text-slate-400">暂无里程碑，可在样式详情页维护</p>
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
                          <h4 className="mb-1 mt-3 text-xs font-bold text-slate-700">📝 当前核心进度 / 生产方式 / 风险</h4>
                          <div className="space-y-1.5">
                            <EditableCell value={r.currentProgress} placeholder="当前核心进度" className="w-full" onSave={(v) => saveOrder(r.id, { current_progress: v })} />
                            <div className="flex gap-3">
                              <EditableCell value={r.productionType} placeholder="生产方式" className="w-56" onSave={(v) => saveOrder(r.id, { production_type: v })} />
                              <EditableCell type="select" options={RISK_OPTIONS} value={r.riskLevel} onSave={(v) => saveOrder(r.id, { risk_level: v })} />
                            </div>
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
      setRows(res.data ?? []);
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

  const inputCls =
    "w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">共 {rows.length} 条产前版 · 按下单/办单日期倒序 · 全部可在线编辑，可随时新增</p>
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
          <h3 className="mb-3 text-sm font-bold text-indigo-900">新增产前版（款号不存在会自动建档）</h3>
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
            <input className={inputCls} placeholder="面辅料整理（如：主面料已调拨，朴/袋布已备）" value={form.fabric_summary} onChange={(e) => setForm({ ...form, fabric_summary: e.target.value })} />
            <input className={inputCls} placeholder="备注" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={add} className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
              保存
            </button>
            <button onClick={() => setShowAdd(false)} className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs text-slate-600">
              取消
            </button>
          </div>
        </div>
      )}
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-2 py-2 font-medium">日期</th>
              <th className="px-2 py-2 font-medium">款号</th>
              <th className="px-2 py-2 font-medium">颜色</th>
              <th className="px-2 py-2 font-medium">样板单号</th>
              <th className="px-2 py-2 font-medium">版本</th>
              <th className="px-2 py-2 font-medium">进度</th>
              <th className="px-2 py-2 font-medium">面辅料整理</th>
              <th className="px-2 py-2 font-medium">备注</th>
              <th className="px-2 py-2 font-medium">打印</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="px-2 py-2">
                  <EditableCell type="date" value={r.sample_date} onSave={(v) => save(r.id, { sample_date: v })} />
                </td>
                <td className="px-2 py-2">
                  <Link href={`/styles/${r.style_id}`} className="font-semibold text-indigo-600 hover:underline">
                    {r.styles?.[0]?.style_no ?? "—"}
                  </Link>
                </td>
                <td className="px-2 py-2">
                  <EditableCell value={r.colorway} onSave={(v) => save(r.id, { colorway: v })} />
                </td>
                <td className="px-2 py-2">
                  <EditableCell value={r.sample_no} onSave={(v) => save(r.id, { sample_no: v })} />
                </td>
                <td className="px-2 py-2">
                  <EditableCell type="select" options={VERSION_OPTIONS} value={r.version} onSave={(v) => save(r.id, { version: v })} />
                </td>
                <td className="px-2 py-2">
                  <EditableCell type="select" options={PROGRESS_OPTIONS} value={r.progress ?? "待排期"} onSave={(v) => save(r.id, { progress: v })} />
                </td>
                <td className="px-2 py-2">
                  <EditableCell value={r.fabric_summary} placeholder="未填" className="w-64" onSave={(v) => save(r.id, { fabric_summary: v })} />
                </td>
                <td className="px-2 py-2">
                  <EditableCell value={r.notes} placeholder="—" className="w-48" onSave={(v) => save(r.id, { notes: v })} />
                </td>
                <td className="px-2 py-2">
                  <Link href={`/preproduction/${r.id}/print`} className="inline-flex rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600" title="打印产前版样板单">
                    <Printer className="h-3.5 w-3.5" />
                  </Link>
                </td>
                <td className="px-2 py-2">
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
        <p className="mt-1 text-sm text-slate-500">
          大货 & 产前版一站式在线表格：所有单元格直接点击修改，自动保存到云端
        </p>
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
