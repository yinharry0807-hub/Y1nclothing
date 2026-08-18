import * as XLSX from "xlsx";

const MAX_TEXT_LENGTH = 500_000;

/**
 * 解析 .xlsx / .xls（SheetJS 同时支持新旧两种格式）。
 * 每个工作表输出为：工作表名 + 逐行单元格（制表符分隔），保留真实表格结构。
 */
export function parseExcel(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const parts: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    parts.push(`【工作表：${sheetName}】`);
    for (const row of rows) {
      const line = (row as unknown[])
        .map((cell) => String(cell ?? "").trim())
        .join("\t")
        .replace(/\s+$/, "");
      if (line.trim()) parts.push(line);
    }
  }

  return parts.join("\n").slice(0, MAX_TEXT_LENGTH);
}
