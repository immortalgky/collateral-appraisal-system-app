import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import type { Namespace } from 'i18next';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end guard for the cold-boot language bug: it is not enough that
 * `i18n.resolvedLanguage` is `th` — react-i18next must actually report the lazy
 * namespace as *not* loaded, suspend, fetch its chunk, and re-render in Thai.
 *
 * While the bug was live `hasLoadedNamespace()` was evaluated against `en`
 * (bundled, therefore "loaded"), so this component rendered immediately with the
 * English string and no Thai chunk was ever requested.
 */
/** Let any queued lazy `import()` settle. Enough ticks that this is not a wall-clock race. */
const settle = async () => {
  for (let i = 0; i < 20; i += 1) await new Promise(resolve => setTimeout(resolve, 5));
};

/** i18next types `options.ns` as `string | readonly string[]`; normalise to an array. */
const requestedNamespaces = (ns: string | readonly string[] | undefined): string[] =>
  typeof ns === 'string' ? [ns] : [...(ns ?? [])];

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales');
const hasLocaleFile = (lng: string, ns: string) => existsSync(join(localesDir, lng, `${ns}.json`));

const enNamespaces = readdirSync(join(localesDir, 'en'))
  .filter(f => f.endsWith('.json'))
  .map(f => f.replace(/\.json$/, ''));

/**
 * Some namespaces get their English fallback from a feature-level
 * `src/features/*\/i18n.ts` at page load rather than from index.ts at boot. The
 * test imports those modules instead of keeping a hand-written exclusion list: a
 * hardcoded list goes stale in the direction that stays green — drop the
 * registration from a feature module and the namespace would simply keep being
 * excluded, with zh users quietly back to suspending on a rejecting import.
 */
const importFeatureRegistrations = () =>
  Promise.all([
    import('@features/feeApprovalConfig/i18n'),
    import('@features/feeAppointmentApproval/i18n'),
    import('@features/feeStructureMaintenance/i18n'),
    import('@features/serviceQualityEvaluation/admin/i18n'),
  ]);

/**
 * Every (lng, ns) that must end up with an English fallback, derived from the
 * filesystem rather than duplicating any call list. `common` is excluded: it is
 * inline, never a fallback.
 */
const fallbackPairs = (['th', 'zh'] as const).flatMap(lng =>
  enNamespaces.filter(ns => ns !== 'common' && !hasLocaleFile(lng, ns)).map(ns => ({ lng, ns })),
);

/** A namespace with no th JSON, discovered rather than hardcoded — see the test below. */
const thLessNamespace = enNamespaces.find(ns => !hasLocaleFile('th', ns)) as Namespace | undefined;

function NavLabel() {
  const { t } = useTranslation('nav');
  return <span data-testid="label">{t('sidebar.dashboard')}</span>;
}

/**
 * Renders a key that exists in no namespace, so it works for any `ns`: i18next
 * echoes the key back. What we read off this component is purely *whether it
 * suspended*, never the text.
 */
function MissingKeyProbe({ ns }: { ns: Namespace }) {
  const { t } = useTranslation(ns);
  // Cast: the key deliberately exists nowhere, so it is outside the typed keyspace.
  return <span data-testid="probe">{t('__no_such_key__' as never)}</span>;
}

describe('i18n cold boot rendering', () => {
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
  });

  it('lazily loads a Thai namespace and renders Thai', async () => {
    localStorage.setItem('app-language', 'th');
    await import('../index');

    render(
      <Suspense fallback={<span data-testid="fallback">loading</span>}>
        <NavLabel />
      </Suspense>,
    );

    // `nav` is not bundled, so the first paint must be the Suspense fallback.
    expect(screen.getByTestId('fallback')).toBeInTheDocument();

    expect(await screen.findByTestId('label')).toHaveTextContent('แดชบอร์ด');
  });

  // Skips itself once every en namespace has a th file — at which point the
  // condition under test no longer exists in the repo. Deliberately NOT pinned to
  // `oauthAdmin`: an earlier version was, and landing a real th/oauthAdmin.json
  // turned this test red even though the app had become *more* correct (it starts
  // suspending and serving Thai). The property is about a namespace with no file,
  // not about that namespace.
  it.skipIf(!thLessNamespace)('does not suspend on a namespace with no th file', async () => {
    localStorage.setItem('app-language', 'th');
    await import('../index');

    render(
      <Suspense fallback={<span data-testid="fallback">loading</span>}>
        <MissingKeyProbe ns={thLessNamespace!} />
      </Suspense>,
    );

    // registerEnglishFallback in ../index registered English for it, so there is
    // nothing to fetch. Without that, react-i18next would suspend on an import
    // that cannot succeed: a loader flash plus a console error, only to land on
    // English anyway.
    expect(screen.queryByTestId('fallback')).toBeNull();
    expect(screen.getByTestId('probe')).toBeInTheDocument();
  });

  it('registers an English fallback for every namespace with no locale file', async () => {
    // The "register" half of registerEnglishFallback, and the half that had no
    // coverage: the non-suspension test below skips itself once a th translation
    // lands, so a helper that registered NOTHING used to leave the suite green
    // while nine zh namespaces silently went back to suspending on imports that
    // reject. Derived from the filesystem, so a landing translation removes that
    // pair instead of turning this red.
    localStorage.setItem('app-language', 'th');
    const i18n = (await import('../index')).default;
    await importFeatureRegistrations();

    // If this ever fails because every locale file now exists, the helper has no
    // work left — delete it and this test together.
    expect(fallbackPairs.length).toBeGreaterThan(0);
    for (const { lng, ns } of fallbackPairs) {
      expect({ lng, ns, registered: i18n.hasResourceBundle(lng, ns) }).toEqual({
        lng,
        ns,
        registered: true,
      });
    }
  });

  it('does not shadow a namespace that does have a th file', async () => {
    // The self-retiring half of registerEnglishFallback. i18next's
    // BackendConnector.queueLoad marks a pair whose bundle already exists as
    // "loaded" and never fetches it, so an unconditional English fallback would win
    // forever — the day a translator lands the real JSON, Thai users keep seeing
    // English with no error and no failing test. `nav` has a th file, so calling
    // the helper for it must be a no-op and leave the lazy loader in charge.
    localStorage.setItem('app-language', 'th');
    const { default: i18n, registerEnglishFallback } = await import('../index');
    const enNav = (await import('../locales/en/nav.json')).default;

    expect(hasLocaleFile('th', 'nav')).toBe(true);
    registerEnglishFallback('th', 'nav', enNav);

    expect(i18n.hasResourceBundle('th', 'nav')).toBe(false);
  });

  it('fetches only the namespaces it actually renders, on a Thai cold boot', async () => {
    // Boot cost is the whole point of the lazy-loading design this fix had to
    // preserve, so it gets an assertion rather than a comment. Anything in the
    // store beyond the inline `common` and the English fallbacks had to come over
    // the network.
    //
    // This caught a real regression: an `i18n.loadNamespaces('historySearch')`
    // call placed below the fallback block pulled all ten namespaces (~45 KB of
    // admin-only Thai chunks) on every Thai cold boot, because
    // `addResourceBundle` grows the shared `i18n.options.ns` and `loadNamespaces`
    // loads that whole list rather than its argument.
    localStorage.setItem('app-language', 'th');
    const i18n = (await import('../index')).default;

    // The render is the whole point: react-i18next calls `i18n.loadNamespaces` on
    // every suspending `useTranslation`, so the fetch happens when the shell
    // mounts, not at import. An earlier version of this test asserted straight
    // after the import and was green while production pulled 45,929 bytes.
    render(
      <Suspense fallback={<span data-testid="fallback">loading</span>}>
        <NavLabel />
      </Suspense>,
    );
    await screen.findByTestId('label');
    await settle();

    const thFallbacks = new Set(fallbackPairs.filter(p => p.lng === 'th').map(p => p.ns));
    const fetched = enNamespaces.filter(
      ns => ns !== 'common' && !thFallbacks.has(ns) && i18n.hasResourceBundle('th', ns),
    );
    // `nav` is what the shell actually rendered. Anything else is waste.
    expect(fetched).toEqual(['nav']);
    // Deterministic companion to the assertion above: `loadNamespaces` appends to
    // `options.ns` SYNCHRONOUSLY, before any dynamic import settles, so this holds
    // however slow the machine is. `hasResourceBundle` alone only turns true once a
    // chunk has arrived, so on a loaded CI box it could miss the very over-fetch it
    // is there to catch.
    // Absence form, not `toEqual(['common','nav'])`: inlining `nav` alongside
    // `common` some day would stop the shell suspending, so react-i18next would
    // never call `loadNamespaces` and the list would stay `['common']` — a strictly
    // better app failing a pinned test. Same trap already fixed for `oauthAdmin`.
    expect(
      requestedNamespaces(i18n.options.ns).filter(ns => ns !== 'common' && ns !== 'nav'),
    ).toEqual([]);
  });

  it('switches to Thai at runtime without over-fetching', async () => {
    // The path the bug was reported through: the user is in English, picks ไทย,
    // and the UI must follow. Worth its own case because `changeLanguage` reloads
    // `options.ns` for the new language, so it is the second place the boot-cost
    // regression could surface — and it is the one the switcher actually hits.
    localStorage.setItem('app-language', 'en');
    const i18n = (await import('../index')).default;

    render(
      <Suspense fallback={<span data-testid="fallback">loading</span>}>
        <NavLabel />
      </Suspense>,
    );
    expect(await screen.findByTestId('label')).toHaveTextContent('Dashboard');

    // Wrapped in act(): changeLanguage both re-renders subscribers and resolves a
    // suspended read, and React leaves the tree mid-suspend (the label renders
    // empty) if those land outside act. That is a harness artefact, not product
    // behaviour — verified the switch works with act in place.
    await act(async () => {
      await i18n.changeLanguage('th');
      await settle();
    });

    expect(i18n.resolvedLanguage).toBe('th');
    expect(await screen.findByTestId('label')).toHaveTextContent('แดชบอร์ด');

    const thFallbacks = new Set(fallbackPairs.filter(p => p.lng === 'th').map(p => p.ns));
    const fetched = enNamespaces.filter(
      ns => ns !== 'common' && !thFallbacks.has(ns) && i18n.hasResourceBundle('th', ns),
    );
    expect(fetched).toEqual(['nav']);
    // Deterministic companion to the assertion above: `loadNamespaces` appends to
    // `options.ns` SYNCHRONOUSLY, before any dynamic import settles, so this holds
    // however slow the machine is. `hasResourceBundle` alone only turns true once a
    // chunk has arrived, so on a loaded CI box it could miss the very over-fetch it
    // is there to catch.
    // Absence form, not `toEqual(['common','nav'])`: inlining `nav` alongside
    // `common` some day would stop the shell suspending, so react-i18next would
    // never call `loadNamespaces` and the list would stay `['common']` — a strictly
    // better app failing a pinned test. Same trap already fixed for `oauthAdmin`.
    expect(
      requestedNamespaces(i18n.options.ns).filter(ns => ns !== 'common' && ns !== 'nav'),
    ).toEqual([]);
  });

  it('renders English without suspending when the language is en', async () => {
    localStorage.setItem('app-language', 'en');
    await import('../index');

    render(
      <Suspense fallback={<span data-testid="fallback">loading</span>}>
        <NavLabel />
      </Suspense>,
    );

    expect(screen.getByTestId('label')).toHaveTextContent('Dashboard');
  });
});
