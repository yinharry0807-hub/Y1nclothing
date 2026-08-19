import { PrintButton } from "@/components/PrintButton";
import { createClient, isAuthorized } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
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

export default async function PreproductionPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authorized = await isAuthorized();
  if (!authorized) redirect("/login");
  const { id } = await params;
  const supabase = await createClient();

  const { data: pre } = await supabase
    .from("preproduction")
    .select("*, styles(style_no,style_name,brand,customer,category)")
    .eq("id", id)
    .single();
  if (!pre) return <p className="p-8 text-center text-sm text-slate-500">找不到这条产前版记录</p>;

  const style = pre.styles?.[0] ?? {};

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
            <h1 className="text-xl font-bold">产 前 版 样 板 单</h1>
            <p className="text-xs text-slate-500">Pre-Production Sample Sheet</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>品牌：{style.brand ?? "Halara"}</p>
            <p>客户：{style.customer ?? "全速"}</p>
            <p>打印时间：{new Date().toLocaleString("zh-CN")}</p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="款号" value={style.style_no} />
          <Field label="品名" value={style.style_name} />
          <Field label="品类" value={style.category} />
          <Field label="颜色" value={pre.colorway} />
          <Field label="样板单号" value={pre.sample_no} />
          <Field label="寄出版本" value={pre.version} />
          <Field label="办单日期" value={formatDate(pre.sample_date)} />
          <Field label="当前进度" value={pre.progress ?? "待排期"} />
        </div>

        <div className="mb-4">
          <h2 className="mb-2 text-sm font-bold">🧵 面辅料整理</h2>
          <div className="min-h-[120px] rounded-md border border-slate-300 p-3 text-sm">
            {pre.fabric_summary || "（未填写面辅料整理内容）"}
          </div>
        </div>

        <div className="mb-4">
          <h2 className="mb-2 text-sm font-bold">📝 备注</h2>
          <div className="min-h-[80px] rounded-md border border-slate-300 p-3 text-sm">
            {pre.notes || "（无备注）"}
          </div>
        </div>

        <div className="no-print mt-6 flex gap-3 border-t border-slate-200 pt-4">
          <PrintButton />
          <a href={`/styles/${pre.style_id}`} className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            返回款式卡
          </a>
        </div>
      </div>
    </div>
  );
}
