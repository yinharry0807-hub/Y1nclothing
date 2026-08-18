import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import {
  TRACKING_STATUS_META,
  TRACKING_STATUS_OPTIONS,
  formatDate,
  formatNumber,
} from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "辅料追踪 - 服装跟单智能工作台" };

export default async function AccessoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("accessory_info")
    .select("*")
    .order("expected_arrival", { ascending: true, nullsFirst: false });
  if (status && TRACKING_STATUS_OPTIONS.includes(status)) {
    query = query.eq("tracking_status", status);
  }
  const { data: accessories } = await query.limit(300);

  const styleIds = [...new Set((accessories ?? []).map((a) => a.style_id))];
  const { data: styles } =
    styleIds.length > 0
      ? await supabase
          .from("styles")
          .select("id,style_no,style_name")
          .in("id", styleIds)
      : { data: [] };
  const styleMap = new Map((styles ?? []).map((s) => [s.id, s]));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">辅料追踪</h1>
        <p className="mt-1 text-sm text-slate-500">
          未下单 / 已下单 / 在途 / 已到货，全款式辅料一屏掌握。
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/accessories"
          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
            !status
              ? "bg-indigo-600 text-white ring-indigo-600"
              : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
          }`}
        >
          全部
        </Link>
        {TRACKING_STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={`/accessories?status=${encodeURIComponent(s)}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              status === s
                ? "bg-indigo-600 text-white ring-indigo-600"
                : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {!accessories || accessories.length === 0 ? (
        <EmptyState
          title={status ? `没有「${status}」的辅料` : "还没有辅料记录"}
          description="在款式详情页录入辅料并设置追踪状态。"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">款式</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">辅料名称</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">规格</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">状态</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">订购</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">收货</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">供应商</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">下单日期</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">预计到货</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">实际到货</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accessories.map((a) => {
                const style = styleMap.get(a.style_id);
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/styles/${a.style_id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {style?.style_no ?? a.style_id.slice(0, 8)}
                      </Link>
                      {a.order_id && (
                        <p className="text-[10px] text-slate-400">关联订单</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {a.accessory_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.spec || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={
                          TRACKING_STATUS_META[a.tracking_status]?.label ??
                          a.tracking_status
                        }
                        className={
                          TRACKING_STATUS_META[a.tracking_status]?.className
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(a.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatNumber(a.received_qty)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.supplier || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(a.order_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(a.expected_arrival)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(a.actual_arrival)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
