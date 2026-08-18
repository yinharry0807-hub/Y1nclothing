import { requireAppAccess } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const { id } = await params;

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path,file_name")
    .eq("id", id)
    .single();

  if (!doc?.storage_path) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const { data: signed } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 3600, {
      download: doc.file_name,
    });

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "生成下载链接失败" }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
}
