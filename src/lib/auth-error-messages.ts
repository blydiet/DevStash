// Auth.js appends `?error=<code>` to the sign-in page URL when an OAuth
// attempt fails before ever reaching our own Server Actions (e.g. GitHub or
// Google returning an email that already belongs to a credentials-only
// account — Auth.js refuses to auto-link for security). Only codes we can
// realistically hit from the OAuth buttons are mapped; anything else falls
// back to a generic message rather than showing a raw error code.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already registered with a password. Sign in with your email and password instead.",
};

const DEFAULT_AUTH_ERROR_MESSAGE = "Something went wrong signing in. Please try again.";

export function getAuthErrorMessage(code: string): string {
  return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_AUTH_ERROR_MESSAGE;
}
