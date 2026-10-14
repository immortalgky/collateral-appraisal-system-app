import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { leaveWithoutPrompt } from '@shared/api/forcedNavigation';
import Icon from '@shared/components/Icon';
import LanguageSwitcher from '@shared/components/LanguageSwitcher';
import logo from '@assets/logo-lh-bank-white.svg';
import skyline from '@assets/login-skyline.jpg';
import { useAuthStore } from '../store';
import {
  clearSavedReturn,
  isSavedUserOrUnknown,
  isSavedUserStrict,
  readSavedReturn,
  saveReturn,
  safeReturnPath,
  session,
  SIGNED_OUT_KEY,
  startSignIn,
  type LoginReason,
} from '../utils/auth';
import { authChannel } from '../utils/authChannel';

/** How long the "signed in on another tab" message stays before the page moves on by itself. */
const OTHER_TAB_DELAY_MS = 1500;

/** When a signed-in visitor was last sent back from here after a 401, and the quiet period after it. */
const BOUNCE_KEY = 'cas-login-bounce';
const BOUNCE_WINDOW_MS = 30_000;
const quietPeriodOver = () =>
  Date.now() - (Number(session.get(BOUNCE_KEY)) || 0) >= BOUNCE_WINDOW_MS;

// The ways to sign in, first one primary. Adding one (a passkey) is one more entry here. `hint` is
// the username of the user whose session timed out, when known; only a method that `acceptsHint`
// is given it and is shown as "Continue as <name>".
const SIGN_IN_METHODS = [
  {
    id: 'password',
    labelKey: 'interstitial.methods.password',
    acceptsHint: true,
    start: (returnPath: string, hint?: string) => startSignIn(returnPath, { loginHint: hint }),
  },
] as const;

// Drop the old query from the address at once. Not the router's setSearchParams: its update can
// land after a cross-document navigation has started, and a reload or Back must not revive the page.
const stripToBareLogin = () => window.history.replaceState(window.history.state, '', '/login');

// Nothing of the previous user's page may come back, by a reload, a Back or a later bare /login.
const forgetPreviousUser = () => {
  saveReturn({ path: '/', notYou: true });
  stripToBareLogin();
};

const REASONS: readonly LoginReason[] = ['idle', 'ended', 'signed-out'];

// What each reason looks like: its icon tile and the copy key under `interstitial`.
type View = { icon: string; tone: string; copy: 'idle' | 'ended' | 'signedOut' | 'otherTab' };
const REASON_VIEW: Record<LoginReason, View> = {
  idle: { icon: 'clock', tone: 'bg-amber-500/15 text-amber-400', copy: 'idle' },
  ended: { icon: 'shield-halved', tone: 'bg-blue-300/15 text-blue-300', copy: 'ended' },
  'signed-out': { icon: 'check', tone: 'bg-green-400/15 text-green-400', copy: 'signedOut' },
};

const asReason = (value: unknown) => REASONS.find(r => r === value);

/**
 * The page every sign-in starts from. It only explains why the user is here and waits for a click:
 * the identity provider's login state is created when /auth/login is called, and it expires after
 * an hour, so redirecting automatically would hand people a login page that is already stale if
 * they leave the tab open.
 */
function LoginPage() {
  const { t } = useTranslation('auth');
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const signedInId = useAuthStore(state => state.user?.id);
  const [params, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Everything about how the user got here, read once. The URL is edited below (the reason is
  // dropped from it) and storage is rewritten as the page runs, so nothing is re-read after this.
  const [arrival] = useState(() => {
    const saved = readSavedReturn();
    // ProtectedRoute leaves the page the user asked for in state; redirectToLogin puts it in the URL.
    // Not after "Not you?" or another tab's sign-out: the history entry still carries it.
    const from = saved?.notYou ? undefined : (location.state as { from?: string } | null)?.from;
    const noQuery = !params.has('returnUrl') && !params.has('reason');
    // A bare /login (the identity provider's "choose another method" link) lost the query: fall back
    // to what redirectToLogin saved. Not when router state names a page (a plain first visit), or an
    // hours-old saved reason would be shown.
    const bare = noQuery && !from;
    const queried = params.get('returnUrl');
    const restored = bare && typeof saved?.path === 'string' ? saved.path : undefined;
    const returnPath = safeReturnPath(queried ?? from ?? restored);
    // What was saved for this page, however the page was named (query, router state or the saved
    // state itself). By decision, router state naming the saved page gets its saved reason, card and
    // user: a different person who typed the same URL is sent home after signing in, rather than the
    // timed-out user's guards being dropped.
    const forPage = saved?.path === returnPath ? saved : undefined;
    // logout() leaves a flag for the page it lands on (the app home, which sends the user here with
    // only router state); only a query-less visit honours it.
    const flagged = session.get(SIGNED_OUT_KEY) === '1';
    // The query's reason is stripped on mount, so a reload of the card page falls back to the saved
    // one. Otherwise only a bare /login restores it; a plain reload shows the generic page.
    const savedReason = bare || forPage?.account ? asReason((forPage ?? saved)?.reason) : undefined;
    return {
      returnPath,
      label: typeof forPage?.label === 'string' && forPage.label ? forPage.label : undefined,
      reason: asReason(params.get('reason')) ?? (noQuery && flagged ? 'signed-out' : savedReason),
      hadReason: params.has('reason'),
      userId: forPage?.userId,
      // Who timed out, for the "Continue as" card.
      account: forPage?.account,
      notYou: saved?.notYou,
      // Reached because of a 401 while /auth/me says the user is signed in (the two disagree, say
      // after a cache mismatch)? Going back would 401 again and loop, so go back at most once per
      // window and then stay here with the normal button.
      from401: !noQuery,
      mayGoBack: noQuery || quietPeriodOver(),
    };
  });
  const { returnPath } = arrival;

  // "Not you?" was chosen: the card is gone from the screen, also when the page is shown again
  // from the back/forward cache (where this state survives).
  const [forgotten, setForgotten] = useState(false);
  const leavingSignedIn = isAuthenticated && arrival.mayGoBack;

  // The flag is one-shot: dropped in every case, in an effect rather than while rendering so
  // StrictMode's second render still sees it.
  useEffect(() => session.remove(SIGNED_OUT_KEY), []);

  useEffect(() => {
    if (!leavingSignedIn) return;
    if (arrival.from401) session.set(BOUNCE_KEY, String(Date.now()));
    // Signed in: what was saved for this page must not outlive the hand-over.
    clearSavedReturn();
  }, [leavingSignedIn, arrival.from401]);

  // The reason is for this visit only: a reload should show the generic page. returnUrl stays.
  // Not while handing over to the return page (<Navigate> below), which must own the location.
  const stripped = useRef(false);
  useEffect(() => {
    if (!arrival.hadReason || leavingSignedIn || stripped.current) return;
    stripped.current = true;
    setSearchParams(
      prev => {
        const rest = new URLSearchParams(prev);
        rest.delete('reason');
        return rest;
      },
      { replace: true, state: location.state },
    );
  }, [arrival.hadReason, leavingSignedIn, setSearchParams, location.state]);

  // The last word from the other tabs: someone signed in (nothing left to type here) or signed out
  // (the signed-out page, and no more going back). `auto`: this message may send the page back by
  // itself. It shares the once-per-window limit with the signed-in check, so two tabs cannot send
  // each other back forever, and once granted it holds for later messages of the same kind.
  const [signal, setSignal] = useState<{
    type: 'user' | 'logout';
    id?: string;
    auto: boolean;
  } | null>(null);
  useEffect(() => {
    if (!authChannel) return;
    const onMessage = (event: MessageEvent<{ type?: string; id?: string }>) => {
      const { type, id } = event.data ?? {};
      if (type !== 'user' && type !== 'logout') return;
      if (type === 'logout') {
        forgetPreviousUser(); // signed out on purpose
      }
      const auto = type === 'user' && quietPeriodOver();
      if (auto) session.set(BOUNCE_KEY, String(Date.now()));
      setSignal(prev => ({ type, id, auto: auto || (prev?.type === type && prev.auto) }));
    };
    authChannel.addEventListener('message', onMessage);
    return () => authChannel?.removeEventListener('message', onMessage);
  }, []);
  const otherTab = signal?.type === 'user';
  // Back to the page only for the user who was signed out; anyone else starts from the home page.
  const sameUser = otherTab && isSavedUserStrict(arrival.userId, signal.id);
  const target = sameUser ? returnPath : '/';
  const shownReason = signal?.type === 'logout' ? 'signed-out' : arrival.reason;

  // Keep what is shown now, wherever it came from (query, router state or the saved value), so a
  // bare /login later restores it. Overwriting on every visit also drops an older saved reason.
  useEffect(() => {
    if (!isAuthenticated) {
      saveReturn({
        path: returnPath,
        label: arrival.label ?? '',
        reason: arrival.reason,
        userId: arrival.userId,
        account: arrival.account,
        notYou: arrival.notYou,
      });
    }
  }, [isAuthenticated, returnPath, arrival]);

  // A full navigation, not a router one: this tab's store still says "signed out". Always to an
  // absolute URL on this origin, never a bare path.
  const goBack = useCallback(
    () =>
      leaveWithoutPrompt(() =>
        window.location.replace(new URL(target, window.location.origin).href),
      ),
    [target],
  );
  const autoReturn = otherTab && signal.auto;
  useEffect(() => {
    if (!autoReturn) return;
    const timer = setTimeout(goBack, OTHER_TAB_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoReturn, goBack]);

  // Back to the page only for the user who was signed out; anyone else starts from the home page.
  if (leavingSignedIn) {
    const mine = isSavedUserOrUnknown(arrival.userId, signedInId);
    return <Navigate to={mine ? returnPath : '/'} replace />;
  }

  // The spinner and "taking you back" only when it really will; otherwise a static message and the button.
  const view: View | undefined = otherTab
    ? {
        icon: autoReturn ? 'spinner' : 'check',
        tone: 'bg-green-400/15 text-green-400',
        copy: 'otherTab',
      }
    : shownReason && REASON_VIEW[shownReason];
  // Idle and ended say what happens to the user's work and where they land; the others have nothing to add.
  const showReturnBox = shownReason === 'idle' || shownReason === 'ended';
  // After "Not you?" or another tab's sign-out the sign-in starts at home, with nothing of the old page.
  const fresh = forgotten || signal?.type === 'logout';
  const account = showReturnBox && !otherTab && !fresh ? arrival.account : undefined;
  const label = fresh ? undefined : arrival.label;
  const returnTo = label && (
    <>
      {t('interstitial.returnTo')} <b className="font-medium text-white">{label}</b>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0a1428] md:flex-row">
      <div className="h-40 shrink-0 overflow-hidden md:h-auto md:flex-1">
        <img src={skyline} alt="" className="block h-full w-full object-cover" />
      </div>

      <div className="flex flex-1 justify-center md:w-2/5 md:items-center md:min-w-[27rem] md:flex-none">
        <div className="flex w-full flex-col md:max-w-[27rem] gap-5 px-7 py-6 md:px-9 md:py-8">
          <div className="flex items-center justify-between">
            <img src={logo} alt="LH Bank" className="w-[11.5rem]" />
            <LanguageSwitcher onDark />
          </div>

          {view ? (
            <>
              <div className="flex flex-col gap-0.5">
                <div className="text-base font-medium tracking-wide text-white">
                  Collateral Appraisal System
                </div>
                <div className="text-sm text-white/65">{t('interstitial.appSubtitle')}</div>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex items-start gap-3.5">
                <div
                  className={clsx(
                    'flex size-11 shrink-0 items-center justify-center rounded-full text-xl',
                    view.tone,
                  )}
                >
                  <Icon
                    name={view.icon}
                    style="solid"
                    className={clsx(view.icon === 'spinner' && 'animate-spin')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-2xl font-semibold text-white">
                    {t(`interstitial.${view.copy}.title`)}
                  </h1>
                  {view.copy === 'otherTab' && !autoReturn ? (
                    <p role="status" className="text-sm text-pretty text-white/80">
                      {t('interstitial.otherTab.pressToReturn')}
                    </p>
                  ) : view.copy === 'otherTab' ? (
                    <div
                      role="status"
                      className="flex flex-col gap-1 text-sm text-pretty text-white/80"
                    >
                      <p>
                        {sameUser && arrival.label ? (
                          <>
                            {t('interstitial.otherTab.returningTo')}{' '}
                            <b className="font-medium text-white">{arrival.label}</b>
                          </>
                        ) : (
                          t('interstitial.otherTab.returning')
                        )}
                      </p>
                      <p>{t('interstitial.otherTab.noRetype')}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-pretty text-white/80">
                      {t(`interstitial.${view.copy}.body`)}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl font-semibold tracking-wide text-white">
                Collateral Appraisal System
              </h1>
              <div className="text-base text-white/70">{t('interstitial.appSubtitle')}</div>
            </div>
          )}

          {showReturnBox && !otherTab && (
            <div className="flex flex-col gap-2.5 rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white/85">
              {account && (
                <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                  <div
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-base font-semibold text-blue-200"
                  >
                    {account.initials}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="text-base font-medium text-white">{account.displayName}</div>
                    {returnTo && <div className="text-xs text-white/70">{returnTo}</div>}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Icon name="check" style="solid" className="shrink-0 text-green-400" />
                <span>{t('interstitial.saved')}</span>
              </div>
              {!account && returnTo && (
                <div className="flex items-center gap-2.5">
                  <Icon name="reply" style="solid" className="shrink-0 text-blue-300" />
                  <span>{returnTo}</span>
                </div>
              )}
            </div>
          )}

          {otherTab ? (
            <button
              type="button"
              onClick={goBack}
              className="mt-auto h-12 w-full cursor-pointer rounded-md border border-white/30 text-base font-medium text-white hover:bg-white/10 md:mt-0"
            >
              {t('interstitial.otherTab.goNow')}
            </button>
          ) : (
            <div className="mt-auto flex flex-col gap-2.5 md:mt-0">
              {SIGN_IN_METHODS.map((method, index) => {
                const continuing = account && method.acceptsHint;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() =>
                      method.start(
                        fresh ? '/' : returnPath,
                        continuing ? account.username : undefined,
                      )
                    }
                    className={clsx(
                      'h-12 w-full cursor-pointer rounded-md text-base font-medium text-white',
                      index === 0
                        ? 'bg-[#2563eb] hover:bg-[#1d4ed8]'
                        : 'border border-white/35 hover:bg-white/10',
                    )}
                  >
                    {continuing ? (
                      <span className="flex items-center justify-center gap-2.5">
                        <Icon name="lock" style="solid" className="text-lg" />
                        {t('interstitial.continueAs', { name: account.displayName })}
                      </span>
                    ) : (
                      t(method.labelKey)
                    )}
                  </button>
                );
              })}
              {account && (
                <button
                  type="button"
                  onClick={() => {
                    forgetPreviousUser();
                    setForgotten(true);
                    startSignIn('/');
                  }}
                  className="cursor-pointer px-1 py-1.5 text-center text-sm text-blue-300 hover:text-white hover:underline"
                >
                  {t('interstitial.notYou')}
                </button>
              )}
            </div>
          )}

          {showReturnBox && !otherTab && !(account && shownReason === 'idle') && (
            <p className="text-center text-xs text-white/60">
              {t(
                shownReason === 'idle' ? 'interstitial.sharedDevice' : 'interstitial.contactAdmin',
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
