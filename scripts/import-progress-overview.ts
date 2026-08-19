/**
 * 导入《Halara全部进度总览》里的真实进度数据（只取数据，不复制表格布局）
 *  - 大货订单生产进度汇总 -> orders：下单量/目标/实裁、生产进度、货期、欠、备注
 *  - 产前版进度汇总 / 开发板进度汇总 -> preproduction：办类、开单日、寄客日、
 *    布种、进度、备注（寄客日/要求寄办日期并入备注展示）
 * 用法：npm run import:overview -- "文件路径"
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("缺少 Supabase 环境变量");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FILE =
  process.argv[2] ??
  "D:\\xwechat_files\\wxid_j1gq2mvkdj2v22_5bac\\msg\\file\\2026-07\\Halara全部进度总览(1).xlsx";

const clean = (v: unknown): string => String(v ?? "").trim();
const STYLE_RE = /(AI\d{2}[A-Z]\d[A-Z]{2}\d{3,}[A-Za-z]*|\d{2}[A-Z]{1,2}\d{4}[A-Z]{2}\d{2,4}[A-Za-z]*)/;
function extractStyleNo(t: string): string | null {
  return t.match(STYLE_RE)?.[1]?.toUpperCase() ?? null;
}
function extractFit(t: string): string | null {
  return t.match(/petite|regular/i)?.[0]?.toLowerCase() ?? null;
}

/** "7-10" / "7/14" / "2026.8.11" / Excel序列 -> YYYY-MM-DD */
function toDate(v: unknown): string | null {
  const s = clean(v);
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = Number(s);
    if (serial > 20000 && serial < 80000) {
      const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
      if (!Number.isNaN(d.getTime())) {
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      }
    }
  }
  const m = s.match(/(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const m2 = s.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (m2) {
    const y = new Date().getFullYear();
    return `${y}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

function versionFromType(sampleType: string): string {
  if (/开发板/.test(sampleType)) return /第二次|复版/.test(sampleType) ? "开发板第二次" : "开发板";
  if (/第三/.test(sampleType)) return "第三次版";
  if (/第二次|复版/.test(sampleType)) return "第二次版";
  if (/首版|第一/.test(sampleType)) return "第一次版";
  return sampleType || "第一次版";
}

async function withRetry(fn: () => any, label: string): Promise<any> {
  let last: unknown;
  for (let i = 1; i <= 4; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i < 4) {
        console.log(`  [重试 ${i}/4] ${label}`);
        await new Promise((r) => setTimeout(r, 1200 * i));
      }
    }
  }
  throw last;
}

async function upsertStyle(styleNo: string, extra: Record<string, unknown> = {}): Promise<string | null> {
  const key = styleNo.toUpperCase();
  const { data } = await withRetry(
    () => supabase.from("styles").select("id").eq("style_no", key).maybeSingle(),
    `查款式 ${key}`,
  );
  if (data?.id) {
    if (extra.style_name || extra.category) {
      const patch: Record<string, unknown> = {};
      if (extra.style_name) patch.style_name = extra.style_name;
      if (extra.category) patch.category = extra.category;
      await supabase.from("styles").update(patch).eq("id", data.id);
    }
    return data.id;
  }
  const { data: ins, error } = await withRetry(
    () => supabase.from("styles").insert({ style_no: key, ...extra }).select("id").single(),
    `建款式 ${key}`,
  );
  if (error) {
    const { data: again } = await supabase.from("styles").select("id").eq("style_no", key).maybeSingle();
    if (again?.id) return again.id;
    console.error(`  [款式失败] ${key}: ${error.message}`);
    return null;
  }
  return ins.id;
}

async function upsertOrder(o: {
  styleId: string;
  poNo: string;
  styleNo: string;
  fit?: string | null;
  colorway?: string | null;
  quantity?: number | null;
  targetQty?: number | null;
  actualQty?: number | null;
  orderNo?: string | null;
  deliveryDate?: string | null;
  currentProgress?: string | null;
  notes?: string | null;
}): Promise<string | null> {
  const { data: existing } = await withRetry(
    () =>
      supabase.from("orders").select("id").eq("po_no", o.poNo).eq("style_id", o.styleId).maybeSingle(),
    `查订单 ${o.poNo}`,
  );
  const row: Record<string, unknown> = {
    style_id: o.styleId,
    style_no: o.styleNo,
    po_no: o.poNo,
  };
  for (const [k, v] of Object.entries({
    fit: o.fit, colorway: o.colorway, quantity: o.quantity, target_qty: o.targetQty,
    actual_qty: o.actualQty, order_no: o.orderNo, delivery_date: o.deliveryDate,
    current_progress: o.currentProgress,
  })) {
    if (v != null && v !== "") row[k] = v;
  }
  if (o.notes) {
    // 合并备注，避免覆盖已有内容
    const prev = existing?.id
      ? (await supabase.from("orders").select("notes").eq("id", existing.id).maybeSingle()).data?.notes
      : null;
    row.notes = prev ? `${prev}\n${o.notes}` : o.notes;
  }
  if (existing?.id) {
    await withRetry(
      () => supabase.from("orders").update(row).eq("id", existing.id),
      `更新订单 ${o.poNo}`,
    );
    return existing.id;
  }
  const { data: ins, error } = await withRetry(
    () => supabase.from("orders").insert(row).select("id").single(),
    `建订单 ${o.poNo}`,
  );
  if (error) {
    console.error(`  [订单失败] ${o.poNo}: ${error.message}`);
    return null;
  }
  return ins.id;
}

async function upsertPreproduction(p: {
  styleId: string;
  sampleNo: string;
  version: string;
  colorway?: string | null;
  sampleDate?: string | null;
  progress?: string | null;
  fabricSummary?: string | null;
  notes?: string | null;
}) {
  const { data: existing } = await withRetry(
    () =>
      supabase
        .from("preproduction")
        .select("id")
        .eq("style_id", p.styleId)
        .eq("sample_no", p.sampleNo)
        .maybeSingle(),
    `查产前版 ${p.sampleNo}`,
  );
  const row: Record<string, unknown> = {
    style_id: p.styleId,
    sample_no: p.sampleNo,
    version: p.version,
  };
  for (const [k, v] of Object.entries({
    colorway: p.colorway, sample_date: p.sampleDate, progress: p.progress,
    fabric_summary: p.fabricSummary, notes: p.notes,
  })) {
    if (v != null && v !== "") row[k] = v;
  }
  if (existing?.id) {
    await withRetry(
      () => supabase.from("preproduction").update(row).eq("id", existing.id),
      `更新产前版 ${p.sampleNo}`,
    );
    return;
  }
  const { error } = await withRetry(
    () => supabase.from("preproduction").insert(row),
    `建产前版 ${p.sampleNo}`,
  );
  if (error) console.error(`  [产前版失败] ${p.sampleNo}: ${error.message}`);
}

async function importOrders() {
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets["大货订单生产进度汇总"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
  console.log("\n========== 大货订单生产进度汇总 ==========");
  let n = 0;
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const styleNo = extractStyleNo(clean(r[1]));
    const po = clean(r[3]).match(/(\d{6,8})/)?.[1];
    if (!styleNo || !po) continue;
    const styleId = await upsertStyle(styleNo, { category: "牛仔裤" });
    if (!styleId) continue;
    const qtyText = clean(r[5]);
    const parts = qtyText.split("/");
    const qty = Number(parts[0]) || null;
    const target = Number(parts[1]) || null;
    const actualRaw = parts[2]?.replace(/[？?]/g, "");
    const actual = actualRaw ? Number(actualRaw) || null : null;
    const notes = [clean(r[8]), clean(r[9])].filter(Boolean).join("；") || null;
    await upsertOrder({
      styleId,
      poNo: po,
      styleNo,
      fit: extractFit(clean(r[1])),
      colorway: clean(r[4]) || null,
      quantity: qty,
      targetQty: target,
      actualQty: actual,
      orderNo: clean(r[2]) || null,
      deliveryDate: toDate(r[7]),
      currentProgress: clean(r[6]) || null,
      notes,
    });
    n++;
  }
  console.log(`大货订单更新/新建 ${n} 条`);
}

async function importSamples() {
  console.log("\n========== 产前版 / 开发板进度汇总 ==========");
  const wb = XLSX.readFile(FILE);
  let n = 0;
  for (const sheetName of ["产前版进度汇总", "开发板进度汇总"]) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const styleNo = extractStyleNo(clean(r[3]));
      const sampleNo = clean(r[6]);
      if (!styleNo || !sampleNo) continue;
      const styleId = await upsertStyle(styleNo, {
        category: "牛仔裤",
        style_name: clean(r[4]) || undefined,
      });
      if (!styleId) continue;
      const colorway = clean(r[5]).split("\n")[0]?.replace(/^颜色\d*[:：]\s*/, "") || null;
      const fabricCode = clean(r[12]);
      const fabricName = clean(r[13]);
      const notes = [
        clean(r[10]) ? `寄客日：${clean(r[10])}` : "",
        clean(r[14]) ? `要求寄办：${clean(r[14])}` : "",
        clean(r[11]) ? `备注：${clean(r[11])}` : "",
      ]
        .filter(Boolean)
        .join("；") || null;
      await upsertPreproduction({
        styleId,
        sampleNo,
        version: versionFromType(clean(r[7])),
        colorway,
        sampleDate: toDate(r[9]),
        progress: clean(r[8]) || null,
        fabricSummary: fabricCode || fabricName ? `布种：${fabricCode} ${fabricName}`.trim() : null,
        notes,
      });
      n++;
    }
  }
  console.log(`产前版/开发板更新或新建 ${n} 条`);
}

async function main() {
  console.log(`文件：${FILE}`);
  await importOrders();
  await importSamples();
  console.log("\n完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
