import { afterEach, describe, expect, it } from 'vitest';
import { isMacPlatform, quickSearchHint } from './platform';

const set = (key: string, value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true });
const saved = {
  platform: Object.getOwnPropertyDescriptor(navigator, 'platform'),
  userAgent: Object.getOwnPropertyDescriptor(navigator, 'userAgent'),
  userAgentData: Object.getOwnPropertyDescriptor(navigator, 'userAgentData'),
};
afterEach(() => {
  for (const [k, d] of Object.entries(saved)) {
    if (d) Object.defineProperty(navigator, k, d);
    else delete (navigator as unknown as Record<string, unknown>)[k];
  }
});

describe('quickSearchHint', () => {
  it('is ⌘K on macOS, from userAgentData first', () => {
    set('userAgentData', { platform: 'macOS' });
    set('platform', 'Win32'); // userAgentData wins
    expect(isMacPlatform()).toBe(true);
    expect(quickSearchHint()).toBe('⌘K');
  });

  it('is Ctrl K on Windows and Linux', () => {
    set('userAgentData', { platform: 'Windows' });
    expect(quickSearchHint()).toBe('Ctrl K');
    set('userAgentData', undefined);
    set('platform', 'Linux x86_64');
    expect(quickSearchHint()).toBe('Ctrl K');
  });

  it('falls back to navigator.platform, then the user agent', () => {
    set('userAgentData', undefined);
    set('platform', 'MacIntel');
    expect(quickSearchHint()).toBe('⌘K');
    set('platform', '');
    set('userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    expect(quickSearchHint()).toBe('⌘K');
    set('userAgent', 'Mozilla/5.0 (X11; Linux x86_64)');
    expect(quickSearchHint()).toBe('Ctrl K');
  });
});
