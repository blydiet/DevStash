import { Prisma } from "@/generated/prisma/client";

const MAX_RETRIES = 5;

// A SERIALIZABLE transaction can lose a genuine race against another
// concurrent transaction (e.g. a double-click, or two legitimate concurrent
// requests) — Postgres aborts one side with a write-conflict/deadlock error,
// which Prisma surfaces as P2034 ("Transaction failed due to a write
// conflict or a deadlock. Please retry your transaction"). Prisma doesn't
// retry this automatically; per Prisma's own docs, the caller must. Retrying
// is the correct recovery here, not error-suppression — the loser only lost
// a race, it didn't do anything wrong. Any other error (including our own
// ItemLimitExceededError/CollectionLimitExceededError thrown inside the
// transaction body) is not P2034 and rethrows immediately, unretried.
export async function withSerializableRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
      if (!isRetryable || attempt === MAX_RETRIES) {
        throw err;
      }
    }
  }
  // Unreachable: the loop above always either returns or throws.
  throw new Error("withSerializableRetry: exhausted retries without a terminal throw");
}
