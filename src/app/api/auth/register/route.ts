import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { sendVerificationEmail } from "@/lib/email";
import { isEmailVerificationEnabled } from "@/lib/feature-flags";
import { checkRateLimit, getClientIp, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  const ip = await getClientIp();
  const { success: withinLimit, reset } = await checkRateLimit("register", ip);

  if (!withinLimit) {
    return NextResponse.json(
      { success: false, error: rateLimitMessage(reset) },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(reset)) } }
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { success: false, error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const verificationEnabled = isEmailVerificationEnabled();

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: verificationEnabled ? null : new Date(),
      },
    });

    if (verificationEnabled) {
      try {
        await sendVerificationEmail(email, getAppUrl());
      } catch (err) {
        console.error("Failed to send verification email:", err);
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "A user with this email already exists" },
      { status: 409 }
    );
  }
}
