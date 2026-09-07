export interface CreateCheckoutSessionResult {
  success: boolean;
  error?: string;
}

// The "success" branch of both actions ends in redirect(), which throws — a
// real success never actually constructs and returns a {success:true} value.
// The type still models it for callers/tests reasoning about the shape, but
// only the failure path is ever observed at runtime.
export type CreatePortalSessionResult = CreateCheckoutSessionResult;
