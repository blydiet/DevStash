import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db/with-serializable-retry";

function p2034() {
  return new Prisma.PrismaClientKnownRequestError("Transaction failed due to a write conflict or a deadlock", {
    code: "P2034",
    clientVersion: "test",
  });
}

describe("withSerializableRetry", () => {
  it("returns the result on the first successful attempt", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withSerializableRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on a real P2034 write-conflict error and succeeds on a later attempt", async () => {
    const fn = vi.fn().mockRejectedValueOnce(p2034()).mockResolvedValueOnce("ok");
    await expect(withSerializableRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on a non-P2034 error without retrying", async () => {
    const err = new Error("business rejection, e.g. ItemLimitExceededError");
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withSerializableRetry(fn)).rejects.toThrow(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a duck-typed { code: 'P2034' } object that isn't a real PrismaClientKnownRequestError instance", async () => {
    const fakeError = { code: "P2034", message: "looks like P2034 but isn't the real class" };
    const fn = vi.fn().mockRejectedValue(fakeError);
    await expect(withSerializableRetry(fn)).rejects.toBe(fakeError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up and rethrows after exhausting all retries on persistent P2034 errors", async () => {
    const fn = vi.fn().mockRejectedValue(p2034());
    await expect(withSerializableRetry(fn)).rejects.toMatchObject({ code: "P2034" });
    expect(fn).toHaveBeenCalledTimes(5);
  });
});
