import { PrintButton } from "@/components/PrintButton";
import { createClient, isAuthorized } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

function Field({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="border border-slate-300 px-2 py-1.5">
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value ?? "—"}</div>
    </div>
  );
}

export default async function OrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authorized = await isAuthorized();
  if (!authorized) redirect("/login");
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, styles(style_no,style_name,brand,customer,category)")
    .eq("id", id)
    .single();
  if (!order) return <p className="p-8 text-center text-sm text-slate-500">找不到这张大货单</p>;

  const style = order.styles?.[0] ?? {};
  const [{ data: fabrics }, { data: accessories }, { data: milestones }] =
    await Promise.all([
      supabase.from("fabric_info").select("*").eq("style_id", order.style_id),
      supabase
        .from("accessory_info")
        .select("*")
        .or(`order_id.eq.${order.id},and(order_id.is.null,style_id.eq.${order.style_id})`),
      supabase.from("order_milestones").select("*").eq("order_id", order.id).order("sort_order"),
    ]);

  const sizeText =
    typeof order.size_breakdown === "object" && order.size_breakdown
      ? Object.entries(order.size_breakdown as Record<string, number>)
          .map(([k, v]) => `${k}:${v}`)
          .join("　")
      : "—";

  return (
    <div className="min-h-screen bg-slate-100 py-6">
      <style>{`
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>
      <div className="print-page mx-auto max-w-[900px] rounded-lg bg-white p-8 shadow">
        <div className="mb-5 flex items-start justify-between border-b-2 border-slate-800 pb-3">
          <div>
            <h1 className="text-xl font-bold">大 货 单</h1>
            <p className="text-xs text-slate-500">Garment Bulk Order Sheet</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>品牌：{style.brand ?? "Halara"}</p>
            <p>客户：{style.customer ?? "全速"}</p>
            <p>打印时间：{new Date().toLocaleString("zh-CN")}</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="款号" value={style.style_no ?? order.style_no} />
          <Field label="品名" value={style.style_name} />
          <Field label="品类" value={style.category} />
          <Field label="版型" value={order.fit} />
          <Field label="PO 号" value={order.po_no} />
          <Field label="制单号" value={order.order_no} />
          <Field label="颜色" value={order.colorway} />
          <Field label="客户下单量" value={order.quantity != null ? `${formatNumber(order.quantity)} 件` : undefined} />
          <Field label="目标裁数" value={order.target_qty != null ? `${formatNumber(order.target_qty)} 件` : undefined} />
          <Field label="实裁数" value={order.actual_qty != null ? `${formatNumber(order.actual_qty)} 件` : undefined} />
          <Field label="下单日期" value={formatDate(order.order_date)} />
          <Field label="大货货期" value={formatDate(order.delivery_date)} />
          <Field label="生产方式" value={order.production_type} />
          <Field label="风险等级" value={order.risk_level} />
          <Field label="状态" value={order.status} />
          <Field label="尺码分布" value={sizeText} />
        </div>

        <h2 className="mb-2 mt-5 text-sm font-bold">🧵 面料</h2>
        <table className="mb-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 px-2 py-1">类别</th>
              <th className="border border-slate-300 px-2 py-1">布号</th>
              <th className="border border-slate-300 px-2 py-1">面料名</th>
              <th className="border border-slate-300 px-2 py-1">颜色</th>
              <th className="border border-slate-300 px-2 py-1">成分</th>
              <th className="border border-slate-300 px-2 py-1">幅宽</th>
              <th className="border border-slate-300 px-2 py-1">用量/件</th>
              <th className="border border-slate-300 px-2 py-1">供应商</th>
            </tr>
          </thead>
          <tbody>
            {(fabrics ?? []).map((f) => (
              <tr key={f.id}>
                <td className="border border-slate-300 px-2 py-1">{f.category ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{f.material_code ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{f.fabric_name}</td>
                <td className="border border-slate-300 px-2 py-1">{f.colorway ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{f.composition ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{f.width ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{f.usage_per_piece ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{f.supplier ?? ""}</td>
              </tr>
            ))}
            {(fabrics ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="border border-slate-300 px-2 py-2 text-center text-slate-400">暂无面料数据</td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="mb-2 mt-5 text-sm font-bold">📎 辅料（含追踪状态）</h2>
        <table className="mb-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 px-2 py-1">辅料</th>
              <th className="border border-slate-300 px-2 py-1">物料编号</th>
              <th className="border border-slate-300 px-2 py-1">颜色</th>
              <th className="border border-slate-300 px-2 py-1">规格</th>
              <th className="border border-slate-300 px-2 py-1">供应商</th>
              <th className="border border-slate-300 px-2 py-1">追踪状态</th>
              <th className="border border-slate-300 px-2 py-1">备注</th>
            </tr>
          </thead>
          <tbody>
            {(accessories ?? []).map((a) => (
              <tr key={a.id}>
                <td className="border border-slate-300 px-2 py-1">{a.accessory_name}</td>
                <td className="border border-slate-300 px-2 py-1">{a.material_code ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{a.colorway ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{a.spec ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{a.supplier ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{a.tracking_status ?? "未下单"}</td>
                <td className="border border-slate-300 px-2 py-1">{a.notes ?? ""}</td>
              </tr>
            ))}
            {(accessories ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="border border-slate-300 px-2 py-2 text-center text-slate-400">暂无辅料数据</td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="mb-2 mt-5 text-sm font-bold">📋 大货进度</h2>
        <table className="mb-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="border border-slate-300 px-2 py-1">流程节点</th>
              <th className="border border-slate-300 px-2 py-1">状态</th>
              <th className="border border-slate-300 px-2 py-1">完成/计划时间</th>
              <th className="border border-slate-300 px-2 py-1">跟进说明</th>
            </tr>
          </thead>
          <tbody>
            {(milestones ?? []).map((m) => (
              <tr key={m.id}>
                <td className="border border-slate-300 px-2 py-1">{m.node_name}</td>
                <td className="border border-slate-300 px-2 py-1">{m.status}</td>
                <td className="border border-slate-300 px-2 py-1">{m.planned_time ?? ""}</td>
                <td className="border border-slate-300 px-2 py-1">{m.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(order.current_progress || order.thread_info || order.fabric_summary || order.notes) && (
          <div className="mb-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <Field label="当前核心进度" value={order.current_progress} />
            <Field label="用线" value={order.thread_info} />
            <Field label="用布" value={order.fabric_summary} />
            <Field label="备注" value={order.notes} />
          </div>
        )}

        <div className="no-print mt-6 flex gap-3 border-t border-slate-200 pt-4">
          <PrintButton />
          <a href={`/styles/${order.style_id}`} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            返回款式卡
          </a>
        </div>
      </div>
    </div>
  );
}
