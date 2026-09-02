import { z } from "zod";
import {
  EDITOR_THEME_OPTIONS,
  FONT_SIZE_OPTIONS,
  TAB_SIZE_OPTIONS,
  type EditorFontSize,
  type EditorTabSize,
} from "@/lib/editor-preferences";

export const editorPreferencesSchema = z.object({
  fontSize: z
    .number()
    .refine((size): size is EditorFontSize => FONT_SIZE_OPTIONS.includes(size as EditorFontSize), {
      message: "Invalid font size",
    }),
  tabSize: z
    .number()
    .refine((size): size is EditorTabSize => TAB_SIZE_OPTIONS.includes(size as EditorTabSize), {
      message: "Invalid tab size",
    }),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEME_OPTIONS),
});

export const editorPreferencesPartialSchema = editorPreferencesSchema.partial();
