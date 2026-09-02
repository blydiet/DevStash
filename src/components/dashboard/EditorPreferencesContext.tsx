"use client";

import { createContext, useContext, type ReactNode } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { updateEditorPreferences } from "@/actions/editor-preferences";
import { fetchEditorPreferences } from "@/lib/swr-fetcher";
import { DEFAULT_EDITOR_PREFERENCES, type EditorPreferences } from "@/lib/editor-preferences";

// Shared across calls so rapid changes (e.g. a font-size dropdown then a theme dropdown
// in quick succession) replace the previous toast instead of stacking several.
const SAVE_TOAST_ID = "editor-preferences-save";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  updatePreference: <K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K]
  ) => Promise<void>;
}

const EditorPreferencesContext = createContext<EditorPreferencesContextValue | null>(null);

export function useEditorPreferences() {
  const context = useContext(EditorPreferencesContext);

  if (!context) {
    throw new Error("useEditorPreferences must be used within an EditorPreferencesProvider");
  }

  return context;
}

export function EditorPreferencesProvider({ children }: { children: ReactNode }) {
  const { data, mutate } = useSWR("/api/editor-preferences", fetchEditorPreferences, {
    revalidateOnFocus: false,
  });

  const preferences = data ?? DEFAULT_EDITOR_PREFERENCES;

  // Not debounced: every control here is a discrete Select/Switch choice (per spec —
  // dropdowns and toggles, not a slider or text field), so each call corresponds to one
  // deliberate user action, not a burst of events from a single gesture. Concurrent saves
  // from switching between controls quickly are already handled correctly (not merely
  // rate-limited) by optimisticData/rollbackOnError reading the live cache below.
  async function updatePreference<K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K]
  ) {
    try {
      await mutate(
        async () => {
          const result = await updateEditorPreferences({ [key]: value });
          if (!result.success || !result.data) {
            throw new Error(result.error ?? "Failed to save preferences");
          }
          return result.data;
        },
        {
          optimisticData: (current) => ({ ...(current ?? DEFAULT_EDITOR_PREFERENCES), [key]: value }),
          rollbackOnError: true,
          revalidate: false,
        }
      );
      toast.success("Preferences saved", { id: SAVE_TOAST_ID });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences", {
        id: SAVE_TOAST_ID,
      });
    }
  }

  return (
    <EditorPreferencesContext.Provider value={{ preferences, updatePreference }}>
      {children}
    </EditorPreferencesContext.Provider>
  );
}
