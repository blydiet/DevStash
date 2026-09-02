import type { EditorPreferences } from "@/lib/editor-preferences";

export interface EditorPreferencesActionResult {
  success: boolean;
  data?: EditorPreferences;
  error?: string;
}
