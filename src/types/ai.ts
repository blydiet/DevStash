export interface SuggestTagsActionResult {
  success: boolean;
  data?: { tags: string[] };
  error?: string;
  // Distinguishes the free-tier gate from every other failure mode (rate
  // limit, not-found, OpenAI error) so the UI can offer an Upgrade action
  // without string-matching `error`.
  upgradeRequired?: boolean;
}
