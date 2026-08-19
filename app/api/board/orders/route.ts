import { requireAppAccess } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 从里程碑推导当前阶段（试缩水/裁剪/车缝/洗水/后整…） */
function deriveStage(
  milestones: Array<{ node_name: string; status: string }>,
  currentProgress: string | null,
): string {
  const inProgress = milestones.find((m) => m.status === "进行中");
  if (inProgress) return shortStage(inProgress.node_name);
  const done = milestones.filter((m) => m.status === "已完成");
  if (done.length > 0) return shortStage(done[done.length - 1].node_name);
  if (currentProgress) {
    for (const k of ["试缩水", "缩水", "裁床", "裁剪", "车缝", "洗水", "后整", "头缸", "产前会", "排唛", "辅料齐套", "接单"]) {
      if (currentProgress.includes(k)) return k;
    }
  }
  return "待开始";
}

function shortStage(node: string): string {
  if (node.includes("接单")) return "接单确认";
  if (node.includes("面料调拨")) return "面料调拨";
  if (node.includes("辅料齐套")) return "辅料齐套";
  if (node.includes("缩水")) return "试缩水";
  if (node.includes("排唛")) return "排唛开货";
  if (node.includes("产前会")) return "产前会";
  if (node.includes("裁床")) return "裁剪";
  if (node.includes("头缸")) return "头缸";
  if (node.includes("洗水")) return "洗水";
  if (node.includes("后整")) return "后整";
  if (node.includes("尾查")) return "尾查";
  if (node.includes("出货")) return "出货";
  if (node.includes("货期")) return "货期校验";
  return node;
}

function accessoryReadySummary(
  accs: Array<{ accessory_name: string; tracking_status: string; supplier?: string | null; material_code?: string | null; notes?: string | null }>,
): { ready: boolean; missing: string[]; summary: string } {
  const missing: string[] = [];
  const summary: string[] = [];
  for (const a of accs) {
    const name = a.accessory_name;
    const status = a.tracking_status || "未下单";
    summary.push(`${name}:${status}`);
    if (status !== "已到货") missing.push(`${name}(${status})`);
  }
  return { ready: missing.length === 0, missing, summary: summary.join("；") };
}

export async function GET() {
  const { supabase, authorized } = await requireAppAccess();
  if (!authorized) return NextResponse.json({ error: "未授权" }, { status: 401 });

  const { data: orders, error: orderErr } = await supabase
    .from("orders")
    .select("*, styles(style_no,style_name,brand,customer)")
    .order("order_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  const styleIds = [...new Set((orders ?? []).map((o) => o.style_id as string))];
  const orderIds = [...new Set((orders ?? []).map((o) => o.id as string))];

  const [{ data: fabrics }, { data: accessories }, { data: milestones }] =
    await Promise.all([
      styleIds.length
        ? supabase.from("fabric_info").select("*").in("style_id", styleIds).limit(2000)
        : Promise.resolve({ data: [] }),
      orderIds.length
        ? supabase
            .from("accessory_info")
            .select("*")
            .in("order_id", orderIds)
            .limit(3000)
        : Promise.resolve({ data: [] }),
      orderIds.length
        ? supabase
            .from("order_milestones")
            .select("*")
            .in("order_id", orderIds)
            .order("sort_order")
        : Promise.resolve({ data: [] }),
    ]);

  const fabricByStyle = new Map<string, any[]>();
  (fabrics ?? []).forEach((f) => {
    const arr = fabricByStyle.get(f.style_id) ?? [];
    arr.push(f);
    fabricByStyle.set(f.style_id, arr);
  });
  const accByOrder = new Map<string, any[]>();
  (accessories ?? []).forEach((a) => {
    if (!a.order_id) return;
    const arr = accByOrder.get(a.order_id) ?? [];
    arr.push(a);
    accByOrder.set(a.order_id, arr);
  });
  const accByStyle = new Map<string, any[]>();
  (accessories ?? []).forEach((a) => {
    if (a.order_id) return;
    const arr = accByStyle.get(a.style_id) ?? [];
    arr.push(a);
    accByStyle.set(a.style_id, arr);
  });
  const milestoneByOrder = new Map<string, any[]>();
  (milestones ?? []).forEach((m) => {
    const arr = milestoneByOrder.get(m.order_id) ?? [];
    arr.push(m);
    milestoneByOrder.set(m.order_id, arr);
  });

  const rows = (orders ?? []).map((o: any) => {
    const style = o.styles?.[0] ?? {};
    const orderAccs = [...(accByOrder.get(o.id) ?? []), ...(accByStyle.get(o.style_id) ?? [])];
    const orderMiles = milestoneByOrder.get(o.id) ?? [];
    const styleFabrics = fabricByStyle.get(o.style_id) ?? [];
    const findFabric = (category: string) =>
      styleFabrics.find((f) => (f.category ?? "").includes(category)) ?? null;
    const mainFabric = findFabric("主身布") ?? styleFabrics.find((f) => /牛仔面料|面料/.test(f.fabric_name)) ?? null;
    const pocket = findFabric("袋布");
    const interlining = findFabric("朴");
    const felt = findFabric("毛毡");
    const threadAcc = orderAccs.find((a) => /线/.test(a.accessory_name) && !/拉链/.test(a.accessory_name));
    const ready = accessoryReadySummary(orderAccs);
    const sizeBreakdown =
      typeof o.size_breakdown === "object" && o.size_breakdown
        ? o.size_breakdown
        : null;

    return {
      id: o.id,
      styleId: o.style_id,
      styleNo: style.style_no ?? o.style_no ?? "—",
      styleName: style.style_name ?? null,
      brand: style.brand ?? null,
      poNo: o.po_no ?? null,
      orderNo: o.order_no ?? null,
      fit: o.fit ?? null,
      colorway: o.colorway ?? null,
      quantity: o.quantity ?? null,
      targetQty: o.target_qty ?? null,
      actualQty: o.actual_qty ?? null,
      sizeBreakdown,
      orderDate: o.order_date ?? null,
      deliveryDate: o.delivery_date ?? null,
      productionType: o.production_type ?? null,
      currentProgress: o.current_progress ?? null,
      riskLevel: o.risk_level ?? null,
      status: o.status ?? "生产中",
      threadInfo: o.thread_info ?? null,
      fabricSummary: o.fabric_summary ?? null,
      notes: o.notes ?? null,
      mainFabric: mainFabric
        ? { code: mainFabric.material_code, name: mainFabric.fabric_name, colorway: mainFabric.colorway, supplier: mainFabric.supplier, notes: mainFabric.notes }
        : null,
      pocket: pocket ? { code: pocket.material_code, colorway: pocket.colorway, supplier: pocket.supplier } : null,
      interlining: interlining ? { code: interlining.material_code, colorway: interlining.colorway, supplier: interlining.supplier } : null,
      felt: felt ? { code: felt.material_code, colorway: felt.colorway, supplier: felt.supplier } : null,
      threadAcc: threadAcc
        ? { name: threadAcc.accessory_name, code: threadAcc.material_code, colorway: threadAcc.colorway, spec: threadAcc.spec, supplier: threadAcc.supplier, notes: threadAcc.notes, trackingStatus: threadAcc.tracking_status }
        : null,
      accessories: orderAccs.map((a) => ({
        id: a.id,
        name: a.accessory_name,
        code: a.material_code,
        colorway: a.colorway,
        spec: a.spec,
        supplier: a.supplier,
        notes: a.notes,
        trackingStatus: a.tracking_status ?? "未下单",
        expectedArrival: a.expected_arrival,
      })),
      accessoriesReady: ready.ready,
      accessoriesMissing: ready.missing,
      accessoriesSummary: ready.summary,
      stage: deriveStage(orderMiles, o.current_progress),
      milestones: orderMiles.map((m) => ({
        id: m.id,
        node: m.node_name,
        status: m.status,
        plannedTime: m.planned_time,
        note: m.note,
      })),
    };
  });

  return NextResponse.json({ rows });
}
