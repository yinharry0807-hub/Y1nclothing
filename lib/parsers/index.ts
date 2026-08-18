import { parseExcel } from "./excel";
import { parseDocx, parseDoc } from "./word";
import { parsePdf } from "./pdf";

export type ParseResult = {
  text: string | null;
  status: "parsed" | "vision_pending";
};

export const ALLOWED_EXTENSIONS = [
  "xlsx",
  "xls",
  "docx",
  "doc",
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "jfif",
];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageExt(ext: string): boolean {
  return ["png", "jpg", "jpeg", "webp", "gif", "bmp", "jfif"].includes(ext);
}

/**
 * 解析文件：
 * - Excel/Word/PDF -> 提取原文，status = parsed
 * - 图片 -> 原文暂缺，status = vision_pending（阶段5接入视觉模型后识别）
 */
export async function parseFile(
  fileName: string,
  buffer: Buffer,
): Promise<ParseResult> {
  const ext = getExtension(fileName);

  if (ext === "xlsx" || ext === "xls") {
    return { text: parseExcel(buffer), status: "parsed" };
  }
  if (ext === "docx") {
    return { text: await parseDocx(buffer), status: "parsed" };
  }
  if (ext === "doc") {
    return { text: await parseDoc(buffer), status: "parsed" };
  }
  if (ext === "pdf") {
    return { text: await parsePdf(buffer), status: "parsed" };
  }
  if (isImageExt(ext)) {
    return { text: null, status: "vision_pending" };
  }

  throw new Error(`不支持的文件类型：${ext}`);
}
