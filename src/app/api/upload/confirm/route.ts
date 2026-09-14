import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  FILE_CONSTRAINTS,
  isSignatureVerifiable,
  kindForContentType,
  matchesFileSignature,
  SIGNATURE_CHECK_BYTE_LENGTH,
} from "@/lib/file-constraints";
import { deleteFromR2, extractKeyFromUrl, getR2ObjectHead, headR2Object } from "@/lib/r2";
import { checkRateLimit, rateLimitMessage, retryAfterSeconds } from "@/lib/rate-limit";

// kind is deliberately *not* read from the client here — it's derived from
// the object's real ContentType (verified via HeadObjectCommand) instead.
// ContentType was bound into the presigned request's signature, so the
// client could only have gotten a successful PUT by sending that exact
// header; trusting a client-supplied kind again at this step would let it
// claim "file" (10MB ceiling) for an object that was actually presigned and
// uploaded as "image" (5MB ceiling), bypassing the per-kind size limit.
//
// That signed ContentType only proves what the client *declared* though —
// not that the uploaded bytes are genuinely that type. For the types with a
// real byte signature (see file-constraints.ts), this route range-fetches
// just the first bytes and checks them before trusting the object at all.

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { success: withinLimit, reset } = await checkRateLimit("upload-confirm", session.user.id);

  if (!withinLimit) {
    return NextResponse.json(
      { success: false, error: rateLimitMessage(reset) },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(reset)) } }
    );
  }

  let body: { fileUrl?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid confirm request" }, { status: 400 });
  }

  if (typeof body.fileUrl !== "string") {
    return NextResponse.json({ success: false, error: "Invalid confirm request" }, { status: 400 });
  }

  let key: string;
  try {
    key = extractKeyFromUrl(body.fileUrl);
  } catch {
    return NextResponse.json({ success: false, error: "Invalid fileUrl" }, { status: 400 });
  }

  if (!key.startsWith(`${session.user.id}/`)) {
    return NextResponse.json({ success: false, error: "Upload not found" }, { status: 404 });
  }

  let object;
  try {
    object = await headR2Object(key);
  } catch (err) {
    console.error(`Failed to HEAD uploaded object at key ${key}:`, err);
    return NextResponse.json({ success: false, error: "Upload not found" }, { status: 404 });
  }

  const kind = kindForContentType(object.ContentType);
  // ContentLength being absent means R2 didn't tell us the real size, not
  // that the file is empty — treat "unknown" as invalid rather than
  // defaulting it to 0 and letting it pass the size check for free.
  const size = object.ContentLength;

  async function reject(message: string) {
    try {
      await deleteFromR2(key);
    } catch (err) {
      console.error(`Failed to delete rejected upload at key ${key}:`, err);
    }
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  if (!kind || size === undefined || size > FILE_CONSTRAINTS[kind].maxSizeBytes) {
    return reject("Upload rejected: file does not meet size/type requirements.");
  }

  if (object.ContentType && isSignatureVerifiable(object.ContentType)) {
    let head: Uint8Array;
    try {
      head = await getR2ObjectHead(key, SIGNATURE_CHECK_BYTE_LENGTH);
    } catch (err) {
      console.error(`Failed to read signature bytes for key ${key}:`, err);
      return reject("Upload rejected: could not verify file contents.");
    }
    if (!matchesFileSignature(head, object.ContentType)) {
      return reject("Upload rejected: file contents don't match the declared type.");
    }
  }

  return NextResponse.json({
    success: true,
    data: { fileUrl: body.fileUrl, fileSize: size, contentType: object.ContentType ?? null },
  });
}
