// Shared by CreateItemDialog.tsx and ItemDrawerEditForm.tsx, whose Tags
// field is a comma-separated string rather than an array (see
// CreateItemFormState.tags / EditForm.tags). Appends only the suggestions
// not already present, case-insensitively. Strips trailing commas *and*
// whitespace together (not just whitespace) before appending, so a value
// like "react, vue, " doesn't produce a double comma.
export function mergeTagInput(current: string, suggestions: string[]): string {
  const existing = new Set(
    current
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  );
  const toAdd = suggestions.filter((tag) => !existing.has(tag.toLowerCase()));
  if (toAdd.length === 0) return current;

  const trimmedCurrent = current.replace(/[,\s]+$/, "");
  return trimmedCurrent ? `${trimmedCurrent}, ${toAdd.join(", ")}` : toAdd.join(", ");
}
