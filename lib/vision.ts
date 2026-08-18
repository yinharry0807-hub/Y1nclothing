import type { SupabaseClient } from "@supabase/supabase-js";

/** 可在设置页切换的视觉模型列表（智谱 GLM 系列，OpenAI 兼容接口） */
export const VISION_MODEL_OPTIONS = [
  { label: "GLM-4V-flash（默认，速度快）", value: "glm-4v-flash" },
  { label: "GLM-4.1V-Thinking-Flash（思考增强）", value: "glm-4.1v-thinking-flash" },
  { label: "GLM-4.6V-Flash", value: "glm-4.6v-flash" },
  { label: "GLM-4.6V-FlashX", value: "glm-4.6v-flashx" },
  { label: "GLM-4.6V（最强）", value: "glm-4.6v" },
];

export const DEFAULT_VISION_MODEL = "glm-4v-flash";

export function isVisionConfigured(): boolean {
  return Boolean(process.env.VISION_MODEL_API_KEY);
}

export function getVisionBaseUrl(): string {
  return (
    process.env.VISION_MODEL_BASE_URL ||
    "https://open.bigmodel.cn/api/paas/v4"
  ).replace(/\/+$/, "");
}

/**
 * 读取当前选中的视觉模型：
 * 1) 数据库 app_settings（设置页切换，云端同步）
 * 2) 环境变量 VISION_MODEL_NAME
 * 3) 默认 glm-4v-flash
 */
export async function getCurrentVisionModel(
  supabase: SupabaseClient,
): Promise<string> {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "vision_model")
      .maybeSingle();
    const stored = data?.value?.model as string | undefined;
    if (stored) return stored;
  } catch {
    // 数据库不可用时回退到环境变量
  }
  return process.env.VISION_MODEL_NAME || DEFAULT_VISION_MODEL;
}

const DEFAULT_PROMPT =
  "请识别这张服装跟单图片中的所有文字，包括标题、表格、编号、数字、颜色、规格和备注。" +
  "按原始顺序输出，尽量保留表格结构。只输出识别到的内容，不要添加任何额外说明。";

/**
 * 调用 OpenAI 兼容的视觉模型识别图片文字（智谱 GLM-4V 系列）。
 */
export async function recognizeImage(
  buffer: Buffer,
  mime: string,
  model: string,
  prompt?: string,
): Promise<string> {
  const apiKey = process.env.VISION_MODEL_API_KEY;
  if (!apiKey) {
    throw new Error("未配置视觉模型 API Key（VISION_MODEL_API_KEY）");
  }

  const baseUrl = getVisionBaseUrl();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt ?? DEFAULT_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${buffer.toString("base64")}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`视觉模型调用失败（HTTP ${res.status}）：${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map((c: { text?: string }) => c?.text ?? "")
      .join("");
  }
  if (typeof content === "string") return content;
  throw new Error("视觉模型返回了无法识别的响应");
}

export const IMAGE_MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  jfif: "image/jpeg",
};
