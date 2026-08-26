import type { ItemType } from "@/lib/item-types";

const TYPES_WITH_CONTENT: ItemType[] = ["snippet", "prompt", "command", "note"];
const TYPES_WITH_LANGUAGE: ItemType[] = ["snippet", "command"];
const TYPES_WITH_URL: ItemType[] = ["link"];
const TYPES_WITH_CODE_EDITOR: ItemType[] = ["snippet", "command"];
const TYPES_WITH_MARKDOWN_EDITOR: ItemType[] = ["prompt", "note"];
const TYPES_WITH_FILE_UPLOAD: ItemType[] = ["file", "image"];

function includesType(types: ItemType[], typeName: string): boolean {
  return (types as string[]).includes(typeName);
}

export function typeShowsContent(typeName: string): boolean {
  return includesType(TYPES_WITH_CONTENT, typeName);
}

export function typeShowsLanguage(typeName: string): boolean {
  return includesType(TYPES_WITH_LANGUAGE, typeName);
}

export function typeShowsUrl(typeName: string): boolean {
  return includesType(TYPES_WITH_URL, typeName);
}

export function typeShowsCodeEditor(typeName: string): boolean {
  return includesType(TYPES_WITH_CODE_EDITOR, typeName);
}

export function typeShowsMarkdownEditor(typeName: string): boolean {
  return includesType(TYPES_WITH_MARKDOWN_EDITOR, typeName);
}

export function typeShowsFileUpload(typeName: string): boolean {
  return includesType(TYPES_WITH_FILE_UPLOAD, typeName);
}
