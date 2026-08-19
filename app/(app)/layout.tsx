import { AppShell } from "@/components/AppShell";
import { isAuthorized } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// 所有工作台页面强制动态渲染：数据实时从 Supabase 读取，禁止构建期静态预渲染
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorized = await isAuthorized();
  if (!authorized) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
