import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every language the repo actually ships a locale directory for. */
const localeLanguages = readdirSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'locales'),
  { withFileTypes: true },
)
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

/**
 * Regression guard for the cold-boot language bug: `i18n.language` must be the
 * language the detector picked AND `resolvedLanguage` must agree, so every `t()`
 * renders in it from the first paint. `src/i18n/index.ts` bundles every namespace of
 * every language inline, so `init()` resolves synchronously (`src/main.tsx` renders
 * in the same tick as the import).
 */

/** Re-run src/i18n/index.ts (init + language detection) and return the singleton. */
const boot = async () => (await import('../index')).default;

describe('i18n cold boot', () => {
  /**
   * happy-dom hardcodes en-US; pin it so these cases don't drift with the DOM shim.
   * These are OWN properties on the `navigator` instance, shadowing the prototype
   * getters — so the cleanup has to delete them off the instance. Restoring
   * captured `Navigator.prototype` descriptors does nothing (the prototype is never
   * touched) and leaves the stub in place for whatever runs next.
   */
  const stubNavigatorLanguages = (languages: string[]) => {
    Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
    Object.defineProperty(navigator, 'language', { value: languages[0], configurable: true });
  };

  const unstubNavigatorLanguages = () => {
    delete (navigator as unknown as Record<string, unknown>).languages;
    delete (navigator as unknown as Record<string, unknown>).language;
  };

  beforeEach(() => {
    // resetModules() re-evaluates src/i18n/index.ts, which runs i18n.init() again on
    // the *same* i18next singleton — node_modules deps stay cached, so this is NOT a
    // fresh instance. What isolates these cases is that re-init re-runs language
    // detection and rebuilds the ResourceStore. Two consequences to respect: index.ts
    // re-registers its `languageChanged` listener on every re-evaluation, and any
    // assertion on i18n state must come after re-importing index.ts — read the
    // singleton without that and you observe the previous case's language.
    vi.resetModules();
    localStorage.clear();
    stubNavigatorLanguages(['en-US', 'en']);
  });

  afterEach(unstubNavigatorLanguages);

  it.each(localeLanguages)('boots %s', async lng => {
    localStorage.setItem('app-language', lng);

    const i18n = await boot();

    expect(i18n.language).toBe(lng);
    expect(i18n.resolvedLanguage).toBe(lng);
    expect(i18n.hasResourceBundle(lng, 'common')).toBe(true);
  });

  it('normalises a region-tagged code to the bare language', async () => {
    // A browser reporting th-TH used to be cached verbatim, which broke the
    // server-supplied menu labels keyed off the raw i18n.language.
    localStorage.setItem('app-language', 'th-TH');

    const i18n = await boot();

    expect(i18n.language).toBe('th');
    expect(i18n.resolvedLanguage).toBe('th');
    // The detector re-caches the normalised code, so the tag does not come back.
    expect(localStorage.getItem('app-language')).toBe('th');
  });

  it('takes the language from the cas-lang cookie the login page shares, ahead of localStorage', async () => {
    localStorage.setItem('app-language', 'en');
    document.cookie = 'cas-lang=zh; Path=/';

    const i18n = await boot();

    expect(i18n.language).toBe('zh');
  });

  it('normalises a region-tagged cookie value too', async () => {
    document.cookie = 'cas-lang=th-TH; Path=/';

    const i18n = await boot();

    expect(i18n.language).toBe('th');
  });

  it('falls back to en for a language the app does not ship', async () => {
    // Guards `supportedLngs`: without it a ja-JP browser resolves to `ja`.
    stubNavigatorLanguages(['ja-JP', 'ja']);

    const i18n = await boot();

    expect(i18n.language).toBe('en');
    expect(i18n.resolvedLanguage).toBe('en');
  });

  it('still boots English when nothing is stored', async () => {
    // Boot Thai FIRST, then clear and boot again. Asserting `en` on its own proves
    // nothing: cases run in declaration order, the one above already ends on `en`,
    // and `vi.resetModules()` does not clear the singleton's language — so a build
    // that stopped re-resolving altogether would still satisfy it. Forcing the
    // th → (nothing stored) transition inside the case is what makes it bite.
    localStorage.setItem('app-language', 'th');
    const first = await boot();
    expect(first.resolvedLanguage).toBe('th');

    vi.resetModules();
    localStorage.clear();
    document.cookie = 'cas-lang=; Max-Age=0; Path=/';
    const i18n = await boot();

    expect(i18n.resolvedLanguage).toBe('en');
    expect(i18n.t('actions.save')).not.toBe('actions.save');
  });
});
