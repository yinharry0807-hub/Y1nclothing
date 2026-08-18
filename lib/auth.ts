/** 单密码访问模式的 Cookie 名 */
export const ACCESS_COOKIE = "app_access";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

/** SHA-256 哈希（Web Crypto，Edge 与 Node 通用） */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyToken(
  token: string | undefined,
  password: string,
): Promise<boolean> {
  if (!token || !password) return false;
  const expected = await hashPassword(password);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
