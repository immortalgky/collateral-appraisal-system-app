import { beforeEach, describe, expect, it } from 'vitest';
import { useLocaleStore, useParameterStore } from '../store';
import { getParameterOptions, getParametersByGroup } from './parameterUtils';

const row = (group: string, code: string, seqNo: number, language = 'en') => ({
  parId: seqNo,
  group,
  country: 'th',
  language,
  code,
  description: `${code}-${language}`,
  isActive: true,
  seqNo,
});

const codes = (group: string) => getParametersByGroup(group).map(p => p.code);

beforeEach(() => {
  useLocaleStore.getState().setLocale('th', 'en');
});

describe('parameter option order', () => {
  it('puts "other" (99) last, keeping the rest in SeqNo order', () => {
    // LandEntranceExit as seeded: 99 has a lower SeqNo than the BTS/MRT option.
    useParameterStore
      .getState()
      .setParameters([row('G', '01', 1), row('G', '99', 5), row('G', '05', 6), row('G', '03', 3)]);
    expect(codes('G')).toEqual(['01', '05', '03', '99']);
    expect(getParameterOptions('G').map(o => o.value)).toEqual(['01', '05', '03', '99']);
  });

  it('leaves a group alone when 99 is already last, or absent', () => {
    useParameterStore
      .getState()
      .setParameters([
        row('A', '01', 1),
        row('A', '02', 2),
        row('A', '99', 3),
        row('B', '02', 1),
        row('B', '01', 2),
      ]);
    expect(codes('A')).toEqual(['01', '02', '99']);
    expect(codes('B')).toEqual(['02', '01']);
    // The same array comes back, so memoised readers do not see a change.
    expect(getParametersByGroup('B')).toBe(getParametersByGroup('B'));
  });

  it('applies to the English fallback of another language too', () => {
    useLocaleStore.getState().setLocale('th', 'zh');
    useParameterStore.getState().setParameters([row('G', '99', 1), row('G', '01', 2)]);
    expect(codes('G')).toEqual(['01', '99']);
  });
});
