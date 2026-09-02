import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EditorPreferencesError, getEditorPreferences } from "@/lib/db/editor-preferences";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const preferences = await getEditorPreferences();
    return NextResponse.json({ success: true, data: preferences });
  } catch (err) {
    if (err instanceof EditorPreferencesError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 404 });
    }
    console.error("Failed to load editor preferences", err);
    return NextResponse.json(
      { success: false, error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}
