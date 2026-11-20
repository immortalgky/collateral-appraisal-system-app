import { describe, expect, it } from 'vitest';
import { getSectionsForType, type FieldDef } from './propertyDetailFieldConfigs';

const landlocked = (): FieldDef =>
  getSectionsForType('L', ((k: string) => k) as never)
    .flatMap(s => s.fields)
    .find(f => f.key === 'isLandlocked')!;

describe('360 view: landlocked', () => {
  const read = (record: Record<string, unknown>) => landlocked().read!(record);

  it('reads the land accessibility when there is an answer: only 02 is landlocked', () => {
    expect(read({ landAccessibilityType: '02', isLandlocked: false })).toBe(true);
    expect(read({ landAccessibilityType: '01', isLandlocked: true })).toBe(false);
  });

  it('keeps the old flag when there is no answer, and says nothing when there is neither', () => {
    expect(read({ landAccessibilityType: null, isLandlocked: true })).toBe(true);
    expect(read({ landAccessibilityType: null, isLandlocked: false })).toBe(false);
    expect(read({ landAccessibilityType: '', isLandlocked: true })).toBe(true);
    expect(read({ landAccessibilityType: null, isLandlocked: null })).toBeNull();
    expect(read({ landAccessibilityType: '', isLandlocked: null })).toBeNull();
    expect(read({})).toBeNull();
  });
});

const fieldOf = (key: string): FieldDef =>
  getSectionsForType('L', ((k: string) => k) as never)
    .flatMap(s => s.fields)
    .find(f => f.key === key)!;

describe('360 view: accessibility description and the old landlocked remark', () => {
  it('shows the accessibility description row right after the accessibility row', () => {
    const keys = getSectionsForType('L', ((k: string) => k) as never)
      .flatMap(s => s.fields)
      .map(f => f.key);
    expect(keys.indexOf('landAccessibilityRemark')).toBe(keys.indexOf('landAccessibilityType') + 1);
  });

  const old = (r: Record<string, unknown>) => fieldOf('landlockedRemark').read!(r);

  it('shows the landlocked remark only for the old flag with no accessibility answer', () => {
    expect(old({ landAccessibilityType: null, isLandlocked: true, landlockedRemark: 'old' })).toBe(
      'old',
    );
    expect(old({ landAccessibilityType: '', isLandlocked: true, landlockedRemark: 'old' })).toBe(
      'old',
    );
  });

  it('never repeats the accessibility description, and hides without the old flag', () => {
    for (const answer of ['01', '02', '03', '04'])
      expect(
        old({
          landAccessibilityType: answer,
          landAccessibilityRemark: 'a note',
          landlockedRemark: 'old',
          isLandlocked: true,
        }),
      ).toBeNull();
    expect(
      old({ landAccessibilityType: null, isLandlocked: false, landlockedRemark: 'old' }),
    ).toBeNull();
    expect(old({ landlockedRemark: 'orphan' })).toBeNull();
  });
});
