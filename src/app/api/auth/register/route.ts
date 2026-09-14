import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

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
  } catch (err) {
    // The findUnique check above covers the common case; this only catches
    // the narrow TOCTOU race where a second request inserts the same email
    // between that check and this create (Prisma P2002). Any other error is
    // a genuine, unrelated failure and must not be reported as "email
    // exists" — that would mask the real problem.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    console.error("Failed to create user during registration:", err);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
