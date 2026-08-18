import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  hashPassword,
  verifyToken,
} from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password ?? "");
  const expected = process.env.APP_ACCESS_PASSWORD;

  if (!expected || !(await verifyToken(await hashPassword(password), expected))) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, await hashPassword(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });
  return res;
}
