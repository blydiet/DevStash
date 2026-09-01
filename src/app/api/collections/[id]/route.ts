import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { deleteCollection, updateCollection } from "@/lib/db/collections";
import { updateCollectionSchema } from "@/lib/validations/collections";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const parsed = updateCollectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let collection;
  try {
    collection = await updateCollection(id, parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Failed to update collection" }, { status: 500 });
  }

  if (!collection) {
    return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: collection });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  let deleted;
  try {
    deleted = await deleteCollection(id);
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Failed to delete collection" }, { status: 500 });
  }

  if (!deleted) {
    return NextResponse.json({ success: false, error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
