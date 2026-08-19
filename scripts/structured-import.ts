/**
 * 结构化资料导入（把桌面 Excel 转成正式的款式/订单/面料/辅料/产前版数据）
 * -----------------------------------------------------------------------
 * 数据来源：
 *   1) 商丘订单汇总表.xlsx          -> styles + orders + 辅料到货追踪
 *   2) 大货生产进度追踪表7.30.xlsx   -> styles + orders + order_milestones
 *   3) 辅料清单表_5款.xlsx           -> styles + orders + fabric_info + accessory_info
 *   4) halara大货生产辅料齐料追踪表  -> 辅料追踪状态更新
 *   5) HALARA 产前样资料/样办单*.xlsx -> preproduction 记录
 *
 * 用法：npm run structured:import
 * 依赖 .env 中 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import * as XLSX from "xlsx";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("缺少 Supabase 环境变量");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ARGS = process.argv.slice(2);
const ONLY_PREPRODUCTION = ARGS.includes("--only-preproduction");
const SKIP_PREPRODUCTION = ARGS.includes("--skip-preproduction");
const FOLDER_ARG = ARGS.find((a) => !a.startsWith("--"));
const ROOT = FOLDER_ARG ?? path.join(os.homedir(), "Desktop", "尹锐洋开发资料");

let styleUpserts = 0, styleHits = 0;
let orderUpserts = 0, orderHits = 0;
let fabricCount = 0, accessoryCount = 0, milestoneCount = 0, preproductionCount = 0;

// Supabase 返回 thenable（PostgrestBuilder）而非原生 Promise，脚本内用宽松类型
async function withRetry(fn: () => any, label: string): Promise<any> {
  let lastError: unknown;
  for (let i = 1; i <= 4; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < 4) {
        console.log(`  [重试 ${i}/4] ${label}`);
        await new Promise((r) => setTimeout(r, 1200 * i));
      }
    }
  }
  throw lastError;
}

const clean = (v: unknown): string => String(v ?? "").trim();
const num = (v: unknown): number | null => {
  const n = Number(String(v ?? "").replace(/[,，\s件pcs]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

/** Excel 序列日期 -> YYYY-MM-DD；也兼容 "2026-09-07" / "2026.8.13" / "9/15" */
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
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m2) {
    const year = new Date().getFullYear();
    return `${year}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

const STYLE_RE = /(AI\d{2}[A-Z]\d[A-Z]{2}\d{3,}[A-Za-z]*|\d{2}[A-Z]{1,2}\d{4}[A-Z]{2}\d{2,4}[A-Za-z]*)/;

function extractStyleNo(text: string): string | null {
  const m = text.match(STYLE_RE);
  return m ? m[1].toUpperCase() : null;
}

function extractFit(text: string): string | null {
  const m = text.match(/petite|regular|short|长裤|短裤/i);
  return m ? m[0].toLowerCase() : null;
}

async function upsertStyle(styleNo: string, extra: Record<string, unknown> = {}): Promise<string | null> {
  const key = styleNo.toUpperCase();
  const { data } = await withRetry(
    () => supabase.from("styles").select("id").eq("style_no", key).maybeSingle(),
    `查款式 ${key}`,
  );
  if (data?.id) {
    styleHits++;
    return data.id as string;
  }
  const { data: ins, error } = await withRetry(
    () => supabase.from("styles").insert({ style_no: key, ...extra }).select("id").single(),
    `建款式 ${key}`,
  );
  if (error) {
    // 并发下可能已存在
    const { data: again } = await supabase.from("styles").select("id").eq("style_no", key).maybeSingle();
    if (again?.id) return again.id as string;
    console.error(`  [款式失败] ${key}: ${error.message}`);
    return null;
  }
  styleUpserts++;
  return ins.id as string;
}

async function upsertOrder(o: {
  styleId: string;
  poNo: string;
  styleNo: string;
  fit?: string | null;
  colorway?: string | null;
  quantity?: number | null;
  targetQty?: number | null;
  deliveryDate?: string | null;
  productionType?: string | null;
  currentProgress?: string | null;
  riskLevel?: string | null;
  threadInfo?: string | null;
  fabricSummary?: string | null;
  orderNo?: string | null;
}): Promise<string | null> {
  const { data } = await withRetry(
    () =>
      supabase
        .from("orders")
        .select("id")
        .eq("po_no", o.poNo)
        .eq("style_id", o.styleId)
        .maybeSingle(),
    `查订单 ${o.poNo}`,
  );
  if (data?.id) {
    orderHits++;
    // 已存在订单：只覆盖传入的非空值，避免把已有数据清空
    const update: Record<string, unknown> = {};
    const map: Record<string, unknown> = {
      fit: o.fit, colorway: o.colorway, quantity: o.quantity, target_qty: o.targetQty,
      delivery_date: o.deliveryDate, production_type: o.productionType,
      current_progress: o.currentProgress, risk_level: o.riskLevel,
      thread_info: o.threadInfo, fabric_summary: o.fabricSummary, order_no: o.orderNo,
    };
    for (const [k, v] of Object.entries(map)) {
      if (v != null && v !== "") update[k] = v;
    }
    await supabase
      .from("orders")
      .update(update)
      .eq("id", data.id);
    return data.id as string;
  }
  const { data: ins, error } = await withRetry(
    () =>
      supabase
        .from("orders")
        .insert({
          style_id: o.styleId,
          style_no: o.styleNo,
          po_no: o.poNo,
          fit: o.fit,
          colorway: o.colorway,
          quantity: o.quantity,
          target_qty: o.targetQty,
          delivery_date: o.deliveryDate,
          production_type: o.productionType,
          current_progress: o.currentProgress,
          risk_level: o.riskLevel,
          thread_info: o.threadInfo,
          fabric_summary: o.fabricSummary,
          order_no: o.orderNo,
        })
        .select("id")
        .single(),
    `建订单 ${o.poNo}`,
  );
  if (error) {
    console.error(`  [订单失败] ${o.poNo}: ${error.message}`);
    return null;
  }
  orderUpserts++;
  return ins.id as string;
}

/** 从"进度/备注"文本推断辅料追踪状态 */
function inferTracking(text: string): string {
  const s = clean(text);
  if (/已备好|已到货|已到厂|到货/.test(s) && !/未到货/.test(s)) return "已到货";
  if (/在途|运输|寄出|快递/.test(s)) return "在途";
  if (/已下单|下单/.test(s)) return "已下单";
  if (/未下单|待确认|明日确认/.test(s)) return "未下单";
  return "未下单";
}

function emojiTracking(progress: string): string {
  const s = clean(progress);
  if (s.includes("🟢") || s.includes("已备好") || s.includes("🏭")) return "已到货";
  if (s.includes("🟡") || s.includes("运输")) return "在途";
  if (s.includes("🟠") || s.includes("已下单")) return "已下单";
  return "未下单";
}

async function importMasterOrders() {
  const file = path.join(ROOT, "商丘订单汇总表.xlsx");
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets["Sheet1"];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
  // 表头：0序号 1PO 2款号 3型号大小 4颜色 5合同数量 6目标裁数 7大货交货期
  // 8做工办 9主面料调拨数量 10预计面料到货 11代布 12朴 13线采购 14线到货
  // 15毛毡布 16洗水唛胶袋 17主唛到货 18主唛数量 19洗唛到货 20洗唛数量
  // 21拉链 22腰扣 23皮标 24唯一码贴纸 25吊牌贴纸 26客寄胶袋 27客寄吊牌
  const HEADER = ["PO","款号","型号大小","颜色","合同数量","目标裁数","大货交货期","做工办",
    "主面料调拨数量","预计面料到货时间","代布采购","朴采购","线采购","线到货",
    "毛毡布","洗水唛胶袋","主唛到货","主唛数量","洗唛到货","洗唛数量",
    "拉链","腰扣","皮标","唯一码贴纸","吊牌贴纸","客寄胶袋","客寄吊牌"];
  console.log("\n========== 1/5 商丘订单汇总表 ==========");
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const po = clean(r[1]);
    const styleRaw = clean(r[2]);
    const styleNo = extractStyleNo(styleRaw);
    if (!po || !styleNo) continue;
    const fit = clean(r[3]) || extractFit(styleRaw) || null;
    const colorway = clean(r[4]) || null;
    const qty = num(r[5]);
    const target = num(r[6]);
    const delivery = toDate(r[7]);
    const styleId = await upsertStyle(styleNo, { category: "牛仔裤" });
    if (!styleId) continue;
    const orderId = await upsertOrder({
      styleId, poNo: po, styleNo, fit, colorway, quantity: qty, targetQty: target,
      deliveryDate: delivery,
      currentProgress: clean(r[8]) ? `做工办：${clean(r[8])}` : null,
      fabricSummary: clean(r[9]) ? `主面料调拨：${clean(r[9])}（${clean(r[10])}）` : null,
    });
    if (!orderId) continue;

    // 辅料到货追踪（列 11-23 与表头对应）
    // [辅料名, 采购列, 到货列]
    const accMap: [string, number, number?][] = [
      ["代布", 11], ["朴", 12], ["线", 13, 14], ["毛毡布", 15], ["洗水唛胶袋", 16],
      ["主唛", 17, 18], ["洗唛", 19, 20], ["拉链", 21], ["腰扣", 22], ["皮标", 23],
      ["唯一码贴纸", 24], ["吊牌贴纸", 25], ["客寄胶袋", 26], ["客寄吊牌", 27],
    ];
    for (const [name, col, etaCol] of accMap) {
      const purchase = clean(r[col]);
      const eta = etaCol !== undefined ? clean(r[etaCol]) : "";
      const text = eta ? `${purchase}；到货：${eta}` : purchase;
      if (!text || text === "/" || text === "明日确认时间" || text.startsWith("；")) continue;
      const status = inferTracking(text);
      const { data: existing } = await supabase
        .from("accessory_info")
        .select("id")
        .eq("order_id", orderId)
        .eq("accessory_name", name)
        .maybeSingle();
      if (existing) {
        await supabase.from("accessory_info").update({ notes: text, tracking_status: status }).eq("id", existing.id);
        accessoryCount++;
      } else {
        const { error } = await supabase.from("accessory_info").insert({
          style_id: styleId, order_id: orderId, accessory_name: name,
          notes: text, tracking_status: status,
        });
        if (error) console.error(`  [辅料失败] ${name}: ${error.message}`);
        else accessoryCount++;
      }
    }
  }
  console.log(`订单 ${orderUpserts} 新建 / ${orderHits} 已存在；辅料 ${accessoryCount} 条`);
}

async function importProgressTracking() {
  const file = path.join(ROOT, "大货生产进度追踪表7.30.xlsx");
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets["大货进度追踪汇总表"];
  console.log("\n========== 2/5 大货生产进度追踪表 ==========");
  if (ws) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
    // 0序号 1款号 2PO号 3单号 4颜色 5数量（件） 6货期 7生产方式 8当前核心进度 9风险等级 10用线 11用布
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const styleNo = extractStyleNo(clean(r[1]));
      const po = clean(r[2]);
      if (!styleNo || !po) continue;
      const styleId = await upsertStyle(styleNo, { category: "牛仔裤" });
      if (!styleId) continue;
      const qtyText = clean(r[5]);
      let qty: number | null = null, target: number | null = null;
      const mQty = qtyText.match(/下单\s*(\d+)/);
      const mTarget = qtyText.match(/目标\s*(\d+)/);
      const mActual = qtyText.match(/实裁\s*(\d+)/);
      if (mQty) qty = Number(mQty[1]);
      if (mTarget) target = Number(mTarget[1]);
      if (!mQty && !mTarget && /^\d+$/.test(qtyText)) qty = Number(qtyText);
      await upsertOrder({
        styleId, poNo: po, styleNo, colorway: clean(r[4]) || null,
        orderNo: clean(r[3]) || null,
        quantity: qty, targetQty: target,
        deliveryDate: toDate(r[6]),
        productionType: clean(r[7]) || null,
        currentProgress: clean(r[8]) || null,
        riskLevel: clean(r[9]) || null,
        threadInfo: clean(r[10]) || null,
        fabricSummary: clean(r[11]) || null,
      });
    }
  }
  // 每个 PO 一个 sheet：流程节点 -> order_milestones
  for (const sheetName of wb.SheetNames) {
    if (sheetName === "大货进度追踪汇总表") continue;
    const ws2 = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws2, { header: 1, defval: "", raw: false });
    const po = clean(rows[0]?.[0]).match(/(\d{6,8})/)?.[1];
    if (!po) continue;
    const { data: order } = await supabase.from("orders").select("id").eq("po_no", po).maybeSingle();
    if (!order?.id) continue;
    let sort = 0;
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const node = clean(r[0]);
      if (!node || /流程节点/.test(node)) continue;
      const statusRaw = clean(r[1]);
      const status = statusRaw.includes("✅") ? "已完成" : statusRaw.includes("🔄") ? "进行中" : "待开始";
      const { error } = await supabase.from("order_milestones").upsert(
        {
          order_id: order.id, node_name: node, status,
          planned_time: clean(r[2]) || null, note: clean(r[3]) || null,
          sort_order: sort++,
        },
        { onConflict: "order_id,node_name" },
      );
      if (!error) milestoneCount++;
    }
  }
  console.log(`里程碑 ${milestoneCount} 条`);
}

async function importFabricAccessoryCard() {
  const file = path.join(ROOT, "辅料清单表_5款.xlsx（本地Excel文件）.xlsx");
  if (!(await fs.stat(file).catch(() => null))) return;
  const wb = XLSX.readFile(file);
  console.log("\n========== 3/5 辅料清单表_5款 ==========");
  let cardFabrics = 0, cardAccessories = 0;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
    const r0 = rows[0] as unknown[];
    // 第1行：0=单号/客人款号  3=品名  9=货期  12=总数量
    const po = clean(r0[0]).match(/(\d{6,8})/)?.[1] ?? null;
    const title = clean(r0[3]);
    const styleNo = extractStyleNo(title) ?? extractStyleNo(sheetName);
    if (!styleNo) continue;
    const totalQty = num(clean(r0[12]).match(/(\d+)/)?.[1]) ?? null;
    const delivery = toDate(clean(r0[9]).replace(/^货期[:：]?\s*/, "")) ?? null;
    const styleId = await upsertStyle(styleNo, { category: "牛仔裤" });
    if (!styleId) continue;
    let orderId: string | null = null;
    if (po) orderId = await upsertOrder({
      styleId, poNo: po, styleNo, quantity: totalQty, deliveryDate: delivery,
      colorway:
        title
          .replace(/^品名[:：]?\s*/, "")
          .replace(styleNo, "")
          .replace(/^\s*(petite|regular)\s*/i, "")
          .trim() || null,
    });
    // 数据行从第 5 行起（跳过 序号/用途 表头行）
    for (let i = 4; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const use = clean(r[1]);
      const materialCode = clean(r[2]);
      const name = clean(r[3]);
      if (!use || !name || /序号/.test(name)) continue;
      const colorway2 = clean(r[5]) || null;
      const spec = clean(r[6]) || null;
      const composition = clean(r[7]) || null;
      const unit = clean(r[8]) || null;
      const usage = clean(r[9]) || null;
      const total = clean(r[10]) || null;
      const notes = clean(r[11]) || null;
      const source = clean(r[12]) || null;
      const isFabric = use.includes("裁剪") && !/(拉链|纽扣|线|唛|胶袋|吊牌|皮标|贴纸)/.test(name);
      if (isFabric) {
        const category = /袋布/.test(name) ? "袋布" : /朴/.test(name) ? "朴" : /毛毡/.test(name) ? "毛毡布" : "主身布";
        const row = {
          style_id: styleId, order_id: orderId, material_code: materialCode || null,
          fabric_name: name, category, composition: composition || null,
          colorway: colorway2, unit: unit || null, usage_per_piece: usage || null,
          notes: notes || null, source: source || null, width: spec || null,
        };
        const { data: existingF } = await supabase
          .from("fabric_info")
          .select("id")
          .eq("style_id", styleId)
          .eq("fabric_name", name)
          .maybeSingle();
        const { error } = existingF?.id
          ? await supabase.from("fabric_info").update(row).eq("id", existingF.id)
          : await supabase.from("fabric_info").insert(row);
        if (error) console.error(`  [面料失败] ${name}: ${error.message}`);
        else if (!existingF?.id) {
          cardFabrics++;
          fabricCount++;
        }
      } else {
        const row = {
          style_id: styleId, order_id: orderId, material_code: materialCode || null,
          accessory_name: name, colorway: colorway2, spec: spec || null,
          unit: unit || null, usage_per_piece: usage || null,
          quantity: num(total), notes: notes || null, source: source || null,
          tracking_status: inferTracking(notes ?? ""),
        };
        const { data: existingA } = await supabase
          .from("accessory_info")
          .select("id")
          .eq("style_id", styleId)
          .eq("accessory_name", name)
          .maybeSingle();
        const { error } = existingA?.id
          ? await supabase.from("accessory_info").update(row).eq("id", existingA.id)
          : await supabase.from("accessory_info").insert(row);
        if (error) console.error(`  [辅料失败] ${name}: ${error.message}`);
        else if (!existingA?.id) {
          cardAccessories++;
          accessoryCount++;
        }
      }
    }
  }
  console.log(`面辅料卡：面料 ${cardFabrics} 条，辅料 ${cardAccessories} 条`);
}

async function importAccessoryTracking() {
  const file = path.join(ROOT, "halara大货生产辅料齐料追踪表.xlsx");
  if (!(await fs.stat(file).catch(() => null))) return;
  const wb = XLSX.readFile(file);
  console.log("\n========== 4/5 halara大货生产辅料齐料追踪表 ==========");
  let updated = 0;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
    const po = clean(sheetName).match(/(\d{6,8})/)?.[1];
    if (!po) continue;
    const { data: order } = await supabase.from("orders").select("id").eq("po_no", po).maybeSingle();
    if (!order?.id) continue;
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const name = clean(r[0]);
      const progress = clean(r[3]);
      if (!name || !progress || /洗前面|大货单|做工办|唛架|实样|扫粉样/.test(name)) continue;
      const status = emojiTracking(progress);
      const { data: orderAccs } = await supabase
        .from("accessory_info")
        .select("id,accessory_name")
        .eq("order_id", order.id);
      const existing = (orderAccs ?? []).find((a: any) =>
        a.accessory_name.includes(name.slice(0, 2)) || name.includes(a.accessory_name.slice(0, 2)),
      );
      if (existing) {
        await supabase.from("accessory_info").update({
          tracking_status: status, notes: clean(r[4]) || undefined,
        }).eq("id", existing.id);
        updated++;
      }
    }
  }
  console.log(`追踪状态更新 ${updated} 条`);
}

async function importPreproduction() {
  console.log("\n========== 5/5 HALARA 产前样资料（样办单） ==========");
  const base = path.join(ROOT, "HALARA 产前样资料");
  if (!(await fs.stat(base).catch(() => null))) return;
  async function walk(dir: string): Promise<string[]> {
    const out: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(full)));
      else if (/样办单.*\.xlsx$|板单.*\.xlsx$|办单.*\.xlsx$/.test(e.name)) out.push(full);
    }
    return out;
  }
  const files = await walk(base);
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const wb = XLSX.readFile(file);
    let sampleNo: string | null = null;
    let styleNo: string | null = null;
    for (const wsName of wb.SheetNames) {
      const ws = wb.Sheets[wsName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
      for (const r of rows.slice(0, 8)) {
        const text = (r as unknown[]).map(clean).join(" ");
        const m = text.match(/单据编号[:：]?\s*([^\s|]+)/);
        if (m) sampleNo = m[1];
        const s = extractStyleNo(text);
        if (s) styleNo = s;
      }
      if (sampleNo && styleNo) break;
    }
    if (!styleNo) {
      const fromName = extractStyleNo(path.basename(file));
      if (fromName) styleNo = fromName;
    }
    if (!styleNo) {
      console.log(`  [跳过] 找不到款号：${rel}`);
      continue;
    }
    const styleId = await upsertStyle(styleNo, { category: "牛仔裤" });
    if (!styleId) continue;
    const version = /第二次|第三次|第四次/.test(file)
      ? file.match(/第([一二三四五])次/)?.[1] + "次版" : "第一次版";
    // 优先从文件名提取日期；严格分隔符 + 校验月日范围，避免把 2026.08 拆错
    const dateMatch = (path.basename(file) + " " + rel).match(
      /(20\d{2})[.\-/年](\d{1,2})[.\-/月](\d{1,2})/,
    );
    let date: string | null = null;
    if (dateMatch) {
      const month = Number(dateMatch[2]);
      const day = Number(dateMatch[3]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
      }
    }
    const { error } = await supabase.from("preproduction").insert({
      style_id: styleId,
      sample_no: sampleNo ?? null,
      version,
      sample_date: date,
      notes: `来源文件：${rel}`,
    });
    if (error) console.error(`  [产前版失败] ${rel}: ${error.message}`);
    else preproductionCount++;
  }
  console.log(`产前版 ${preproductionCount} 条`);
}

async function main() {
  console.log(`资料根目录：${ROOT}`);
  if (!ONLY_PREPRODUCTION) {
    await importMasterOrders();
    await importProgressTracking();
    await importFabricAccessoryCard();
    await importAccessoryTracking();
  }
  if (!SKIP_PREPRODUCTION) {
    await importPreproduction();
  }
  console.log("\n================= 汇总 =================");
  console.log(`款式：新建 ${styleUpserts}，已有 ${styleHits}`);
  console.log(`订单：新建 ${orderUpserts}，已有 ${orderHits}`);
  console.log(`面料：${fabricCount}，辅料：${accessoryCount}`);
  console.log(`里程碑：${milestoneCount}，产前版：${preproductionCount}`);
  console.log("========================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
