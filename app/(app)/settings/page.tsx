import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { CheckCircle2, Database, KeyRound, XCircle } from "lucide-react";
import { VisionModelSwitcher } from "@/components/VisionModelSwitcher";
import { getCurrentVisionModel, isVisionConfigured } from "@/lib/vision";

export const metadata = { title: "设置 - 服装跟单智能工作台" };

function EnvRow({
  label,
  value,
  configured,
  hint,
}: {
  label: string;
  value: string;
  configured: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="truncate text-xs text-slate-400">
          {configured ? value : "未配置"}
          {hint && ` · ${hint}`}
        </p>
      </div>
      {configured ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-slate-300" />
      )}
    </div>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 连接与数据量检测
  const [stylesCount, documentsCount, auditRows, visionModel] = await Promise.all([
    supabase.from("styles").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    supabase
      .from("audit_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(15),
    getCurrentVisionModel(supabase),
  ]);

  const dbConnected = stylesCount.error == null && documentsCount.error == null;

  const env = [
    {
      label: "Supabase URL",
      value: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      configured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project"),
      ),
    },
    {
      label: "Supabase anon key",
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      configured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder"),
      ),
    },
    {
      label: "DeepSeek API Key",
      value: process.env.DEEPSEEK_API_KEY ?? "",
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
      hint: "阶段2 AI 总结与助手",
    },
    {
      label: "视觉模型 API Key",
      value: process.env.VISION_MODEL_API_KEY ?? "",
      configured: Boolean(process.env.VISION_MODEL_API_KEY),
      hint: "阶段5 图片识别，填完即启用",
    },
    {
      label: "视觉模型名称",
      value: process.env.VISION_MODEL_NAME ?? "",
      configured: Boolean(process.env.VISION_MODEL_NAME),
      hint: "如 qwen-vl-max / gpt-4o / doubao-1.5-vision-pro",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">设置</h1>
        <p className="mt-1 text-sm text-slate-500">
          当前登录：{user?.email} · 所有增删改均写入审计日志，可随时回看。
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <KeyRound className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">环境变量状态</h2>
        </div>
        {env.map((e) => (
          <EnvRow key={e.label} {...e} />
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            AI 视觉模型（图片文字识别）
          </h2>
          <span className="text-xs text-slate-400">当前：{visionModel}</span>
        </div>
        <VisionModelSwitcher
          current={visionModel}
          configured={isVisionConfigured()}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Database className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            Supabase 连接检测
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4 px-4 py-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400">数据库连接</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                dbConnected ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {dbConnected ? "正常" : "失败"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">款式</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {stylesCount.count ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">资料文件</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {documentsCount.count ?? "—"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            最近操作记录（audit_log）
          </h2>
        </div>
        {auditRows.data && auditRows.data.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {auditRows.data.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                <span
                  className={`rounded px-1.5 py-0.5 font-medium ${
                    a.action === "INSERT"
                      ? "bg-emerald-50 text-emerald-700"
                      : a.action === "UPDATE"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  {a.action}
                </span>
                <span className="font-medium text-slate-700">{a.table_name}</span>
                <span className="truncate text-slate-400">
                  {a.new_data?.style_no ??
                    a.old_data?.style_no ??
                    a.new_data?.file_name ??
                    a.old_data?.file_name ??
                    a.record_id}
                </span>
                <span className="ml-auto shrink-0 text-slate-400">
                  {formatDateTime(a.changed_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            暂无操作记录（配置好 Supabase 并执行 schema.sql 后自动启用审计）。
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-xs leading-relaxed text-slate-500">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">部署提示</h2>
        1. 在 Supabase 执行 supabase/schema.sql，获取 URL 与 anon key 填入 .env；<br />
        2. 推送到 GitHub 仓库；<br />
        3. 在 Vercel 导入该仓库，填写同样的环境变量，自动部署即生效——以后每次推送 GitHub，
        Vercel 自动更新，多设备访问同一网址即数据同步。<br />
        详细步骤见项目 README。
      </section>
    </div>
  );
}
