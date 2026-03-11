import { NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkLoginRateLimit, retryAfterSeconds } from "@/lib/rate-limiter";

const handler = NextAuth(authOptions);

export const GET = handler;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  const { nextauth } = await ctx.params;

  // Rate-limit only the credentials sign-in callback
  if (nextauth?.join("/") === "callback/credentials") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (!checkLoginRateLimit(ip)) {
      const retryAfter = retryAfterSeconds(ip);
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }
  }

  return handler(req, ctx);
}
