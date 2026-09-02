import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/db/user";
import { DEFAULT_EDITOR_PREFERENCES, type EditorPreferences } from "@/lib/editor-preferences";
import { editorPreferencesPartialSchema, editorPreferencesSchema } from "@/lib/validations/editor-preferences";

// Thrown for reasons that are safe to surface to the client as-is (as opposed to a raw
// Prisma/internal error). Callers check `instanceof` rather than matching on message text,
// so rewording a message here can't silently drop it off an allowlist somewhere else.
export class EditorPreferencesError extends Error {}

function resolveStoredPreferences(userId: string, raw: unknown): EditorPreferences {
  if (raw === null) {
    // The common case for every account until this feature's first save — not a data
    // problem, so it doesn't warrant the same logging as a genuinely unparseable value.
    return DEFAULT_EDITOR_PREFERENCES;
  }

  const parsed = editorPreferencesSchema.safeParse(raw);

  if (!parsed.success) {
    console.warn(`Invalid stored editorPreferences for user ${userId}, falling back to defaults`, parsed.error);
    return DEFAULT_EDITOR_PREFERENCES;
  }

  return parsed.data;
}

export async function getEditorPreferences(): Promise<EditorPreferences> {
  const userId = await getCurrentUserId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  });

  // A valid session but no matching row means the account was deleted mid-session.
  if (!user) {
    throw new EditorPreferencesError("Account not found");
  }

  return resolveStoredPreferences(userId, user.editorPreferences);
}

export async function updateEditorPreferences(preferences: unknown): Promise<EditorPreferences> {
  const userId = await getCurrentUserId();

  // Accept (and validate) a partial update and merge it against what's currently stored,
  // rather than trusting the caller to always resend the full object — a caller that ever
  // sends just the one changed field shouldn't blow away the rest of the user's settings.
  const partialResult = editorPreferencesPartialSchema.safeParse(preferences);

  if (!partialResult.success) {
    throw new EditorPreferencesError(partialResult.error.issues[0]?.message ?? "Invalid preferences");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { editorPreferences: true },
  });

  if (!user) {
    throw new EditorPreferencesError("Account not found");
  }

  const current = resolveStoredPreferences(userId, user.editorPreferences);
  // Zod's .partial() keeps an explicit `{ theme: undefined }` as its own key rather than
  // stripping it (see editor-preferences.test.ts), so a naive spread here could overwrite
  // a real stored value with undefined. Only merge in keys that actually have a value.
  const definedUpdates = Object.fromEntries(
    Object.entries(partialResult.data).filter(([, value]) => value !== undefined)
  );
  const merged: EditorPreferences = { ...current, ...definedUpdates };

  const { count } = await prisma.user.updateMany({
    where: { id: userId },
    data: { editorPreferences: merged as unknown as Prisma.InputJsonValue },
  });

  if (count === 0) {
    throw new EditorPreferencesError("Account not found");
  }

  return merged;
}
