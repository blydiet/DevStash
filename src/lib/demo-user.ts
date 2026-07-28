// TODO(auth): Every DB helper in src/lib/db/ scopes its queries to this single
// hardcoded user until NextAuth session lookup is wired up. Once auth lands,
// replace usages of this constant with the actual session user's email —
// otherwise every "current user" query will keep resolving to the demo user
// (or throw, for lookups using findUniqueOrThrow) instead of the real one.
export const DEMO_USER_EMAIL = "demo@devstash.io";
