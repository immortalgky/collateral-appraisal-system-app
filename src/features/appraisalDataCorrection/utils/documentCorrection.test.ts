import { describe, expect, it } from 'vitest';
import type { AppraisalDocumentType } from '@/features/appraisal/types/appraisalDocuments';
import {
  hasNewSummaryFile,
  historyFieldLabel,
  latestSummaryFile,
  pollOutcome,
  POLL_TIMEOUT_MS,
  summaryFileIds,
  isActionField,
} from './documentCorrection';
import { isAllowedValuationDocumentFile } from '@/features/appraisal/utils/valuationDocuments';

const file = (id: string, uploadedAt: string) => ({ id, sortOrder: 0, uploadedAt });
const type = (code: string, files: ReturnType<typeof file>[]): AppraisalDocumentType => ({
  code,
  name: code,
  totalFiles: files.length,
  files,
});

const LABELS = { summary: 'Summary', notified: 'Notified', notNotified: 'Not notified' };

describe('historyFieldLabel', () => {
  const names = new Map([['D005', 'ภาพถ่ายทรัพย์สิน']]);

  it('maps a document type code to its localized name', () => {
    expect(historyFieldLabel('D005', names, LABELS)).toBe('ภาพถ่ายทรัพย์สิน');
  });

  it('maps the regeneration literal to the summary label', () => {
    expect(historyFieldLabel('AppraisalSummary', names, LABELS)).toBe('Summary');
  });

  it('maps the source-system notification literal to its own label', () => {
    expect(historyFieldLabel('ExternalNotification', names, LABELS)).toBe('Notified');
  });

  it('falls back to the raw field for a code it does not know', () => {
    expect(historyFieldLabel('D999', names, LABELS)).toBe('D999');
  });
});

describe('pollOutcome', () => {
  it('waits while no new file has arrived and time remains', () => {
    expect(pollOutcome(false, 5_000)).toBe('waiting');
  });

  it('is done as soon as a new file has arrived', () => {
    expect(pollOutcome(true, 5_000)).toBe('done');
  });

  it('times out at 60 s without a new file', () => {
    expect(pollOutcome(false, POLL_TIMEOUT_MS)).toBe('timeout');
  });

  it('prefers a new file over the deadline', () => {
    expect(pollOutcome(true, POLL_TIMEOUT_MS)).toBe('done');
  });
});

describe('summary files', () => {
  const types = [
    type('D001', [file('a', '2026-09-01T00:00:00Z')]),
    type('D042', [file('b', '2026-09-10T00:00:00Z')]),
    type('D043', [file('c', '2026-09-15T00:00:00Z'), file('d', '2026-09-12T00:00:00Z')]),
  ];

  it('collects D042 and D043 together and ignores other types', () => {
    expect(summaryFileIds(types)).toEqual(['b', 'c', 'd']);
  });

  it('sees a new file even when an old one was deleted in the meantime', () => {
    const afterDeleteAndRegen = [type('D042', [file('e', '2026-09-20T00:00:00Z')]), types[2]];
    expect(hasNewSummaryFile(['b', 'c', 'd'], afterDeleteAndRegen)).toBe(true);
    expect(hasNewSummaryFile(['b', 'c', 'd'], types)).toBe(false);
  });

  it('picks the newest across both codes', () => {
    expect(latestSummaryFile(types)?.id).toBe('c');
  });

  it('returns null / 0 before the documents have loaded', () => {
    expect(latestSummaryFile(undefined)).toBeNull();
    expect(summaryFileIds(undefined)).toEqual([]);
  });
});

describe('isAllowedValuationDocumentFile', () => {
  it.each(['a.pdf', 'b.JPG', 'c.jpeg', 'd.png'])('accepts %s', name => {
    expect(isAllowedValuationDocumentFile(new File([], name))).toBe(true);
  });

  it.each(['a.docx', 'b.pdf.exe', 'noext'])('rejects %s', name => {
    expect(isAllowedValuationDocumentFile(new File([], name))).toBe(false);
  });
});

describe('historyFieldLabel — skipped notification', () => {
  it('labels a regeneration that chose not to notify', () => {
    expect(historyFieldLabel('ExternalNotificationSkipped', new Map(), LABELS)).toBe(
      'Not notified',
    );
  });
});

describe('isActionField', () => {
  it('treats regenerate and notify rows as actions, document codes as value changes', () => {
    expect(isActionField('AppraisalSummary')).toBe(true);
    expect(isActionField('ExternalNotification')).toBe(true);
    expect(isActionField('ExternalNotificationSkipped')).toBe(true);
    expect(isActionField('D005')).toBe(false);
  });
});
