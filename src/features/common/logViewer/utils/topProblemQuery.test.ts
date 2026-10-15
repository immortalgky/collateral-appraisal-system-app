import { describe, it, expect } from 'vitest';
import { topProblemToQuery } from './topProblemQuery';
import type { LogTopProblem } from '../types';

const problem = (template: string, sampleMessage = template): LogTopProblem => ({
  template,
  level: 'Error',
  count: 1,
  lastSeen: '2026-01-01T00:00:00',
  sampleMessage,
  sourceContext: null,
});

describe('topProblemToQuery', () => {
  it('quotes the longest literal segment around a single placeholder', () => {
    expect(topProblemToQuery(problem('Failed to send email to {User}'))).toBe(
      '"Failed to send email to"',
    );
  });

  it('picks the longest of several literal segments between placeholders', () => {
    expect(
      topProblemToQuery(problem('{Id} timed out while calling the external appraisal service')),
    ).toBe('"timed out while calling the external appraisal service"');
  });

  it('falls back to splitting on GUIDs and long digit runs for old rows with no template placeholders', () => {
    const msg = 'Request 3f9a8b2e-1234-4abc-9def-abcdef123456 failed after 30000 ms';
    expect(topProblemToQuery(problem(msg))).toBe('"failed after"');
  });

  it('does not treat a short digit run (e.g. an HTTP status) as a split point', () => {
    expect(topProblemToQuery(problem('Request returned status 404 unexpectedly'))).toBe(
      '"Request returned status 404 unexpectedly"',
    );
  });

  it('never joins two non-adjacent segments into one phrase', () => {
    const result = topProblemToQuery(problem('Save {Id} to {Table} failed'));
    // Whichever segment wins must be a single contiguous piece of the original template.
    expect(problem('Save {Id} to {Table} failed').template).toContain(result.replace(/"/g, ''));
    expect(result).toBe('"failed"');
  });

  it('falls back to sampleMessage when every literal segment between placeholders is empty ({A}{B})', () => {
    const result = topProblemToQuery(
      problem('{A}{B}', 'Retrying connection to db01 after 5000 ms'),
    );
    expect(result).toBe('"Retrying connection to db01 after"');
  });

  it('falls back to sampleMessage for a bare {Message} placeholder with no surrounding text', () => {
    const result = topProblemToQuery(
      problem('{Message}', 'Retrying connection to db01 after 5000 ms'),
    );
    expect(result).toBe('"Retrying connection to db01 after"');
  });

  it('returns an empty string (append nothing) when neither template nor sampleMessage has any usable text', () => {
    expect(topProblemToQuery(problem('{A}{B}', ''))).toBe('');
  });

  it('is null-safe when template and sampleMessage are both missing', () => {
    const nullProblem = {
      template: null,
      sampleMessage: null,
      level: 'Error',
      count: 1,
      lastSeen: '2026-01-01T00:00:00',
      sourceContext: null,
    } as unknown as LogTopProblem;
    expect(topProblemToQuery(nullProblem)).toBe('');
  });

  it('falls back to sampleMessage, not the (possibly BE-truncated) template, when there are no placeholders', () => {
    // The BE truncates `template` at a fixed length for the summary aggregation — for a static
    // message (no {Placeholder}), that can cut it off mid-word. `sampleMessage` is never
    // truncated and is the same text here, so the phrase should come from the complete word.
    const truncatedTemplate =
      'The property is a collection or enumeration type with no value comparer. Set one to ensure the collection/enumeratio';
    const fullSampleMessage =
      'The property is a collection or enumeration type with no value comparer. Set one to ensure the collection/enumeration elements are compared correctly.';
    const result = topProblemToQuery(problem(truncatedTemplate, fullSampleMessage));
    expect(result).not.toContain('enumeratio"');
    expect(result.replace(/"/g, '')).toBe(fullSampleMessage);
  });

  it('strips embedded quotes so the phrase does not close early for the BE parser', () => {
    // A real EF Core warning — no {Placeholder}, no GUID, no 4+-digit run, so the whole message
    // is the one "segment", and it quotes a type/property name inline. An unstripped `"` here
    // would close the phrase token right after "The property ", breaking the search.
    const msg =
      'The property \'"Outbox"."Headers"\' is a collection or enumeration type with a value converter but with no value comparer.';
    const result = topProblemToQuery(problem(msg));
    expect(result.startsWith('"')).toBe(true);
    expect(result.endsWith('"')).toBe(true);
    expect(result.slice(1, -1)).not.toContain('"');
  });

  it('also quotes the exceptionType when present, so the query narrows to that exception group', () => {
    const p = {
      ...problem('Failed to send email to {User}'),
      exceptionType: 'System.TimeoutException',
    };
    expect(topProblemToQuery(p)).toBe('"Failed to send email to" "System.TimeoutException"');
  });

  it('appends just the exceptionType when there is no usable message phrase', () => {
    const p = { ...problem('{A}{B}', ''), exceptionType: 'System.TimeoutException' };
    expect(topProblemToQuery(p)).toBe('"System.TimeoutException"');
  });
});
