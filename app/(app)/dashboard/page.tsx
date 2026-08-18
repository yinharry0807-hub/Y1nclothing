import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import {
  ClipboardList,
  FolderOpen,
  PackageSearch,
  Plus,
  Shirt,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { DOC_STATUS_META, formatDateTime, truncate } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "工作台 - 服装跟单智能工作台" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const [stylesCount, fabricsCount, accessoriesCount, docs, styles] =
    await Promise.all([
      supabase
        .from("styles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("fabric_info")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("accessory_info")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("documents")
        .select(
          "id,file_name,file_type,status,file_size,upload_time,original_text",
        )
        .order("upload_time", { ascending: false })
        .limit(6),
      supabase
        .from("styles")
        .select("id,style_no,style_name,status,updated_at")
        .order("updated_at", { ascending: false })
        .limit(6),
    ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pendingVision =
    docs.data?.filter((d) => d.status === "vision_pending").length ?? 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">工作台</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user?.email} · 数据实时同步云端，所有修改自动留档
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/upload"
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Upload className="h-4 w-4" />
            导入资料
          </Link>
          <Link
            href="/styles/new"
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            新建款式
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="资料文件"
          value={docs.count ?? 0}
          icon={FolderOpen}
          href="/documents"
          hint={pendingVision > 0 ? `${pendingVision} 个图片待视觉识别` : undefined}
        />
        <StatCard
          label="款式"
          value={stylesCount.count ?? 0}
          icon={Shirt}
          href="/styles"
        />
        <StatCard
          label="面料记录"
          value={fabricsCount.count ?? 0}
          icon={ClipboardList}
          href="/styles"
        />
        <StatCard
          label="辅料记录"
          value={accessoriesCount.count ?? 0}
          icon={PackageSearch}
          href="/accessories"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">最近导入的资料</h2>
            <Link href="/documents" className="text-xs text-indigo-600 hover:underline">
              查看全部
            </Link>
          </div>
          {docs.data && docs.data.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-100">
                {docs.data.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/documents/${d.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {d.file_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {formatDateTime(d.upload_time)}
                          {d.original_text &&
                            ` · ${truncate(d.original_text, 60)}`}
                        </p>
                      </div>
                      <StatusBadge
                        label={DOC_STATUS_META[d.status]?.label ?? d.status}
                        className={DOC_STATUS_META[d.status]?.className}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="还没有导入资料"
              description="把 Excel / Word / PDF 拖进来，自动解析全文并保存原文件。"
              action={
                <Link
                  href="/upload"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  去导入
                </Link>
              }
            />
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">最近更新的款式</h2>
            <Link href="/styles" className="text-xs text-indigo-600 hover:underline">
              查看全部
            </Link>
          </div>
          {styles.data && styles.data.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-100">
                {styles.data.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/styles/${s.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {s.style_no}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {s.style_name || "未填写名称"} · 更新于{" "}
                          {formatDateTime(s.updated_at)}
                        </p>
                      </div>
                      <StatusBadge label={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              title="还没有款式档案"
              description="新建款式，或等阶段2接入 AI 后从资料自动归类。"
              action={
                <Link
                  href="/styles/new"
                  className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  新建款式
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
