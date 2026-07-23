import { NextResponse } from "next/server";
import { getRecentCollections } from "@/lib/db/collections";
import { getItemTypes } from "@/lib/db/items";
import { getCurrentUser } from "@/lib/db/user";

export async function GET() {
  try {
    const [itemTypes, collections, currentUser] = await Promise.all([
      getItemTypes(),
      getRecentCollections(),
      getCurrentUser(),
    ]);

    return NextResponse.json({ itemTypes, collections, currentUser });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load sidebar data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}