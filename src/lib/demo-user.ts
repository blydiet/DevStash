// Used only by scripts/delete-non-demo-users.ts to exempt the seeded demo
// account from deletion. DB helpers under src/lib/db/ no longer use this —
// they scope to the real session user via getCurrentUserId().
export const DEMO_USER_EMAIL = "demo@devstash.io";
