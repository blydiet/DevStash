import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { setCollectionFavorite } from "@/lib/db/collections";
import { toggleCollectionFavoriteSchema } from "@/lib/validations/collections";
import type { ToggleCollectionFavoriteResponse } from "@/types/collections";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json<ToggleCollectionFavoriteResponse>(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ToggleCollectionFavoriteResponse>(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = toggleCollectionFavoriteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json<ToggleCollectionFavoriteResponse>(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  let collection;
  try {
    collection = await setCollectionFavorite(id, parsed.data.isFavorite);
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json<ToggleCollectionFavoriteResponse>(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    console.error(`Failed to update favorite for collection ${id}:`, err);
    return NextResponse.json<ToggleCollectionFavoriteResponse>(
      { success: false, error: "Failed to update favorite" },
      { status: 500 }
    );
  }

  if (!collection) {
    return NextResponse.json<ToggleCollectionFavoriteResponse>(
      { success: false, error: "Collection not found" },
      { status: 404 }
    );
  }

  return NextResponse.json<ToggleCollectionFavoriteResponse>({ success: true });
}
