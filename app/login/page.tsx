"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!email.trim() || password.length < 6) {
      setError("请输入邮箱和至少 6 位密码");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setNotice(
          "注册成功！如果 Supabase 开启了邮箱验证，请先到邮箱点击确认链接；否则直接登录。",
        );
        setMode("login");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "操作失败，请检查网络与 Supabase 配置";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">服装跟单智能工作台</h1>
          <p className="mt-2 text-sm text-slate-400">
            款式 · 面料 · 辅料 · 大货单 · 产前版，一个资料库全搞定
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-5 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                  setNotice("");
                }}
                className={cn(
                  "rounded-md py-2 text-sm font-medium transition",
                  mode === m
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {m === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                placeholder="至少 6 位"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "处理中…" : mode === "login" ? "登录" : "注册"}
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            首次使用请先注册（需在 Supabase 开启 Email 注册）。
            <br />
            数据实时同步云端，退出或清理浏览器缓存均不影响。
          </p>
        </div>
      </div>
    </div>
  );
}
