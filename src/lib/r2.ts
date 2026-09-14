import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

let client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${getEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
      },
      // The AWS SDK v3 defaults to auto-attaching a flexible checksum (CRC32) to
      // requests, including presigned PutObject URLs. R2's presigned-URL
      // implementation doesn't reliably support that, and a plain browser
      // XHR PUT (see FileUpload.tsx) never sends the matching checksum header
      // the signature would then expect — silently producing a real
      // SignatureDoesNotMatch on upload. WHEN_REQUIRED opts back out.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return client;
}

// Short enough to bound a leaked/logged presigned URL's window, long enough
// for a real upload (including the request round-trip before the PUT starts).
const UPLOAD_URL_EXPIRES_IN_SECONDS = 5 * 60;

function getPublicUrlBase(): string {
  return getEnv("R2_PUBLIC_URL").replace(/\/$/, "");
}

export function buildObjectKey(userId: string, fileName: string): string {
  return `${userId}/${crypto.randomUUID()}-${fileName}`;
}

export function buildPublicUrl(key: string): string {
  return `${getPublicUrlBase()}/${key}`;
}

export function extractKeyFromUrl(url: string): string {
  const prefix = `${getPublicUrlBase()}/`;

  if (!url.startsWith(prefix)) {
    throw new Error(`"${url}" does not start with the configured R2_PUBLIC_URL`);
  }

  return url.slice(prefix.length);
}

// Signs ContentType/ContentDisposition into the request itself (via
// signableHeaders), not just onto the command object — otherwise neither is
// actually enforced on the real PUT, and a client could upload with any
// Content-Type it likes or drop the attachment disposition entirely. The
// latter is what forces an uploaded SVG to download instead of executing
// inline as a document when its raw public URL is visited directly; losing
// it here would silently reopen that. The caller must send the exact same
// Content-Type/Content-Disposition headers on the PUT or R2 will reject the
// request with a signature mismatch.
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  fileName: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getEnv("R2_BUCKET_NAME"),
    Key: key,
    ContentType: contentType,
    ContentDisposition: `attachment; filename="${fileName}"`,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
    signableHeaders: new Set(["content-type", "content-disposition"]),
  });
}

// A presigned PutObject URL carries no content-length constraint of its own —
// nothing stops a client from PUTting more bytes than it declared when the
// URL was requested. Callers use this after the client reports the upload
// finished, to verify the object actually landed with a plausible size
// before trusting it (see /api/upload/confirm).
export async function headR2Object(key: string) {
  return getR2Client().send(
    new HeadObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
    })
  );
}

const DELETE_RETRY_ATTEMPTS = 3;
const DELETE_RETRY_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retries transient failures (network blip, brief R2 hiccup) a few times
// before giving up — every caller in this codebase already treats a
// deleteFromR2 failure as best-effort (log and continue), so a single failed
// attempt previously meant the object was orphaned for good, with nothing
// left to catch it. This still isn't a full guarantee: an outage longer than
// these attempts span, or a request lost outright, still leaves an orphan.
// A bucket-level lifecycle/expiry rule configured in R2 itself is the real
// backstop for that — app-level retries can reduce how often it's needed,
// not eliminate the need for it.
export async function deleteFromR2(key: string): Promise<void> {
  for (let attempt = 1; attempt <= DELETE_RETRY_ATTEMPTS; attempt++) {
    try {
      await getR2Client().send(
        new DeleteObjectCommand({
          Bucket: getEnv("R2_BUCKET_NAME"),
          Key: key,
        })
      );
      return;
    } catch (err) {
      if (attempt === DELETE_RETRY_ATTEMPTS) throw err;
      await sleep(DELETE_RETRY_DELAY_MS * attempt);
    }
  }
}

export async function getR2Object(key: string) {
  return getR2Client().send(
    new GetObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
    })
  );
}

// Fetches only the first `byteLength` bytes via a Range request, not the
// whole object — used for file-signature verification, where a few hundred
// bytes is enough and pulling the full file through a Vercel Function would
// defeat the point of moving uploads off the request-body path.
export async function getR2ObjectHead(key: string, byteLength: number): Promise<Uint8Array> {
  const object = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
      Range: `bytes=0-${byteLength - 1}`,
    })
  );
  if (!object.Body) return new Uint8Array(0);
  return object.Body.transformToByteArray();
}
