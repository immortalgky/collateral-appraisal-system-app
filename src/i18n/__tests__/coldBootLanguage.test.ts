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
 * Regression guard for the cold-boot language bug.
 *
 * `src/i18n/index.ts` bundles all of `en` inline and lazy-loads th/zh. i18next's
 * `setResolvedLanguage()` runs during `init()` — before the backend has fetched
 * anything — and resolves to the first language in the hierarchy that already has
 * some translation in the store. When nothing Thai was bundled it resolved to
 * `en`; react-i18next then evaluated `hasLoadedNamespace()` against `en` (which is
 * inline, so "loaded"), never suspended, and never requested a Thai chunk. The
 * result: `i18n.language === 'th'` (the switcher showed TH) while every `t()`
 * rendered English, with no way to recover short of switching language by hand.
 *
 * Note on what is load-bearing here: `expect(resolvedLanguage).toBe('th')` alone
 * is NOT a guard. Remove the `th`/`zh` `common` seed and it still passes, because
 * the English fallback bundles registered at the bottom of index.ts put *some*
 * Thai in the store before the async `done()` recomputes resolution — an accident
 * that evaporates the day those fallbacks retire. The `failedLoading` assertion
 * below is what actually pins the fix.
 */

/** Wait long enough for the lazy `import()` chain behind i18next's backend to settle. */
const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise(resolve => setTimeout(resolve, 0));
};

interface BootResult {
  i18n: typeof import('i18next').default;
  /** `${lng}/${ns}` for every namespace i18next asked the backend for and did not get. */
  failures: string[];
}

/** Collect failedLoading events, attaching BEFORE index.ts runs init() at import time. */
async function bootCollectingFailures(): Promise<BootResult> {
  // The i18next singleton survives resetModules (node_modules deps stay cached),
  // so a listener attached here is still in place when index.ts calls init().
  const singleton = (await import('i18next')).default;
  const failures: string[] = [];
  const onFailed = (lng: string, ns: string) => failures.push(`${lng}/${ns}`);
  singleton.on('failedLoading', onFailed);
  try {
    const i18n = (await import('../index')).default;
    // Self-check, not decoration: if resetModules ever DOES re-evaluate i18next
    // (a Vitest default shift, or someone inlining the dep), `singleton` is a
    // different instance from the one index.ts initialised, `onFailed` never
    // fires, and every `expect(failures).toEqual([])` below passes unconditionally
    // — permanently green and permanently useless.
    expect(i18n).toBe(singleton);
    await flush();
    return { i18n, failures };
  } finally {
    singleton.off('failedLoading', onFailed);
  }
}

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

  // Derived from src/i18n/locales rather than hardcoded, so a fourth language is
  // covered the day someone adds it — which is when the per-language `common`
  // exclusions in ../index stop being cosmetic. Be clear about the limit: with en
  // excluded wholesale and th/zh inlined, `'!./locales/{th,zh}/common.json'` and
  // `'!./locales/*/common.json'` build an identical loader map, so nothing here can
  // tell them apart today. Confirmed by temporarily adding a `ja` locale dir, where
  // the `*` spelling yields `failedLoading: ['ja/common']` and this spelling yields
  // a clear "inline your common" failure instead.
  it('keeps the ResourceStore pointed at the reset namespace list', async () => {
    // ../index reassigns `i18n.options.ns` after the fallback registrations, which
    // is only safe because the ResourceStore shares that very options object —
    // otherwise the store would keep appending to an array nobody reads. The
    // comment there cites this assertion, so it has to exist.
    localStorage.setItem('app-language', 'th');
    const { i18n } = await bootCollectingFailures();
    const { defaultNS } = await import('../index');
    const store = i18n.store as unknown as { options: { ns?: string | readonly string[] } };

    expect(store.options.ns).toBe(i18n.options.ns);
    expect(i18n.options.ns).toEqual([defaultNS]);
  });

  it.each(localeLanguages)('has no lazy loader for the %s default namespace', async lng => {
    // `src/main.tsx` static-imports `./i18n` and calls `createRoot().render()` in
    // the same tick — no await between them — so `init()` must resolve the language
    // SYNCHRONOUSLY, or the first paint is English and only corrects once a chunk
    // lands: the same flash this PR removes. That holds only while the default
    // namespace cannot be loaded asynchronously at all.
    //
    // Asserted against `localeLoaders`, not `resources`: i18next takes `resources`
    // by reference and writes every loaded chunk into it, so inspecting it proves
    // nothing about *when* the bundle arrived. An earlier version of this test did
    // exactly that and passed while the seed had been moved to a post-init
    // addResourceBundle. `localeLoaders` is built by Vite at transform time and
    // never mutated, so "no loader" is a fact about the build, not about timing.
    //
    // Pair with the boot case below, which proves the bundle is actually there:
    // no loader + no failedLoading = it was present before the first render.
    const { localeLoaders, defaultNS } = await import('../index');

    expect(`./locales/${lng}/${defaultNS}.json` in localeLoaders).toBe(false);
  });

  it.each(localeLanguages)('boots %s without asking for anything missing', async lng => {
    localStorage.setItem('app-language', lng);

    const { i18n, failures } = await bootCollectingFailures();

    expect(i18n.language).toBe(lng);
    expect(i18n.resolvedLanguage).toBe(lng);
    // THE guard. A cold boot must not ask the backend for anything missing:
    // - drop the th/zh `common` seed and `<lng>/common` is requested, but `common`
    //   is excluded from the loader glob precisely because it is inline → reject;
    // - drop `ns: ['common']` and i18next falls back to its default
    //   `['translation']`, requesting a file that exists in no language → reject.
    // Both are silent in production, which is what made the original bug durable.
    expect(failures).toEqual([]);
    expect(i18n.hasResourceBundle(lng, 'common')).toBe(true);

    // ...and nothing that CAN be lazy has been loaded yet — nothing has rendered.
    // Derived from the loader map rather than naming a namespace: `en` bundles
    // every namespace inline and has no loaders at all, so a hardcoded
    // `hasResourceBundle(lng, 'nav') === false` is simply wrong for it.
    const { localeLoaders } = await import('../index');
    const prefix = `./locales/${lng}/`;
    const lazyNamespaces = Object.keys(localeLoaders)
      .filter(key => key.startsWith(prefix))
      .map(key => key.slice(prefix.length, -'.json'.length));

    expect(lazyNamespaces.filter(ns => i18n.hasResourceBundle(lng, ns))).toEqual([]);
  });

  it('normalises a region-tagged code to the bare language', async () => {
    // A browser reporting th-TH used to be cached verbatim, which broke the
    // server-supplied menu labels keyed off the raw i18n.language.
    localStorage.setItem('app-language', 'th-TH');

    // Via the settling helper, not a bare import: `vi.resetModules()` does not
    // clear the singleton's `language`, and `setLng` skips `setLngProps` while one
    // is already set — so if boot ever stops being synchronous, a bare read here
    // would see the PREVIOUS case's language instead of failing.
    const { i18n } = await bootCollectingFailures();

    expect(i18n.language).toBe('th');
    expect(i18n.resolvedLanguage).toBe('th');
    // The detector re-caches the normalised code, so the tag does not come back.
    expect(localStorage.getItem('app-language')).toBe('th');
  });

  it('falls back to en for a language the app does not ship', async () => {
    // Guards `supportedLngs`: without it a ja-JP browser resolves to `ja`, and
    // every namespace load for it rejects.
    stubNavigatorLanguages(['ja-JP', 'ja']);

    const { i18n, failures } = await bootCollectingFailures();

    expect(i18n.resolvedLanguage).toBe('en');
    expect(failures).toEqual([]);
  });

  it('still boots English when nothing is stored', async () => {
    // Boot Thai FIRST, then clear and boot again. Asserting `en` on its own proves
    // nothing: cases run in declaration order, the one above already ends on `en`,
    // and `vi.resetModules()` does not clear the singleton's language — so a build
    // that stopped re-resolving altogether would still satisfy it. Forcing the
    // th → (nothing stored) transition inside the case is what makes it bite.
    localStorage.setItem('app-language', 'th');
    const first = await bootCollectingFailures();
    expect(first.i18n.resolvedLanguage).toBe('th');

    vi.resetModules();
    localStorage.clear();
    const { i18n } = await bootCollectingFailures();

    expect(i18n.resolvedLanguage).toBe('en');
    expect(i18n.t('actions.save')).not.toBe('actions.save');
  });
});
