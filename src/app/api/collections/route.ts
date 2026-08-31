import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCollection, getAllCollections } from "@/lib/db/collections";
import { createCollectionSchema } from "@/lib/validations/collections";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const collections = await getAllCollections();

  return NextResponse.json({ success: true, data: collections });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createCollectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let collection;
  try {
    collection = await createCollection(parsed.data);
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "Failed to create collection" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: collection });
}
