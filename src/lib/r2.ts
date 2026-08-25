import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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
    });
  }
  return client;
}

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

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
  fileName: string
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: `attachment; filename="${fileName}"`,
    })
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
    })
  );
}

export async function getR2Object(key: string) {
  return getR2Client().send(
    new GetObjectCommand({
      Bucket: getEnv("R2_BUCKET_NAME"),
      Key: key,
    })
  );
}
