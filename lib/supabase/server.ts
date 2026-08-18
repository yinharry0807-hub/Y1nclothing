import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, verifyToken } from "@/lib/auth";

/**
 * 单密码模式：服务端使用 service role key 访问数据库（绕过 RLS，
 * 访问控制由 APP_ACCESS_PASSWORD 单密码 + 中间件统一把关）。
 */
export async function createClient(): Promise<SupabaseClient> {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function isAuthorized(): Promise<boolean> {
  const password = process.env.APP_ACCESS_PASSWORD;
  if (!password) return false;
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(ACCESS_COOKIE)?.value, password);
}

export async function requireAppAccess() {
  const supabase = await createClient();
  const authorized = await isAuthorized();
  return { supabase, authorized };
}
