const STORAGE_KEY_PREFIX = "devstash:onboarding-seen:";

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

// Fails "seen" rather than "unseen" when storage throws (private browsing,
// disabled storage, quota) — there's no way to persist a dismissal in that
// case, so treating it as unseen would just re-show the modal on every load.
// Resolving `window.localStorage` happens inside the try too: accessing the
// property itself (not just getItem/setItem) can throw in some browsers'
// privacy modes.
export function hasSeenOnboarding(
  userId: string,
  storage?: Pick<Storage, "getItem">,
): boolean {
  try {
    const target = storage ?? window.localStorage;
    return target.getItem(storageKey(userId)) === "true";
  } catch {
    return true;
  }
}

export function markOnboardingSeen(
  userId: string,
  storage?: Pick<Storage, "setItem">,
): void {
  try {
    const target = storage ?? window.localStorage;
    target.setItem(storageKey(userId), "true");
  } catch {
    // Storage unavailable — nothing to persist; worst case the modal
    // reappears next visit.
  }
}
