import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, truncate } from "@/lib/utils";
import { Plus, Shirt } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "款式库 - 服装跟单智能工作台" };

export default async function StylesPage() {
  const supabase = await createClient();

  const [{ data: styles }, fabricRes, accessoryRes] = await Promise.all([
    supabase
      .from("styles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("fabric_info").select("style_id"),
    supabase.from("accessory_info").select("style_id"),
  ]);

  const fabricCounts = new Map<string, number>();
  (fabricRes.data ?? []).forEach((f) =>
    fabricCounts.set(f.style_id, (fabricCounts.get(f.style_id) ?? 0) + 1),
  );
  const accessoryCounts = new Map<string, number>();
  (accessoryRes.data ?? []).forEach((a) =>
    accessoryCounts.set(a.style_id, (accessoryCounts.get(a.style_id) ?? 0) + 1),
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">款式库</h1>
          <p className="mt-1 text-sm text-slate-500">
            每个款式一份完整档案：面料、辅料、大货单、产前版。
          </p>
        </div>
        <Link
          href="/styles/new"
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          新建款式
        </Link>
      </div>

      {!styles || styles.length === 0 ? (
        <EmptyState
          title="还没有款式档案"
          description="手动新建款式，或阶段2接入 AI 后从导入的资料自动归类生成。"
          action={
            <Link
              href="/styles/new"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
            >
              新建款式
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">款式编号</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">款式名称</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">客户款号</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">面料</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">辅料</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">状态</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {styles.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/styles/${s.id}`}
                      className="flex items-center gap-2 font-semibold text-indigo-600 hover:underline"
                    >
                      <Shirt className="h-4 w-4 text-slate-300" />
                      {s.style_no}
                    </Link>
                  </td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-slate-700">
                    {s.style_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {s.customer_style_no || "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {fabricCounts.get(s.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {accessoryCounts.get(s.id) ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={s.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(s.updated_at)}
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
