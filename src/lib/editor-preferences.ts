export const FONT_SIZE_OPTIONS = [12, 13, 14, 16, 18, 20] as const;
export const TAB_SIZE_OPTIONS = [2, 4, 8] as const;
export const EDITOR_THEME_OPTIONS = ["vs-dark", "monokai", "github-dark"] as const;

export type EditorFontSize = (typeof FONT_SIZE_OPTIONS)[number];
export type EditorTabSize = (typeof TAB_SIZE_OPTIONS)[number];
export type EditorTheme = (typeof EDITOR_THEME_OPTIONS)[number];

export interface EditorPreferences {
  fontSize: EditorFontSize;
  tabSize: EditorTabSize;
  wordWrap: boolean;
  minimap: boolean;
  theme: EditorTheme;
}

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
};
