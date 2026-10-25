import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import th from '../../../i18n/locales/th/jobSchedules.json';
import en from '../../../i18n/locales/en/jobSchedules.json';
import { describeCron, parseCron } from './cron';
import { formatTimeUntil } from './jobTimes';

const fixedT = async (lng: 'th' | 'en') => {
  const i18n = createInstance();
  await i18n.init({ lng, resources: { th: { jobSchedules: th }, en: { jobSchedules: en } } });
  return i18n.getFixedT(lng, 'jobSchedules');
};

describe('parseCron', () => {
  it('reads the four shapes the jobs use', () => {
    expect(parseCron('0 * * * *')).toEqual({ kind: 'hourly', minute: 0 });
    expect(parseCron('15 * * * *')).toEqual({ kind: 'hourly', minute: 15 });
    expect(parseCron('0 4 * * *')).toEqual({ kind: 'daily', minute: 0, hour: 4 });
    expect(parseCron('30 2 * * *')).toEqual({ kind: 'daily', minute: 30, hour: 2 });
    expect(parseCron('0 4 2 * *')).toEqual({ kind: 'monthly', minute: 0, hour: 4, day: 2 });
    expect(parseCron('0 9 * * 1')).toEqual({ kind: 'weekly', minute: 0, hour: 9, weekday: 1 });
  });

  it('treats weekday 7 as Sunday and ignores extra spaces', () => {
    expect(parseCron('  0  9 * *  7 ')).toEqual({ kind: 'weekly', minute: 0, hour: 9, weekday: 0 });
  });

  it('gives up on anything else instead of guessing', () => {
    for (const cron of [
      '*/5 * * * *',
      '0 */2 * * *',
      '0 9-17 * * *',
      '0 9 * * 1-5',
      '0 9 1,15 * *',
      '0 4 2 3 *',
      '0 4 2 * 1',
      '60 * * * *',
      '0 24 * * *',
      '0 4 32 * *',
      '0 4 0 * *',
      '0 0 4 * * *',
      '* * * * *',
      '',
    ])
      expect(parseCron(cron), cron).toBeNull();
  });
});

describe('describeCron', () => {
  it('speaks Thai', async () => {
    const t = await fixedT('th');
    expect(describeCron('0 * * * *', t)).toBe('ทุกชั่วโมง (นาทีที่ 00)');
    expect(describeCron('15 * * * *', t)).toBe('ทุกชั่วโมง (นาทีที่ 15)');
    expect(describeCron('0 4 * * *', t)).toBe('ทุกวัน 04:00');
    expect(describeCron('0 4 2 * *', t)).toBe('ทุกเดือน วันที่ 2 เวลา 04:00');
    expect(describeCron('30 9 * * 1', t)).toBe('ทุกสัปดาห์ วันจันทร์ 09:30');
    expect(describeCron('*/5 * * * *', t)).toBeNull();
  });

  it('speaks English', async () => {
    const t = await fixedT('en');
    expect(describeCron('0 4 * * *', t)).toBe('Daily at 04:00');
    expect(describeCron('30 9 * * 0', t)).toBe('Weekly on Sunday at 09:30');
  });
});

describe('formatTimeUntil', () => {
  it('rounds to the nearest minute, hour or day and is empty for the past', async () => {
    const t = await fixedT('th');
    const now = new Date('2026-10-25T19:35:00');
    expect(formatTimeUntil('2026-10-25T20:00:00', now, t)).toBe('อีก 25 นาที');
    expect(formatTimeUntil('2026-10-26T02:00:00', now, t)).toBe('อีก 6 ชั่วโมง');
    expect(formatTimeUntil('2026-11-02T04:00:00', now, t)).toBe('อีก 7 วัน');
    expect(formatTimeUntil('2026-10-25T19:00:00', now, t)).toBe('ถึงกำหนดแล้ว');
    expect(formatTimeUntil('not a date', now, t)).toBe('');
  });

  it('never says 60 minutes or 24 hours at the boundaries', async () => {
    const t = await fixedT('en');
    const now = new Date('2026-10-25T19:00:00');
    expect(formatTimeUntil('2026-10-25T19:59:40', now, t)).toBe('in 1 h');
    expect(formatTimeUntil('2026-10-26T18:40:00', now, t)).toBe('in 1 day');
    expect(formatTimeUntil('2026-10-25T19:00:10', now, t)).toBe('in 1 min');
  });
});
