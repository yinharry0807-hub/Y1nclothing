import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "样板单 - 服装跟单智能工作台" };

export default async function SamplesPage() {
  const supabase = await createClient();
  const [{ data: samples }, { data: styles }] = await Promise.all([
    supabase
      .from("sample_orders")
      .select("*")
      .order("sample_date", { ascending: false })
      .limit(300),
    supabase.from("styles").select("id,style_no"),
  ]);
  const styleMap = new Map((styles ?? []).map((s) => [s.id, s.style_no]));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">样板单</h1>
        <p className="mt-1 text-sm text-slate-500">
          开发板 / 样办单 / 产前版记录，模板生成在阶段4开放。
        </p>
      </div>

      {!samples || samples.length === 0 ? (
        <EmptyState
          title="还没有样板单"
          description="阶段4将支持按产前版模板一键生成样板单并导出。"
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">款式</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">单据编号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">板类</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">颜色</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">数量</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">日期</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {samples.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/styles/${s.style_id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {styleMap.get(s.style_id) || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.sample_order_no || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.sample_type || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.colorway || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatNumber(s.quantity)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(s.sample_date)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={s.status} />
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
