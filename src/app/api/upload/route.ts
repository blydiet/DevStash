import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { validateFile, sanitizeFileName, type UploadKind } from "@/lib/file-constraints";
import { buildObjectKey, buildPublicUrl, uploadToR2 } from "@/lib/r2";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");

  if (!(file instanceof File) || (kind !== "image" && kind !== "file")) {
    return NextResponse.json({ success: false, error: "Invalid upload request" }, { status: 400 });
  }

  const validationError = validateFile(kind as UploadKind, file.name, file.type, file.size);

  if (validationError) {
    return NextResponse.json({ success: false, error: validationError }, { status: 400 });
  }

  const sanitizedName = sanitizeFileName(file.name);
  const key = buildObjectKey(session.user.id, sanitizedName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadToR2(key, buffer, file.type || "application/octet-stream", sanitizedName);

  return NextResponse.json({
    success: true,
    data: { fileUrl: buildPublicUrl(key), fileName: file.name, fileSize: file.size },
  });
}
