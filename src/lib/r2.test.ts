import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  sendMock,
  PutObjectCommandMock,
  DeleteObjectCommandMock,
  GetObjectCommandMock,
  HeadObjectCommandMock,
  S3ClientMock,
  getSignedUrlMock,
} = vi.hoisted(() => {
  const sendMock = vi.fn();
  function makeCommandMock(type: string) {
    return vi.fn().mockImplementation(function CommandMock(
      this: { input: unknown; __type: string },
      input: unknown
    ) {
      this.input = input;
      this.__type = type;
    });
  }
  return {
    sendMock,
    PutObjectCommandMock: makeCommandMock("Put"),
    DeleteObjectCommandMock: makeCommandMock("Delete"),
    GetObjectCommandMock: makeCommandMock("Get"),
    HeadObjectCommandMock: makeCommandMock("Head"),
    S3ClientMock: vi.fn().mockImplementation(function S3ClientMock(this: { config: unknown }, config: unknown) {
      this.config = config;
      return { send: sendMock };
    }),
    getSignedUrlMock: vi.fn(),
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: PutObjectCommandMock,
  DeleteObjectCommand: DeleteObjectCommandMock,
  GetObjectCommand: GetObjectCommandMock,
  HeadObjectCommand: HeadObjectCommandMock,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

// r2.ts caches an S3Client in a module-level singleton, so any test relying
// on a static import would silently reuse whatever instance an earlier test
// already constructed — including its env-var-derived config — making
// assertions about that config (and about missing-env-var throws, which only
// fire on the *first* construction) order-dependent. Forcing a fresh module
// instance before every single test removes that dependency entirely rather
// than special-casing just the tests that happen to be sensitive to it.
let r2: typeof import("@/lib/r2");

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.resetModules();
  process.env.R2_ACCOUNT_ID = "acct";
  process.env.R2_ACCESS_KEY_ID = "key";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET_NAME = "bucket";
  process.env.R2_PUBLIC_URL = "https://public.example";
  r2 = await import("@/lib/r2");
});

describe("getR2Client config", () => {
  it("disables flexible-checksum auto-attachment for R2 compatibility", async () => {
    sendMock.mockResolvedValue({});

    await r2.deleteFromR2("key");

    expect(S3ClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
      })
    );
  });

  it("constructs the client once and reuses it across multiple calls", async () => {
    sendMock.mockResolvedValue({});

    await r2.deleteFromR2("key-1");
    await r2.headR2Object("key-2");
    await r2.getR2Object("key-3");

    expect(S3ClientMock).toHaveBeenCalledTimes(1);
  });
});

describe("buildObjectKey", () => {
  it("prefixes the sanitized file name with the user id and a uuid", () => {
    const key = r2.buildObjectKey("user-1", "photo.png");
    expect(key).toMatch(/^user-1\/[0-9a-f-]{36}-photo\.png$/);
  });
});

describe("buildPublicUrl / extractKeyFromUrl", () => {
  it("round-trips a key through a public URL", () => {
    const url = r2.buildPublicUrl("user-1/abc-photo.png");
    expect(url).toBe("https://public.example/user-1/abc-photo.png");
    expect(r2.extractKeyFromUrl(url)).toBe("user-1/abc-photo.png");
  });

  it("strips a trailing slash from R2_PUBLIC_URL before building a URL", () => {
    process.env.R2_PUBLIC_URL = "https://public.example/";
    expect(r2.buildPublicUrl("key")).toBe("https://public.example/key");
  });

  it("throws instead of silently returning the wrong key when the URL doesn't match R2_PUBLIC_URL", () => {
    expect(() => r2.extractKeyFromUrl("https://old-domain.example/user-1/abc-photo.png")).toThrow(
      /does not start with the configured R2_PUBLIC_URL/
    );
  });
});

describe("getPresignedUploadUrl", () => {
  it("signs a PutObjectCommand with content-type/content-disposition bound into the signature", async () => {
    getSignedUrlMock.mockResolvedValue("https://signed.example/upload");

    const url = await r2.getPresignedUploadUrl("user-1/abc-photo.png", "image/png", "photo.png");

    expect(PutObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
      ContentType: "image/png",
      ContentDisposition: 'attachment; filename="photo.png"',
    });
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ __type: "Put" }),
      { expiresIn: 5 * 60, signableHeaders: new Set(["content-type", "content-disposition"]) }
    );
    expect(url).toBe("https://signed.example/upload");
  });
});

describe("headR2Object", () => {
  it("sends a HeadObjectCommand with the bucket and key and returns the response", async () => {
    sendMock.mockResolvedValue({ ContentLength: 1234, ContentType: "image/png" });

    const result = await r2.headR2Object("user-1/abc-photo.png");

    expect(HeadObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
    });
    expect(result).toEqual({ ContentLength: 1234, ContentType: "image/png" });
  });

  it("propagates a NotFound rejection rather than swallowing it", async () => {
    const notFound = new Error("NotFound");
    sendMock.mockRejectedValue(notFound);

    await expect(r2.headR2Object("missing-key")).rejects.toThrow("NotFound");
  });
});

describe("deleteFromR2", () => {
  it("sends a DeleteObjectCommand with the bucket and key", async () => {
    sendMock.mockResolvedValue({});

    await r2.deleteFromR2("user-1/abc-photo.png");

    expect(DeleteObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("retries a transient failure and succeeds without throwing", async () => {
    vi.useFakeTimers();
    sendMock.mockRejectedValueOnce(new Error("network blip")).mockResolvedValueOnce({});

    const promise = r2.deleteFromR2("key");
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();

    expect(sendMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("throws after exhausting all retry attempts", async () => {
    vi.useFakeTimers();
    const err = new Error("R2 is down");
    sendMock.mockRejectedValue(err);

    const promise = r2.deleteFromR2("key");
    // Attach a rejection handler immediately so the eventual rejection isn't
    // reported as unhandled while fake timers are advanced below.
    const assertion = expect(promise).rejects.toThrow("R2 is down");
    await vi.runAllTimersAsync();
    await assertion;

    expect(sendMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

describe("getR2Object", () => {
  it("sends a GetObjectCommand with the bucket and key and returns the response", async () => {
    sendMock.mockResolvedValue({ Body: "stream", ContentType: "image/png" });

    const result = await r2.getR2Object("user-1/abc-photo.png");

    expect(GetObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
    });
    expect(result).toEqual({ Body: "stream", ContentType: "image/png" });
  });
});

describe("getR2ObjectHead", () => {
  it("sends a ranged GetObjectCommand and returns the byte array", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    sendMock.mockResolvedValue({ Body: { transformToByteArray: () => Promise.resolve(bytes) } });

    const result = await r2.getR2ObjectHead("user-1/abc-photo.png", 4);

    expect(GetObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
      Range: "bytes=0-3",
    });
    expect(result).toBe(bytes);
  });

  it("returns an empty array when the response has no body", async () => {
    sendMock.mockResolvedValue({});

    const result = await r2.getR2ObjectHead("key", 32);

    expect(result).toEqual(new Uint8Array(0));
  });
});

describe("getEnv throw path", () => {
  it("throws when R2_PUBLIC_URL is unset", () => {
    delete process.env.R2_PUBLIC_URL;
    expect(() => r2.buildPublicUrl("key")).toThrow("R2_PUBLIC_URL is not set");
  });

  it("throws when R2_BUCKET_NAME is unset", async () => {
    delete process.env.R2_BUCKET_NAME;
    await expect(r2.headR2Object("key")).rejects.toThrow("R2_BUCKET_NAME is not set");
  });

  it("throws when the R2 client's own credentials are unset", async () => {
    delete process.env.R2_ACCOUNT_ID;
    await expect(r2.headR2Object("key")).rejects.toThrow("R2_ACCOUNT_ID is not set");
  });
});
