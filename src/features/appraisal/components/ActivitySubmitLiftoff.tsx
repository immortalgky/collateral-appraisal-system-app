import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/shared/utils/dateUtils';
import { getInitials } from '@/shared/utils/stringUtils';
import type { LiftoffPayload } from '../store/liftoffStore';
import type { LiftoffScene } from './summary/decisionHelpers';
import '@/styles/liftoff.css';

// FontAwesome solid paper-plane — inlined so the overlay does not depend on the icon sprite.
const PLANE_PATH =
  'M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3.3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z';

const CONFETTI_COLORS = [
  'var(--lo-accent)',
  'var(--lo-coral)',
  'var(--lo-flame)',
  'var(--lo-plane)',
  '#7dd3fc',
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Randomised decoration (sparks at launch, confetti when the card lands; every scene gets both),
 *  drawn once per overlay so a re-render never reshuffles it. */
const makeDecor = () => ({
  sparks: Array.from({ length: 14 }, (_, k) => {
    const a = rnd(0, Math.PI * 2);
    const r = rnd(18, 70);
    return {
      flame: k % 3 === 0,
      style: {
        '--dx': `${Math.cos(a) * r}px`,
        '--dy': `${Math.sin(a) * r}px`,
      } as CSSProperties,
    };
  }),
  confetti: Array.from({ length: 56 }, (_, i) => {
    const ang = rnd(0, Math.PI * 2);
    const dist = rnd(120, 360);
    return {
      style: {
        background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        '--dx': `${Math.cos(ang) * dist}px`,
        '--dy': `${Math.sin(ang) * dist + 220}px`,
        '--r': `${rnd(-540, 540)}deg`,
        '--t': `${rnd(1.1, 1.9)}s`,
      } as CSSProperties,
    };
  }),
});

/** Flight path in overlay (= viewport) coordinates: from the icon's centre, a short dip, then a
 *  sweeping arc up through the screen centre and off the top edge (`back`: exits top-left). */
const buildPath = (root: HTMLElement, origin: { x: number; y: number } | null, back: boolean) => {
  const s = root.getBoundingClientRect();
  const x0 = origin ? origin.x - s.left : s.width * 0.8;
  const y0 = origin ? origin.y - s.top : s.height - 48;
  const cx = s.width * 0.5;
  const x1 = x0 - s.width * 0.22;
  const y1 = y0 - s.height * 0.42;
  const x2 = cx + s.width * 0.12;
  const y2 = y0 - s.height * 0.1;
  const x3 = back ? s.width * 0.12 : cx + s.width * 0.3;
  const y3 = -60;
  const d = `M${x0} ${y0} c 4 -28 -16 -52 -46 -72 C ${x1} ${y1} ${x2} ${y2} ${cx} ${y0 - s.height * 0.48} S ${x3} ${y3 + 120} ${x3} ${y3}`;
  return { d, x0, y0 };
};

/** Scenes whose plane exits top-left ("handed back") instead of top-right. */
const EXITS_LEFT: LiftoffScene[] = ['reject', 'routeBack'];

/** Keys under `liftoff.title` / `.subtitle`. */
type TitleKey =
  | 'forward'
  | 'routeBack'
  | 'cancel'
  | 'final'
  | 'voteApprove'
  | 'voteReject'
  | 'voteRouteBack';
type SubtitleKey =
  | 'forward'
  | 'routeBack'
  | 'cancel'
  | 'final'
  | 'votePending'
  | 'voteResolved'
  | 'voteMoved'
  | 'voteSentBack'
  | 'voteSentBackNoName'
  | 'voteClosed';

/** Title per scene. `approve` and `reject` only ever come from committee votes. */
const TITLE: Record<LiftoffScene, TitleKey> = {
  forward: 'forward',
  routeBack: 'routeBack',
  cancel: 'cancel',
  final: 'final',
  approve: 'voteApprove',
  reject: 'voteReject',
};

const copyFor = (
  scene: LiftoffScene,
  voteOutcome: LiftoffPayload['voteOutcome'],
  nextActivityName: string | null,
): { titleKey: TitleKey; subtitleKey: SubtitleKey } => {
  if (!voteOutcome) {
    // The plain subtitle is named after the scene; approve / reject never reach here (votes only).
    const plain = scene === 'approve' || scene === 'reject' ? 'forward' : scene;
    return { titleKey: TITLE[scene], subtitleKey: plain };
  }
  // A vote is titled as a vote, and its subtitle says what it did to the round.
  const titleKey = scene === 'routeBack' ? 'voteRouteBack' : TITLE[scene];
  // Once the round moved, "passed on to" would contradict a route-back vote ("sent back to").
  const movedKey: SubtitleKey =
    scene === 'routeBack'
      ? nextActivityName
        ? 'voteSentBack'
        : 'voteSentBackNoName'
      : nextActivityName
        ? 'voteResolved'
        : 'voteMoved';
  const subtitleKey: SubtitleKey =
    voteOutcome === 'pending' ? 'votePending' : voteOutcome === 'ended' ? 'voteClosed' : movedKey;
  return { titleKey, subtitleKey };
};

export interface ActivitySubmitLiftoffProps extends Omit<LiftoffPayload, 'to'> {
  /** The countdown ending, the OK button, Enter, Escape, or a click outside the card. At most once.
   *  The host (App.tsx) closes the card and navigates to the payload's `to` here. */
  onDone: () => void;
}

/**
 * Success overlay shown after a submit: the Submit button's paper-plane flies out of the page, then
 * a card says what happened and, when known, who has the work next. Two callers: completing a
 * workflow activity (decision page) and submitting a request (request page). It is mounted once at
 * app level (App.tsx) and plays over the page that submitted, which stays on screen but inert; the
 * app leaves for the next page only through `onDone`, when the card closes. `origin` is where the
 * Submit icon was, read by the page when it started the submit. Its copy lives in the `common`
 * namespace (see the useTranslation call).
 * It is a Headless UI Dialog (as Modal is), which supplies the portal, focus trap, inert page,
 * scroll lock, Escape / backdrop-click and focus restore. It closes itself: the countdown, OK,
 * Enter, Escape and a click outside the card all call `onDone` (once), but only once the card has
 * landed; the flight itself is deliberately not interruptible.
 * Motion and timings live in styles/liftoff.css; the countdown is a CSS animation whose end closes it.
 */
const ActivitySubmitLiftoff = ({
  origin,
  scene,
  voteOutcome,
  nextActivityName,
  nextAssigneeName,
  nextAssigneeCode,
  referenceNumber,
  onDone,
}: ActivitySubmitLiftoffProps) => {
  // `common`, not `appraisal`: it is the one namespace bundled inline for th and zh. The overlay is
  // also used by the request page, and must not wait on the (large, lazy) appraisal namespace.
  const { t } = useTranslation('common');
  // A state, not a ref object: Dialog mounts its content through a portal, which may land a render
  // after this component, and the flight can only be aimed once the root element exists.
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const flyerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [decor] = useState(makeDecor);
  const [sentAt] = useState(() => formatDate(new Date(), 'HH:mm'));
  // `play` starts every animation, once the flight path is set; `ready` is set when the card's
  // rise animation ends: it is visible and interactive from then on.
  const [play, setPlay] = useState(false);
  const [ready, setReady] = useState(false);
  // Fallback: if the flight never got aimed or the rise never reports its end, still show the card
  // (and run its countdown) and make the dialog closable.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlay(true);
      setReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // The latest callback, and a latch so a click landing together with the countdown's end (or
  // Enter on the focused button, which also fires a click) closes once.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const doneRef = useRef(false);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current();
  }, []);
  // Every way out goes through here: the flight is deliberately not interruptible, so Escape, a
  // backdrop click, Enter and OK do nothing until the card has landed.
  const closeIfReady = () => {
    if (ready) finish();
  };

  // Aim the flight at where the button was, then flip `play`. This runs before the first paint, and
  // the state change re-renders synchronously, so the browser never shows an un-aimed frame.
  useLayoutEffect(() => {
    const flyer = flyerRef.current;
    const trail = trailRef.current;
    if (!root || !flyer || !trail) return;
    const { d, x0, y0 } = buildPath(root, origin, EXITS_LEFT.includes(scene));
    root.style.setProperty('--lo-x0', `${x0}px`);
    root.style.setProperty('--lo-y0', `${y0}px`);
    flyer.style.setProperty('--path', `path("${d}")`);
    trail.setAttribute('d', d);
    setPlay(true);
  }, [root, origin, scene]);

  // The Dialog puts initial focus on the heading (`initialFocus`), so the OK button is not focused
  // while the card is still invisible. Once the card has landed, focus is put there again, in case
  // it moved meanwhile, so a screen reader reads the outcome (a live region's initial content is
  // not announced). Dialog itself restores focus on unmount.
  useEffect(() => {
    if (ready) titleRef.current?.focus({ preventScroll: true });
  }, [ready]);

  // Dialog supplies the focus trap, inert page, scroll lock, Escape and backdrop click (onClose).

  const youLabel = t('liftoff.you');
  const toName = nextAssigneeName || nextActivityName || '';
  const toRole = nextAssigneeName ? nextActivityName : null;
  // The user code beside the name, unless it just repeats it.
  const code = nextAssigneeCode?.trim();
  const toCode =
    nextAssigneeName && code && code.toLowerCase() !== nextAssigneeName.trim().toLowerCase()
      ? code
      : null;
  // With no named assignee the "to" node is a step, not a person: it gets a step icon instead of
  // initials, and a label that says what the step is (where it went back to, or just the next one).
  const toIsStep = !nextAssigneeName;
  const toLabel = t(
    scene === 'routeBack' ? 'liftoff.backTo' : nextAssigneeName ? 'liftoff.to' : 'liftoff.nextStep',
  );
  // A hand-off row only when we know who/what is next. Not after a cancel or the final step, and
  // not for a vote that is still waiting on other members or that ended the workflow.
  const showHandoff =
    scene !== 'final' &&
    scene !== 'cancel' &&
    voteOutcome !== 'pending' &&
    voteOutcome !== 'ended' &&
    !!toName;
  const note = scene === 'final' ? t('liftoff.finalNote') : null;
  // Every committee vote stamps the member's own vote, whether or not it closed the round.
  const stamp = !voteOutcome
    ? null
    : scene === 'approve'
      ? t('liftoff.approveStamp')
      : scene === 'reject'
        ? t('liftoff.rejectStamp')
        : scene === 'routeBack'
          ? t('liftoff.routeBackStamp')
          : null;
  const { titleKey, subtitleKey } = copyFor(scene, voteOutcome, nextActivityName);

  return (
    <Dialog
      open
      initialFocus={titleRef}
      onClose={closeIfReady}
      ref={setRoot}
      className={`liftoff liftoff-${scene}${stamp ? ' liftoff-stamped' : ''}${play ? ' liftoff-play' : ''}`}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <path id="liftoff-plane-path" d={PLANE_PATH} />
          <linearGradient id="liftoff-plane-grad" x1="0" y1="0" x2="1" y2="1">
            {/* style, not the stop-color attribute: var() in a presentation attribute is not
                portable across browsers */}
            <stop offset="0" style={{ stopColor: 'var(--lo-plane)' }} />
            <stop offset="0.55" style={{ stopColor: 'var(--lo-plane)' }} />
            <stop offset="1" style={{ stopColor: 'var(--lo-plane-shade)' }} />
          </linearGradient>
        </defs>
      </svg>

      <div className="liftoff-scrim" />
      <svg className="liftoff-trail" aria-hidden="true">
        <path ref={trailRef} d="M0 0" pathLength="1" />
      </svg>
      <div aria-hidden="true">
        {decor.sparks.map((s, k) => (
          <div
            key={k}
            className={`liftoff-spark${s.flame ? ' liftoff-spark-flame' : ''}`}
            style={s.style}
          />
        ))}
      </div>
      <div ref={flyerRef} className="liftoff-flyer" aria-hidden="true">
        <div className="liftoff-plane3d">
          <svg viewBox="0 0 512 512">
            <use href="#liftoff-plane-path" fill="url(#liftoff-plane-grad)" />
          </svg>
        </div>
      </div>
      <div aria-hidden="true">
        {decor.confetti.map((c, i) => (
          <div key={i} className="liftoff-confetti" style={c.style} />
        ))}
      </div>

      <DialogPanel
        className={`liftoff-card${ready ? ' liftoff-card-ready' : ''}`}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.repeat) closeIfReady();
        }}
        onAnimationEnd={e => {
          // Only the card's own rise (the check, stamp and countdown animations bubble up here).
          if (e.target === e.currentTarget && e.animationName === 'liftoff-rise') setReady(true);
        }}
      >
        <div className="liftoff-check" aria-hidden="true">
          <svg viewBox="0 0 76 76">
            <circle className="liftoff-ring" cx="38" cy="38" r="34" />
            {scene === 'reject' ? (
              <path className="liftoff-cross" d="M27 27 L49 49 M49 27 L27 49" />
            ) : (
              <path className="liftoff-mark" d="M23 39 L33 49 L54 27" />
            )}
          </svg>
          <svg className="liftoff-landed" viewBox="0 0 512 512">
            <use href="#liftoff-plane-path" />
          </svg>
        </div>
        {stamp && (
          <>
            <div className="liftoff-stamp" aria-hidden="true">
              {stamp}
            </div>
            <div className="liftoff-stamper" aria-hidden="true">
              <div className="liftoff-shadow" />
              <div className="liftoff-handle" />
              <div className="liftoff-neck" />
              <div className="liftoff-base" />
            </div>
          </>
        )}
        <div className="liftoff-body">
          {/* Only the outcome is announced, not the hand-off row, meta or buttons. */}
          <div role="status" aria-live="polite">
            <DialogTitle as="h2" ref={titleRef} tabIndex={-1}>
              {t(`liftoff.title.${titleKey}`)}
            </DialogTitle>
            <p className="liftoff-sub">
              {t(`liftoff.subtitle.${subtitleKey}`, {
                name: nextActivityName ?? '',
              })}
            </p>
          </div>

          {showHandoff && (
            <div className="liftoff-handoff">
              <div className="liftoff-node liftoff-from">
                <div className="liftoff-avatar">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div className="liftoff-who">
                  <div className="liftoff-label">{t('liftoff.from')}</div>
                  <div className="liftoff-name">{youLabel}</div>
                </div>
              </div>
              <div className="liftoff-arrow" aria-hidden="true">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </div>
              <div className="liftoff-node liftoff-to">
                <div className="liftoff-avatar">
                  {toIsStep ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 21V4" />
                      <path d="M5 4h12l-2 4 2 4H5" />
                    </svg>
                  ) : (
                    getInitials(toName)
                  )}
                </div>
                <div className="liftoff-who">
                  <div className="liftoff-label">{toLabel}</div>
                  <div className="liftoff-name" title={toCode ? `${toName} (${toCode})` : toName}>
                    {toName}
                    {toCode && <span className="liftoff-code">{toCode}</span>}
                  </div>
                  {toRole && <div className="liftoff-role">{toRole}</div>}
                </div>
              </div>
            </div>
          )}
          {note && <div className="liftoff-note">{note}</div>}

          <div className="liftoff-meta">
            {referenceNumber && (
              <>
                <span>
                  {t('liftoff.referenceLabel')} <code>{referenceNumber}</code>
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>
              {t('liftoff.sentAt')} <code>{sentAt}</code>
            </span>
          </div>

          <div className="liftoff-actions">
            <button
              type="button"
              className="liftoff-btn liftoff-btn-primary"
              onClick={closeIfReady}
            >
              <svg className="liftoff-countdown" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="7" />
                <circle className="liftoff-prog" cx="9" cy="9" r="7" onAnimationEnd={finish} />
              </svg>
              {t('liftoff.done')}
            </button>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
};

export default ActivitySubmitLiftoff;
