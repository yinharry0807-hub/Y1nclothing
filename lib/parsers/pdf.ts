import pdf from "pdf-parse";

/** 解析 PDF 文本层（扫描件无文本层时返回空，留待视觉模型识别） */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return (data.text || "").slice(0, 500_000);
  } catch {
    return "";
  }
}
