export function getAppUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }

  // Vercel's stable per-branch alias — unlike VERCEL_URL (unique per deployment),
  // this survives redeploys of the same branch, so an already-sent email link
  // doesn't break on the next push. Excludes the protocol scheme.
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }

  throw new Error(
    "APP_URL is not set — required to build absolute links (e.g. in emails)"
  );
}
