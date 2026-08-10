import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type VerificationTokenPurpose = "email-verification" | "password-reset";

function hashToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function namespacedIdentifier(purpose: VerificationTokenPurpose, email: string) {
  return `${purpose}:${email}`;
}

export async function createVerificationToken(purpose: VerificationTokenPurpose, email: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  const identifier = namespacedIdentifier(purpose, email);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: hashToken(rawToken), expires },
  });

  return rawToken;
}

type PeekResult =
  | { valid: true; email: string }
  | { valid: false; reason: "invalid" }
  | { valid: false; reason: "expired"; email: string };

export async function peekVerificationToken(
  purpose: VerificationTokenPurpose,
  rawToken: string
): Promise<PeekResult> {
  const hashedToken = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { token: hashedToken } });

  if (!record || !record.identifier.startsWith(`${purpose}:`)) {
    return { valid: false, reason: "invalid" };
  }

  const email = record.identifier.slice(purpose.length + 1);

  if (record.expires < new Date()) {
    return { valid: false, reason: "expired", email };
  }

  return { valid: true, email };
}

type ConsumeResult =
  | { success: true; email: string }
  | { success: false; error: "invalid" }
  | { success: false; error: "expired"; email: string };

export async function consumeVerificationToken(
  purpose: VerificationTokenPurpose,
  rawToken: string
): Promise<ConsumeResult> {
  const hashedToken = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { token: hashedToken } });

  if (!record || !record.identifier.startsWith(`${purpose}:`)) {
    return { success: false, error: "invalid" };
  }

  const email = record.identifier.slice(purpose.length + 1);

  await prisma.verificationToken.delete({ where: { token: hashedToken } });

  if (record.expires < new Date()) {
    return { success: false, error: "expired", email };
  }

  return { success: true, email };
}
