/**
 * Whether the user is on an Apple platform (macOS, iOS, iPadOS), for showing the right shortcut
 * label. `userAgentData.platform` is the modern source, `navigator.platform` the long-standing one,
 * and the user agent the last resort.
 */
export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * The hint for the quick-search shortcut: `⌘K` on a Mac, `Ctrl K` everywhere else. The handler
 * itself (useGlobalSearch) accepts either modifier on every platform.
 */
export const quickSearchHint = () => (isMacPlatform() ? '⌘K' : 'Ctrl K');
