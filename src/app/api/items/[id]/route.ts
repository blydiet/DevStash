import { NextResponse } from "next/server";
import { getItemDetail } from "@/lib/db/items";

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

  if (!item) {
    return NextResponse.json({ success: false, error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: item });
}
