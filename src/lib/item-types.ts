import { Code, File, Image, Link as LinkIcon, Sparkles, StickyNote, Terminal } from "lucide-react";

export const ITEM_TYPES = [
  { value: "snippet", label: "Snippet", icon: Code, color: "#3b82f6" },
  { value: "prompt", label: "Prompt", icon: Sparkles, color: "#8b5cf6" },
  { value: "command", label: "Command", icon: Terminal, color: "#f97316" },
  { value: "note", label: "Note", icon: StickyNote, color: "#fde047" },
  { value: "file", label: "File", icon: File, color: "#6b7280" },
  { value: "image", label: "Image", icon: Image, color: "#ec4899" },
  { value: "link", label: "Link", icon: LinkIcon, color: "#10b981" },
] as const;

export type ItemType = (typeof ITEM_TYPES)[number]["value"];
