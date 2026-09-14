import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateFile, sanitizeFileName, type UploadKind } from "@/lib/file-constraints";
import { buildObjectKey, buildPublicUrl, getPresignedUploadUrl } from "@/lib/r2";
import { checkRateLimit, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";
import { isProOnlyItemType } from "@/lib/subscription-limits";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { success: withinLimit, reset } = await checkRateLimit("upload", session.user.id);

  if (!withinLimit) {
    return NextResponse.json(
      { success: false, error: rateLimitMessage(reset) },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(reset)) } }
    );
  }

  let body: { fileName?: unknown; mimeType?: unknown; size?: unknown; kind?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid upload request" }, { status: 400 });
  }

  const { fileName, mimeType, size, kind } = body;

  if (
    typeof fileName !== "string" ||
    typeof mimeType !== "string" ||
    typeof size !== "number" ||
    (kind !== "image" && kind !== "file")
  ) {
    return NextResponse.json({ success: false, error: "Invalid upload request" }, { status: 400 });
  }

  // This only validates the *declared* name/type/size, since the server never
  // sees the real bytes in a presigned-upload flow — /api/upload/confirm
  // re-checks the real size (and re-derives kind from the real ContentType R2
  // reports back) once the object actually exists.
  const validationError = validateFile(kind as UploadKind, fileName, mimeType, size);

  if (validationError) {
    return NextResponse.json({ success: false, error: validationError }, { status: 400 });
  }

  if (isProOnlyItemType(kind) && !session.user.isPro) {
    return NextResponse.json(
      { success: false, error: `Upgrade to Pro to upload ${kind}s.` },
      { status: 403 }
    );
  }

  const sanitizedName = sanitizeFileName(fileName);
  const contentType = mimeType || "application/octet-stream";
  const key = buildObjectKey(session.user.id, sanitizedName);

  const uploadUrl = await getPresignedUploadUrl(key, contentType, sanitizedName);

  return NextResponse.json({
    success: true,
    data: {
      uploadUrl,
      fileUrl: buildPublicUrl(key),
      fileName: sanitizedName,
      contentType,
    },
  });
}
