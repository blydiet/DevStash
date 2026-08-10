import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function createVerificationToken(email: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token: hashToken(rawToken), expires },
  });

  return rawToken;
}

type PeekResult =
  | { valid: true; email: string }
  | { valid: false; reason: "invalid" }
  | { valid: false; reason: "expired"; email: string };

export async function peekVerificationToken(rawToken: string): Promise<PeekResult> {
  const hashedToken = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { token: hashedToken } });

  if (!record) {
    return { valid: false, reason: "invalid" };
  }

  if (record.expires < new Date()) {
    return { valid: false, reason: "expired", email: record.identifier };
  }

  return { valid: true, email: record.identifier };
}

type ConsumeResult =
  | { success: true; email: string }
  | { success: false; error: "invalid" }
  | { success: false; error: "expired"; email: string };

export async function consumeVerificationToken(rawToken: string): Promise<ConsumeResult> {
  const hashedToken = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { token: hashedToken } });

  if (!record) {
    return { success: false, error: "invalid" };
  }

  await prisma.verificationToken.delete({ where: { token: hashedToken } });

  if (record.expires < new Date()) {
    return { success: false, error: "expired", email: record.identifier };
  }

  return { success: true, email: record.identifier };
}
