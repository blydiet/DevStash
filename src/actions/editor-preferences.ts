"use server";

import { auth } from "@/auth";
import { EditorPreferencesError, updateEditorPreferences as updateEditorPreferencesInDb } from "@/lib/db/editor-preferences";
import type { EditorPreferences } from "@/lib/editor-preferences";
import type { EditorPreferencesActionResult } from "@/types/editor-preferences";

export async function updateEditorPreferences(
  preferences: Partial<EditorPreferences>
): Promise<EditorPreferencesActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const data = await updateEditorPreferencesInDb(preferences);
    return { success: true, data };
  } catch (err) {
    if (err instanceof EditorPreferencesError) {
      return { success: false, error: err.message };
    }
    // Also catches auth() itself throwing (e.g. a session decrypt failure) — this is a
    // Server Action, so it must return a result rather than let an exception cross the
    // client/server boundary uncaught.
    console.error("Failed to save editor preferences", err);
    return { success: false, error: "Failed to save preferences" };
  }
}
