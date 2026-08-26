import { NextResponse } from "next/server";
import { getItemDetail } from "@/lib/db/items-queries";
import { extractKeyFromUrl, getR2Object } from "@/lib/r2";
import { sanitizeFileName } from "@/lib/file-constraints";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let item;
  try {
    item = await getItemDetail(id);
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Failed to load item" }, { status: 500 });
  }

  if (!item || !item.fileUrl) {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }

  let object;
  try {
    object = await getR2Object(extractKeyFromUrl(item.fileUrl));
  } catch {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }

  if (!object.Body) {
    return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
  }

  const bytes = await object.Body.transformToByteArray();

  const safeFileName = sanitizeFileName(item.fileName ?? "download");

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeFileName}"`,
    },
  });
}
