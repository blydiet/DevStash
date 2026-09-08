import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCollection, getAllCollections } from "@/lib/db/collections";
import { createCollectionSchema } from "@/lib/validations/collections";
import { CollectionLimitExceededError } from "@/lib/subscription-limits";

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
    collection = await createCollection({ ...parsed.data, isPro: session.user.isPro });
  } catch (err) {
    if (err instanceof CollectionLimitExceededError) {
      return NextResponse.json(
        {
          success: false,
          error: "Free plan is limited to 3 collections. Upgrade to Pro for unlimited collections.",
        },
        { status: 403 }
      );
    }
    if (err instanceof Error && err.message === "Not authenticated") {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }
    // A write-conflict error reaching here already survived
    // withSerializableRetry's 5 retries inside createCollection — this is a
    // genuinely exhausted, terminal failure by this point, not a fresh
    // unhandled race, so folding it into the generic 500 below is correct.
    return NextResponse.json({ success: false, error: "Failed to create collection" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: collection });
}
