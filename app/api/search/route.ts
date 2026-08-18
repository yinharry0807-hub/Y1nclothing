import { requireUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function sanitize(q: string): string {
  return q.replace(/[%_,()*"\\]/g, " ").trim();
}

export async function GET(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawQ = url.searchParams.get("q")?.trim() ?? "";
  if (!rawQ) {
    return NextResponse.json({ groups: [] });
  }

  const q = sanitize(rawQ);
  const like = `%${q}%`;

  const [stylesRes, fabricsRes, accessoriesRes, ordersRes, docsRes] =
    await Promise.all([
      supabase
        .from("styles")
        .select("id,style_no,style_name,customer_style_no,status")
        .or(`style_no.ilike.${like},style_name.ilike.${like},customer_style_no.ilike.${like}`)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("fabric_info")
        .select(
          "id,style_id,fabric_name,composition,supplier,usage_per_piece,width,colorway",
        )
        .or(`fabric_name.ilike.${like},composition.ilike.${like},supplier.ilike.${like},material_code.ilike.${like}`)
        .limit(8),
      supabase
        .from("accessory_info")
        .select(
          "id,style_id,accessory_name,spec,supplier,tracking_status,quantity,expected_arrival,actual_arrival",
        )
        .or(`accessory_name.ilike.${like},spec.ilike.${like},supplier.ilike.${like},material_code.ilike.${like}`)
        .limit(8),
      supabase
        .from("orders")
        .select("id,style_id,po_no,order_no,colorway,quantity,delivery_date,status")
        .or(`po_no.ilike.${like},order_no.ilike.${like},colorway.ilike.${like}`)
        .limit(8),
      supabase
        .from("documents")
        .select("id,file_name,file_type,upload_time")
        .or(`file_name.ilike.${like},original_text.ilike.${like}`)
        .order("upload_time", { ascending: false })
        .limit(5),
    ]);

  const styles = stylesRes.data ?? [];
  const fabrics = fabricsRes.data ?? [];
  const accessories = accessoriesRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const documents = docsRes.data ?? [];

  // 面料/辅料/大货单命中时，补齐对应款式的编号
  const relatedStyleIds = [
    ...new Set([
      ...fabrics.map((f) => f.style_id),
      ...accessories.map((a) => a.style_id),
      ...orders.map((o) => o.style_id),
    ]),
  ];
  const styleMap = new Map<string, { style_no: string }>();
  if (relatedStyleIds.length > 0) {
    const { data: related } = await supabase
      .from("styles")
      .select("id,style_no")
      .in("id", relatedStyleIds);
    (related ?? []).forEach((s) => styleMap.set(s.id, s));
  }

  const groups: Array<{
    key: string;
    label: string;
    icon: string;
    items: Array<{ id: string; title: string; subtitle?: string; href: string }>;
  }> = [];

  if (styles.length > 0) {
    groups.push({
      key: "styles",
      label: "款式",
      icon: "style",
      items: styles.map((s) => ({
        id: s.id,
        title: s.style_no,
        subtitle: [s.style_name, s.customer_style_no, s.status]
          .filter(Boolean)
          .join(" · "),
        href: `/styles/${s.id}`,
      })),
    });
  }

  if (fabrics.length > 0) {
    groups.push({
      key: "fabrics",
      label: "面料",
      icon: "fabric",
      items: fabrics.map((f) => ({
        id: f.id,
        title: f.fabric_name,
        subtitle: [
          styleMap.get(f.style_id)?.style_no,
          f.composition,
          f.usage_per_piece ? `用量/件 ${f.usage_per_piece}` : null,
          f.supplier ? `供应商 ${f.supplier}` : null,
          f.colorway,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/styles/${f.style_id}#fabrics`,
      })),
    });
  }

  if (accessories.length > 0) {
    groups.push({
      key: "accessories",
      label: "辅料",
      icon: "accessory",
      items: accessories.map((a) => ({
        id: a.id,
        title: a.accessory_name,
        subtitle: [
          styleMap.get(a.style_id)?.style_no,
          a.spec,
          a.supplier ? `供应商 ${a.supplier}` : null,
          a.tracking_status,
          a.expected_arrival ? `预计到货 ${a.expected_arrival}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/styles/${a.style_id}#accessories`,
      })),
    });
  }

  if (orders.length > 0) {
    groups.push({
      key: "orders",
      label: "大货单",
      icon: "order",
      items: orders.map((o) => ({
        id: o.id,
        title: `${o.po_no || o.order_no || "PO"} ${o.colorway ?? ""}`.trim(),
        subtitle: [
          styleMap.get(o.style_id)?.style_no,
          o.quantity ? `${o.quantity} 件` : null,
          o.delivery_date ? `货期 ${o.delivery_date}` : null,
          o.status,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/styles/${o.style_id}#orders`,
      })),
    });
  }

  if (documents.length > 0) {
    groups.push({
      key: "documents",
      label: "资料",
      icon: "document",
      items: documents.map((d) => ({
        id: d.id,
        title: d.file_name,
        subtitle: `上传于 ${d.upload_time}`,
        href: `/documents/${d.id}`,
      })),
    });
  }

  return NextResponse.json({ groups });
}
