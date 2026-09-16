const OAUTH_PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub",
  google: "Google",
};

// Order matters here, not just membership — mirrors getProfileUser's existing
// GitHub-over-Google precedence (src/lib/db/user.ts) so the two surfaces
// can't disagree about which provider a multi-linked account "is". Returns
// null when no recognized OAuth provider is linked (e.g. a passwordless
// account whose Account row was deleted) rather than guessing one, since a
// wrong guess actively misleads the user about how to sign in.
export function resolveOAuthProviderLabel(accounts: { provider: string }[]): string | null {
  for (const provider of ["github", "google"]) {
    if (accounts.some((account) => account.provider === provider)) {
      return OAUTH_PROVIDER_LABELS[provider];
    }
  }

  return null;
}
