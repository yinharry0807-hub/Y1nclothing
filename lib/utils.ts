export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatNumber(n?: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("zh-CN");
}

export function formatPrice(n?: number | null): string {
  if (n == null) return "—";
  return `¥${Number(n).toFixed(2)}`;
}

export function truncate(s: string | null | undefined, len = 80): string {
  if (!s) return "";
  return s.length > len ? s.slice(0, len) + "…" : s;
}

export const FILE_TYPE_LABELS: Record<string, string> = {
  xlsx: "Excel",
  xls: "Excel(旧版)",
  docx: "Word",
  doc: "Word(旧版)",
  pdf: "PDF",
  png: "图片",
  jpg: "图片",
  jpeg: "图片",
  webp: "图片",
  gif: "图片",
  bmp: "图片",
  jfif: "图片",
};

export function fileTypeLabel(ext: string): string {
  return FILE_TYPE_LABELS[ext.toLowerCase()] ?? ext.toUpperCase();
}

export const DOC_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  parsed: { label: "已解析", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  vision_pending: { label: "待视觉识别", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  failed: { label: "解析失败", className: "bg-red-50 text-red-700 ring-red-600/20" },
};

export const TRACKING_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  未下单: { label: "未下单", className: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  已下单: { label: "已下单", className: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  在途: { label: "在途", className: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  已到货: { label: "已到货", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
};

export const MILESTONE_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  已完成: { label: "已完成", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  进行中: { label: "进行中", className: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  待开始: { label: "待开始", className: "bg-slate-100 text-slate-500 ring-slate-500/20" },
};

export const STYLE_STATUS_OPTIONS = ["打样中", "大货生产", "已出货", "已停产", "暂停"];
export const TRACKING_STATUS_OPTIONS = ["未下单", "已下单", "在途", "已到货"];
export const MILESTONE_STATUS_OPTIONS = ["待开始", "进行中", "已完成"];
export const ORDER_STATUS_OPTIONS = ["草稿", "生产中", "已完成", "已取消"];

export const DEFAULT_MILESTONES = [
  "大货接单确认",
  "面料调拨",
  "辅料齐套",
  "缩水测试",
  "排唛与开货准备",
  "产前会",
  "裁床完成",
  "头缸制作与洗水",
  "客户批头缸",
  "大货洗水",
  "后整",
  "尾查+尺寸上传",
  "出货",
  "货期校验",
];

export function safeNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function safeDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
