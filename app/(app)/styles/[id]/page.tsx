import { AccessorySection } from "@/components/AccessorySection";
import { FabricSection } from "@/components/FabricSection";
import { StatusBadge } from "@/components/StatusBadge";
import { StyleInfoCard } from "@/components/StyleInfoCard";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import { FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function StyleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: style },
    { data: fabrics },
    { data: accessories },
    { data: orders },
    { data: preproductions },
    { data: sampleOrders },
    { data: documents },
    { data: summary },
  ] = await Promise.all([
    supabase.from("styles").select("*").eq("id", id).single(),
    supabase
      .from("fabric_info")
      .select("*")
      .eq("style_id", id)
      .order("created_at"),
    supabase
      .from("accessory_info")
      .select("*")
      .eq("style_id", id)
      .order("created_at"),
    supabase
      .from("orders")
      .select("*")
      .eq("style_id", id)
      .order("delivery_date", { ascending: false }),
    supabase
      .from("preproduction")
      .select("*")
      .eq("style_id", id)
      .order("sample_date", { ascending: false }),
    supabase
      .from("sample_orders")
      .select("*")
      .eq("style_id", id)
      .order("sample_date", { ascending: false }),
    supabase
      .from("documents")
      .select("id,file_name")
      .order("upload_time", { ascending: false })
      .limit(100),
    supabase
      .from("ai_summaries")
      .select("*")
      .eq("style_id", id)
      .eq("summary_type", "style")
      .maybeSingle(),
  ]);

  if (!style) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/styles" className="text-xs text-indigo-600 hover:underline">
          ← 返回款式库
        </Link>
      </div>

      <StyleInfoCard style={style} documents={documents ?? []} />

      <section>
        <FabricSection
          styleId={style.id}
          fabrics={fabrics ?? []}
          orders={orders ?? []}
        />
      </section>

      <section>
        <AccessorySection
          styleId={style.id}
          accessories={accessories ?? []}
          orders={orders ?? []}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            大货单（{orders?.length ?? 0}）
          </h3>
        </div>
        {orders && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">制单号</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">PO</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">型号</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">颜色</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">数量</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">货期</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 font-medium text-slate-900">{o.order_no || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{o.po_no || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{o.fit || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{o.colorway || "—"}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatNumber(o.quantity)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatDate(o.delivery_date)}</td>
                    <td className="px-4 py-2">
                      <StatusBadge label={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-6 text-center text-sm text-slate-400">
            暂无大货单。阶段4将支持按模板一键生成大货单并导出 PDF。
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              产前版记录（{preproductions?.length ?? 0}）
            </h3>
          </div>
          {preproductions && preproductions.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {preproductions.map((p) => (
                <li key={p.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {p.sample_no || "未编号"}
                    {p.version && (
                      <span className="ml-2 text-xs text-slate-400">{p.version}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.colorway || "—"} · {formatDate(p.sample_date)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-slate-400">
              暂无产前版记录，阶段4支持一键生成产前版样板单。
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              样板单（{sampleOrders?.length ?? 0}）
            </h3>
          </div>
          {sampleOrders && sampleOrders.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {sampleOrders.map((s) => (
                <li key={s.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {s.sample_order_no || "未编号"}
                    {s.sample_type && (
                      <span className="ml-2 text-xs text-slate-400">{s.sample_type}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {s.colorway || "—"} · {formatDate(s.sample_date)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-center text-sm text-slate-400">
              暂无样板单记录。
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <FileText className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">关联原始资料</h3>
          </div>
          <div className="px-5 py-4">
            {style.document_id ? (
              <Link
                href={`/documents/${style.document_id}`}
                className="text-sm text-indigo-600 hover:underline"
              >
                {documents?.find((d) => d.id === style.document_id)?.file_name ??
                  "查看原始资料"}
              </Link>
            ) : (
              <p className="text-xs text-slate-400">
                未关联。可在编辑款式时选择一份已导入资料作为来源。
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900">款式 AI 总结</h3>
          </div>
          <div className="px-5 py-4">
            {summary?.summary_text ? (
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-600">
                {summary.summary_text}
              </pre>
            ) : (
              <p className="text-xs text-slate-400">
                阶段2接入 DeepSeek 后，将自动汇总该款式的面料、辅料、价格、交期并生成总结。
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
