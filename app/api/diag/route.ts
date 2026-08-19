import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 临时诊断接口：测量 Netlify 函数到 Supabase 的真实耗时
export async function GET() {
  const t0 = performance.now();
  const supabase = await createClient();
  const t1 = performance.now();
  const { data, error } = await supabase
    .from("styles")
    .select("id")
    .limit(1);
  const t2 = performance.now();
  return NextResponse.json({
    createClientMs: Math.round(t1 - t0),
    queryMs: Math.round(t2 - t1),
    totalMs: Math.round(t2 - t0),
    queryError: error?.message ?? null,
    region: process.env.SUPABASE_REGION ?? "unknown",
    lambdaRegion: process.env.AWS_REGION ?? "unknown",
  });
}
