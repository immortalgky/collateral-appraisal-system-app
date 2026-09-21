import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  buildSegmentText,
  clampSegmentToMin,
  clearSegment,
  dateFromParts,
  isPartsComplete,
  isPartsEmpty,
  partsFromDate,
  parsePastedText,
  segmentIndexAt,
  segmentsFor,
  stepSegment,
  typeDigitIntoSegment,
  type SegmentParts,
} from './dateSegments';

interface UseDateSegmentInputOptions {
  /** The value the form currently holds. The field always falls back to this. */
  value: Date | null;
  withTime: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Fires only for a complete, real, allowed date — or null when the field is cleared. */
  onCommit: (date: Date | null) => void;
  /** Constraint check; return a message to reject the date, or null to accept it. */
  validate?: (date: Date) => string | null;
  /** Called with every accepted date so the calendar can follow what was typed. */
  onNavigate?: (date: Date) => void;
  disabled?: boolean;
}

/**
 * Drives a date (or date-time) text field as a set of fixed segments.
 *
 * The user edits one part at a time — click or arrow to a segment, type over it, or step it with
 * ↑/↓ — instead of retyping the whole value, and the separators are never editable, so the format
 * stays locked. Nothing reaches the form until the value is complete and legal; a half-typed value
 * is rolled back on blur rather than left sitting in the field.
 */
export function useDateSegmentInput({
  value,
  withTime,
  inputRef,
  onCommit,
  validate,
  onNavigate,
  disabled,
}: UseDateSegmentInputOptions) {
  const segments = useMemo(() => segmentsFor(withTime), [withTime]);

  const [parts, setParts] = useState<SegmentParts>(() => partsFromDate(value, segments));
  const [buffer, setBuffer] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `tick` re-runs the selection effect even when the segment index has not changed, so clicking
  // twice inside the same segment still re-selects it instead of leaving a bare caret.
  const [selection, setSelection] = useState({ index: 0, tick: 0 });

  // Read by focusSegment, which has to look at the segment being left rather than the one it is
  // moving to. Every write goes through applyParts so the ref is exact *within* an event too —
  // a keystroke sets the parts and then moves the caret in the same handler, and a plain
  // render-time assignment would still be showing the previous keystroke's value at that point.
  const partsRef = useRef(parts);
  const applyParts = useCallback((next: SegmentParts) => {
    partsRef.current = next;
    setParts(next);
  }, []);
  const selectionIndexRef = useRef(selection.index);
  selectionIndexRef.current = selection.index;

  const valueRef = useRef(value);
  valueRef.current = value;
  // The timestamp of our own last commit, so we can tell the form echoing us back from someone
  // else changing the value. Without it, typing the first digit of a two-digit part commits a
  // valid date, the echo wipes the digit buffer, and the second digit starts a new number —
  // "15" into the day would land as "05".
  const lastCommittedRef = useRef<number | null | undefined>(undefined);

  // Adopt whatever the form holds. Keyed on the timestamp because the parent hands us a fresh
  // Date object on every render, which would otherwise reset the field mid-edit.
  const valueTime = value ? value.getTime() : null;
  useEffect(() => {
    if (lastCommittedRef.current === valueTime) return;
    applyParts(partsFromDate(valueRef.current, segments));
    setBuffer('');
    setError(null);
    // The ref means "what the field is showing", not "the last thing we sent". Leaving it on an
    // older commit made the guard fire on a value we had never adopted: type a date, pick another
    // one in the calendar, pick the first one again — and the field kept showing the second while
    // the form held the first.
    //
    // Stored as the segments render it, not as the parent holds it. The field has no seconds, and
    // a date-only field has no time of day at all, so a value that carries either would never
    // compare equal to what `commit` builds — and every focus-and-tab through an untouched field
    // would then publish the truncated version, quietly moving a stored 09:30 to midnight (and,
    // where a server offset had already pushed it to 17:00 the day before, walking the date back
    // a day). Comparing the round-trip means "unchanged" means what the user can actually see.
    const shown = dateFromParts(partsFromDate(valueRef.current, segments), segments);
    lastCommittedRef.current = shown ? shown.getTime() : valueTime;
  }, [valueTime, segments, applyParts]);

  const text = useMemo(
    () => (!isPartsEmpty(parts, segments) || focused ? buildSegmentText(parts, segments) : ''),
    [parts, segments, focused],
  );

  // Keep the active segment highlighted after every change, so typing, stepping and clicking all
  // leave the caret on the part the user is working on.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || document.activeElement !== el) return;
    const segment = segments[selection.index];
    el.setSelectionRange(segment.start, segment.start + segment.length);
  }, [selection, text, segments, inputRef]);

  const commit = useCallback(
    (next: SegmentParts, { partial = false }: { partial?: boolean } = {}) => {
      if (isPartsEmpty(next, segments)) {
        setError(null);
        if (valueRef.current) {
          lastCommittedRef.current = null;
          onCommit(null);
        }
        return;
      }
      if (!isPartsComplete(next, segments)) {
        setError(null);
        return;
      }
      const date = dateFromParts(next, segments);
      if (!date) {
        // `partial` means the user is still inside a segment with more digits to come — the year
        // is 2 on its way to 2026, say. Every date is illegal on the way there, and complaining
        // three times per year typed is noise, not help. The message waits for the segment to
        // settle (auto-advance, arrow, click, or blur).
        setError(partial ? null : 'Invalid date');
        return;
      }
      // …and nothing is published on the way there either. Re-typing the day of a filled field
      // passes through a complete, legal date after the first digit (03 → 02 → 25), and pushing
      // that to the form is how a rejected final value left the form holding a date the user
      // never chose: 25 fails the future-date rule and stops here, while 02 had already been
      // saved. Segments settle through focusSegment and handleBlur, which commit for real.
      if (partial) {
        setError(null);
        return;
      }
      // Nothing to say when the form already holds this instant. This has to come BEFORE the
      // constraint check: leaving a field settles it, so a stored value that breaks a rule it was
      // saved under — a meeting that has already started, under `disablePastDates` — would
      // otherwise raise a red message the moment the user tabs past a field they never touched,
      // about something they cannot fix. Re-emitting would also hand the parent a fresh Date and
      // dirty a form nobody edited.
      if (lastCommittedRef.current === date.getTime()) {
        setError(null);
        return;
      }
      const violation = validate?.(date) ?? null;
      if (violation) {
        setError(violation);
        return;
      }
      setError(null);
      lastCommittedRef.current = date.getTime();
      onCommit(date);
      onNavigate?.(date);
    },
    [segments, onCommit, onNavigate, validate],
  );

  /**
   * The segment the caret is on is finished with: fix a lone "0" the user left in it, drop the
   * digit buffer, and publish. Keystrokes no longer publish on their own, so this — not the
   * typing — is what puts a value typed one digit at a time into the form.
   *
   * Called from every way out of a segment, including the ones that do not move the caret:
   * arrowing off either end of the field, re-clicking the segment you are already on, and Enter,
   * which submits the enclosing form without ever firing a blur.
   */
  const settleSegment = useCallback(() => {
    const fixed = clampSegmentToMin(partsRef.current, segments, selectionIndexRef.current);
    if (fixed !== partsRef.current) applyParts(fixed);
    setBuffer('');
    commit(fixed);
  }, [segments, commit, applyParts]);

  const focusSegment = useCallback(
    (index: number) => {
      settleSegment();
      const clamped = Math.max(0, Math.min(segments.length - 1, index));
      setSelection(prev => ({ index: clamped, tick: prev.tick + 1 }));
    },
    [segments, settleSegment],
  );

  /**
   * Put the field back on a value chosen somewhere else — the calendar, the time footer, a
   * Discard that resets the form. The adopt effect cannot do it: it is keyed on the value
   * changing, and picking the date the form already holds changes nothing, which would leave a
   * rejected value and its red message sitting in the field. Callers pass what they just emitted,
   * because the parent's prop has not come back round yet.
   */
  const showValue = useCallback(
    (date: Date | null) => {
      const next = partsFromDate(date, segments);
      applyParts(next);
      setBuffer('');
      setError(null);
      const shown = dateFromParts(next, segments);
      lastCommittedRef.current = shown ? shown.getTime() : null;
    },
    [segments, applyParts],
  );

  const handleFocus = useCallback(() => {
    setFocused(true);
    const firstEmpty = segments.findIndex(segment => parts[segment.key] == null);
    focusSegment(firstEmpty === -1 ? 0 : firstEmpty);
  }, [segments, parts, focusSegment]);

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<HTMLInputElement>) => {
      const caret = event.currentTarget.selectionStart ?? 0;
      focusSegment(segmentIndexAt(caret, segments));
    },
    [segments, focusSegment],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      // Tab blurs, so handleBlur settles that one. Enter submits the surrounding form with no
      // blur at all, so the half-typed segment has to be settled here or the save takes a value
      // the field is no longer showing. Neither key is swallowed.
      if (event.key === 'Tab' || event.key === 'Enter') {
        settleSegment();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return; // leave copy/paste alone

      const index = selection.index;

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        const result = typeDigitIntoSegment(parts, segments, index, event.key, buffer);
        applyParts(result.parts);
        setBuffer(result.buffer);
        commit(result.parts, { partial: result.buffer.length > 0 });
        if (result.advance && index < segments.length - 1) focusSegment(index + 1);
        else setSelection(prev => ({ ...prev, tick: prev.tick + 1 }));
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const next = stepSegment(parts, segments, index, event.key === 'ArrowUp' ? 1 : -1);
        applyParts(next);
        setBuffer('');
        commit(next);
        setSelection(prev => ({ ...prev, tick: prev.tick + 1 }));
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        focusSegment(index + 1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        focusSegment(index - 1);
        return;
      }
      // The separators are part of the template, so typing one just confirms the segment.
      if (event.key === '/' || event.key === ':' || event.key === ' ') {
        event.preventDefault();
        focusSegment(index + 1);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        // Backspace on a segment that is already empty moves on to the nearest one that still
        // holds something — to the left first, the way ordinary text deletes, and otherwise to
        // the right. Without that second half the field could not be emptied at all from the
        // segment it opens on: focus lands on the day, and every further press just re-cleared
        // the day it had already emptied, leaving month and year for blur to restore. Delete
        // stays put and only clears the segment the user is on.
        const isAlreadyEmpty = parts[segments[index].key] == null;
        let target = index;
        if (event.key === 'Backspace' && isAlreadyEmpty) {
          const filled = (i: number) => parts[segments[i].key] != null;
          let candidate = index - 1;
          while (candidate >= 0 && !filled(candidate)) candidate--;
          if (candidate < 0) {
            candidate = index + 1;
            while (candidate < segments.length && !filled(candidate)) candidate++;
          }
          if (candidate >= 0 && candidate < segments.length) target = candidate;
        }

        const next = clearSegment(parts, segments, target);
        applyParts(next);
        setBuffer('');
        setError(null);
        commit(next);
        if (target === index) setSelection(prev => ({ ...prev, tick: prev.tick + 1 }));
        else focusSegment(target);
        return;
      }

      // Anything else printable would break the format.
      if (event.key.length === 1) event.preventDefault();
    },
    [
      disabled,
      selection.index,
      parts,
      segments,
      buffer,
      commit,
      focusSegment,
      applyParts,
      settleSegment,
    ],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const pasted = parsePastedText(event.clipboardData.getData('text'), segments);
      if (!pasted) return;
      applyParts(pasted);
      setBuffer('');
      commit(pasted);
    },
    [segments, commit, applyParts],
  );

  const handleBlur = useCallback(() => {
    setFocused(false);
    setBuffer('');

    if (isPartsEmpty(parts, segments)) {
      setError(null);
      return;
    }

    // Fix a lone "0" first, then judge what is left: clamping alone does not make a date, and
    // returning here left the field showing 01/mm/yyyy for a form that still held null.
    const settled = clampSegmentToMin(parts, segments, selectionIndexRef.current);
    if (settled !== parts) applyParts(settled);
    commit(settled);

    // A value the user never finished typing is not a value — fall back to what the form holds.
    // A finished-but-rejected one keeps its text and its message, so the reason stays on screen.
    if (!isPartsComplete(settled, segments)) {
      applyParts(partsFromDate(valueRef.current, segments));
      setError(null);
      return;
    }
    // Complete but impossible (a year still one digit long, say). Nothing was committed, and the
    // message was held back while the segment was being typed into — this is where it lands.
    if (!dateFromParts(settled, segments)) setError('Invalid date');
  }, [parts, segments, commit, applyParts]);

  return {
    text,
    error,
    isIncomplete: !isPartsComplete(parts, segments),
    focusSegment,
    showValue,
    inputProps: {
      value: text,
      onChange: () => {}, // controlled: every real edit goes through onKeyDown/onPaste
      onFocus: handleFocus,
      onMouseUp: handleMouseUp,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste,
      onBlur: handleBlur,
    },
  };
}
