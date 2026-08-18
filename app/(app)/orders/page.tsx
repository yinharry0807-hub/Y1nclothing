import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "大货单 - 服装跟单智能工作台" };

export default async function OrdersPage() {
  const supabase = await createClient();
  const [{ data: orders }, { data: styles }] = await Promise.all([
    supabase
      .from("orders")
      .select("*")
      .order("delivery_date", { ascending: false })
      .limit(300),
    supabase.from("styles").select("id,style_no"),
  ]);
  const styleMap = new Map((styles ?? []).map((s) => [s.id, s.style_no]));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">大货单</h1>
        <p className="mt-1 text-sm text-slate-500">
          大货单模板生成与 PDF 导出将在阶段4开放；当前可查看已录入的大货单。
        </p>
      </div>

      {!orders || orders.length === 0 ? (
        <EmptyState
          title="还没有大货单"
          description="阶段4将支持按模板一键生成大货单（款式/数量/面料/辅料/交期）并导出打印。"
          action={
            <Link
              href="/styles"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              去款式库
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">款式</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">PO</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">制单号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">颜色</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">数量</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">货期</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/styles/${o.style_id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {o.style_no || styleMap.get(o.style_id) || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.po_no || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{o.order_no || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{o.colorway || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatNumber(o.quantity)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(o.delivery_date)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
