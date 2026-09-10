export interface SuggestTagsActionResult {
  success: boolean;
  data?: { tags: string[] };
  error?: string;
  // Distinguishes the free-tier gate from every other failure mode (rate
  // limit, not-found, OpenAI error) so the UI can offer an Upgrade action
  // without string-matching `error`.
  upgradeRequired?: boolean;
}

export interface SummarizeDraftActionResult {
  success: boolean;
  data?: { description: string };
  error?: string;
  upgradeRequired?: boolean;
}

export interface ExplainCodeActionResult {
  success: boolean;
  data?: { explanation: string };
  error?: string;
  upgradeRequired?: boolean;
}

export interface OptimizePromptActionResult {
  success: boolean;
  data?: { optimizedContent: string };
  error?: string;
  upgradeRequired?: boolean;
}
