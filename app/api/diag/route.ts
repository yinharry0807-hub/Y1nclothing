import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 临时诊断接口：测量 Netlify 函数到 Supabase 的真实耗时
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const t0 = performance.now();
  const supabase = await createClient();
  const t1 = performance.now();
  const { data, error } = await supabase
    .from("styles")
    .select("id")
    .limit(1);
  const t2 = performance.now();

  // 网络层探测：定位是 DNS / TLS / 路由问题
  async function probe(name: string, target: string): Promise<Record<string, unknown>> {
    const s = performance.now();
    try {
      const res = await fetch(target, { signal: AbortSignal.timeout(8000) });
      return {
        name,
        ok: res.ok,
        status: res.status,
        ms: Math.round(performance.now() - s),
      };
    } catch (e) {
      return {
        name,
        ok: false,
        ms: Math.round(performance.now() - s),
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const dnsResult = await import("node:dns/promises")
    .then((dns) =>
      dns
        .resolve4(new URL(url).hostname)
        .then((ips) => ({ ips: ips.slice(0, 4) }))
        .catch((e: unknown) => ({ dnsError: e instanceof Error ? e.message : String(e) })),
    )
    .catch(() => ({}));

  return NextResponse.json({
    createClientMs: Math.round(t1 - t0),
    queryMs: Math.round(t2 - t1),
    totalMs: Math.round(t2 - t0),
    queryError: error?.message ?? null,
    region: process.env.SUPABASE_REGION ?? "unknown",
    lambdaRegion: process.env.AWS_REGION ?? "unknown",
    dns: dnsResult,
    probes: await Promise.all([
      probe("supabase-root", url + "/"),
      probe("supabase-auth-health", url + "/auth/v1/health"),
      probe("github-control", "https://api.github.com/"),
    ]),
  });
}
