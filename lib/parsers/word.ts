import mammoth from "mammoth";
import WordExtractor from "word-extractor";

/** 解析 .docx（mammoth 提取纯文本） */
export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

/** 解析老版 .doc（word-extractor，读取 OLE 二进制格式） */
export async function parseDoc(buffer: Buffer): Promise<string> {
  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);
  return document.getBody() || "";
}
