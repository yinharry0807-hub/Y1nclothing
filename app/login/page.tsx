"use client";

import { useRouter } from "next/navigation";
import { Lock, LogIn } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("请输入访问密码");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "密码错误");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">服装跟单智能工作台</h1>
          <p className="mt-2 text-sm text-slate-400">输入访问密码进入工作台</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-2 text-slate-500">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">访问密码</span>
          </div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            placeholder="请输入密码"
          />

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "验证中…" : "进入工作台"}
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            单密码模式：无需注册账号，密码在环境变量 APP_ACCESS_PASSWORD 中配置。
            <br />
            数据实时同步云端，退出登录不影响数据。
          </p>
        </form>
      </div>
    </div>
  );
}
