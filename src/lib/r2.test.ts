import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildObjectKey,
  buildPublicUrl,
  deleteFromR2,
  extractKeyFromUrl,
  getR2Object,
  uploadToR2,
} from "@/lib/r2";

const { sendMock, PutObjectCommandMock, DeleteObjectCommandMock, GetObjectCommandMock, S3ClientMock } =
  vi.hoisted(() => {
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
      S3ClientMock: vi.fn().mockImplementation(function S3ClientMock() {
        return { send: sendMock };
      }),
    };
  });

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: PutObjectCommandMock,
  DeleteObjectCommand: DeleteObjectCommandMock,
  GetObjectCommand: GetObjectCommandMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.R2_ACCOUNT_ID = "acct";
  process.env.R2_ACCESS_KEY_ID = "key";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET_NAME = "bucket";
  process.env.R2_PUBLIC_URL = "https://public.example";
});

describe("buildObjectKey", () => {
  it("prefixes the sanitized file name with the user id and a uuid", () => {
    const key = buildObjectKey("user-1", "photo.png");
    expect(key).toMatch(/^user-1\/[0-9a-f-]{36}-photo\.png$/);
  });
});

describe("buildPublicUrl / extractKeyFromUrl", () => {
  it("round-trips a key through a public URL", () => {
    const url = buildPublicUrl("user-1/abc-photo.png");
    expect(url).toBe("https://public.example/user-1/abc-photo.png");
    expect(extractKeyFromUrl(url)).toBe("user-1/abc-photo.png");
  });

  it("strips a trailing slash from R2_PUBLIC_URL before building a URL", () => {
    process.env.R2_PUBLIC_URL = "https://public.example/";
    expect(buildPublicUrl("key")).toBe("https://public.example/key");
  });

  it("throws instead of silently returning the wrong key when the URL doesn't match R2_PUBLIC_URL", () => {
    expect(() => extractKeyFromUrl("https://old-domain.example/user-1/abc-photo.png")).toThrow(
      /does not start with the configured R2_PUBLIC_URL/
    );
  });
});

describe("uploadToR2", () => {
  it("sends a PutObjectCommand with the bucket, key, body, content type, and a forced-download disposition", async () => {
    sendMock.mockResolvedValue({});

    await uploadToR2("user-1/abc-photo.png", Buffer.from("data"), "image/png", "photo.png");

    expect(PutObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
      Body: Buffer.from("data"),
      ContentDisposition: 'attachment; filename="photo.png"',
      ContentType: "image/png",
    });
    expect(sendMock).toHaveBeenCalled();
  });
});

describe("deleteFromR2", () => {
  it("sends a DeleteObjectCommand with the bucket and key", async () => {
    sendMock.mockResolvedValue({});

    await deleteFromR2("user-1/abc-photo.png");

    expect(DeleteObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
    });
  });
});

describe("getR2Object", () => {
  it("sends a GetObjectCommand with the bucket and key and returns the response", async () => {
    sendMock.mockResolvedValue({ Body: "stream", ContentType: "image/png" });

    const result = await getR2Object("user-1/abc-photo.png");

    expect(GetObjectCommandMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Key: "user-1/abc-photo.png",
    });
    expect(result).toEqual({ Body: "stream", ContentType: "image/png" });
  });
});
