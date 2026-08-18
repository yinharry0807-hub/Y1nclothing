import { StyleForm } from "@/components/StyleForm";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = { title: "新建款式 - 服装跟单智能工作台" };

export default async function NewStylePage() {
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("documents")
    .select("id,file_name")
    .order("upload_time", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <Link href="/styles" className="text-xs text-indigo-600 hover:underline">
          ← 返回款式库
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900">新建款式</h1>
        <p className="mt-1 text-sm text-slate-500">
          款式编号必填（如 24N1109PT4233），可关联一份已导入的原始资料。
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <StyleForm documents={documents ?? []} />
      </div>
    </div>
  );
}
