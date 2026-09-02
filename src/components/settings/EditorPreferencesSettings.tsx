"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorPreferences } from "@/components/dashboard/EditorPreferencesContext";
import { EDITOR_THEME_OPTIONS, FONT_SIZE_OPTIONS, TAB_SIZE_OPTIONS } from "@/lib/editor-preferences";

const THEME_LABELS: Record<(typeof EDITOR_THEME_OPTIONS)[number], string> = {
  "vs-dark": "VS Dark",
  monokai: "Monokai",
  "github-dark": "GitHub Dark",
};

export function EditorPreferencesSettings() {
  const { preferences, updatePreference } = useEditorPreferences();

  return (
    <Card className="rounded-[10px] lg:w-[790px] md:w-[700px] w-[300px]">
      <CardHeader>
        <CardTitle>Editor preferences</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="editor-font-size">Font size</Label>
          <Select
            value={String(preferences.fontSize)}
            onValueChange={(value) => updatePreference("fontSize", Number(value) as typeof preferences.fontSize)}
          >
            <SelectTrigger id="editor-font-size" className="w-[140px] rounded-[5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {FONT_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="editor-tab-size">Tab size</Label>
          <Select
            value={String(preferences.tabSize)}
            onValueChange={(value) => updatePreference("tabSize", Number(value) as typeof preferences.tabSize)}
          >
            <SelectTrigger id="editor-tab-size" className="w-[140px] rounded-[5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {TAB_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} spaces
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="editor-theme">Theme</Label>
          <Select
            value={preferences.theme}
            onValueChange={(value) => updatePreference("theme", value as typeof preferences.theme)}
          >
            <SelectTrigger id="editor-theme" className="w-[140px] rounded-[5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {EDITOR_THEME_OPTIONS.map((theme) => (
                <SelectItem key={theme} value={theme}>
                  {THEME_LABELS[theme]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="editor-word-wrap">Word wrap</Label>
          <Switch
            id="editor-word-wrap"
            checked={preferences.wordWrap}
            onCheckedChange={(checked) => updatePreference("wordWrap", checked)}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="editor-minimap">Minimap</Label>
          <Switch
            id="editor-minimap"
            checked={preferences.minimap}
            onCheckedChange={(checked) => updatePreference("minimap", checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
