/**
 * 本地文件夹批量导入脚本
 * -------------------------------------------
 * 用途：把桌面「尹锐洋开发资料」等本地文件夹中的 Excel/Word/PDF/图片
 *       一次性解析并上传到 Supabase（原文存入 documents 表，原文件存入 Storage）。
 * 原理：使用 service role key 直连数据库（仅本地运行，绝不用于前端）。
 *
 * 用法：
 *   npm run import:folder -- "C:\Users\15813\Desktop\尹锐洋开发资料"
 *   （不带参数时默认导入桌面「尹锐洋开发资料」）
 *
 * 要求 .env 中配置：
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * -------------------------------------------
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  ALLOWED_EXTENSIONS,
  getExtension,
  parseFile,
} from "../lib/parsers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SKIP_EXTENSIONS = ["dxf", "prj", "rul", "plt", "dwg"];

async function main() {
  const folderArg = process.argv[2];
  const folder = folderArg
    ? path.resolve(folderArg)
    : path.join(os.homedir(), "Desktop", "尹锐洋开发资料");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，请检查 .env");
    process.exit(1);
  }

  const stat = await fs.stat(folder).catch(() => null);
  if (!stat?.isDirectory()) {
    console.error(`文件夹不存在：${folder}`);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  // 确保存储桶存在
  const { error: bucketError } = await supabase.storage.getBucket("documents");
  if (bucketError) {
    await supabase.storage.createBucket("documents", { public: false });
  }

  // 收集支持的文件
  const files: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        const ext = getExtension(entry.name);
        if (ALLOWED_EXTENSIONS.includes(ext)) files.push(full);
      }
    }
  }
  await walk(folder);

  console.log(`\n扫描完成：${folder}`);
  console.log(`共 ${files.length} 个支持的文件\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relative = path.relative(folder, file).replace(/\\/g, "/");
    const ext = getExtension(file);

    // 已导入过的文件跳过（按原始路径去重）
    const { data: existing } = await supabase
      .from("documents")
      .select("id")
      .eq("source_path", relative)
      .maybeSingle();
    if (existing) {
      skipped++;
      console.log(`[跳过] 已存在：${relative}`);
      continue;
    }

    try {
      const buffer = await fs.readFile(file);
      const parsed = await parseFile(file, buffer);

      const storagePath = `bulk/${relative}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, buffer, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("documents").insert({
        file_name: path.basename(file),
        file_type: ext,
        file_size: buffer.length,
        original_text: parsed.text,
        storage_path: storagePath,
        status: parsed.status,
        source_path: relative,
      });
      if (insertError) throw insertError;

      ok++;
      console.log(
        `[导入] ${relative}（${parsed.status === "parsed" ? "已解析" : "待视觉识别"}）`,
      );
    } catch (e) {
      failed++;
      console.error(`[失败] ${relative}：${e instanceof Error ? e.message : e}`);
    }
  }

  console.log("\n================= 汇总 =================");
  console.log(`成功导入：${ok}`);
  console.log(`已存在跳过：${skipped}`);
  console.log(`失败：${failed}`);
  console.log("========================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
