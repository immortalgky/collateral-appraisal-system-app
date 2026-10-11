import { afterEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import { LAND_TITLE_NUMBER_MAX } from '../configs/fields';
import { RequestTitleDto, requestTitleDefault } from './form';

const messageFor = (collateralType: string) => {
  const result = RequestTitleDto.safeParse({
    ...structuredClone(requestTitleDefault),
    collateralType,
    titleType: 'DEED',
    titleNumber: 'x'.repeat(LAND_TITLE_NUMBER_MAX + 1),
  });
  return result.success
    ? undefined
    : result.error.issues.find(i => i.path.join('.') === 'titleNumber' && i.code === 'custom')
        ?.message;
};

describe('the title number length rule', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('speaks the UI language, with the limit in it', async () => {
    await i18n.loadNamespaces('request');
    await i18n.changeLanguage('en');
    expect(messageFor('01')).toBe(
      `Title number must be at most ${LAND_TITLE_NUMBER_MAX} characters.`,
    );
    await i18n.changeLanguage('th');
    expect(messageFor('01')).toBe(`เลขที่โฉนดต้องไม่เกิน ${LAND_TITLE_NUMBER_MAX} ตัวอักษร`);
    await i18n.changeLanguage('zh');
    expect(messageFor('01')).toContain(String(LAND_TITLE_NUMBER_MAX));
  });

  it('does not apply to a condominium, whose number is a list of land titles', async () => {
    await i18n.loadNamespaces('request');
    expect(messageFor('08')).toBeUndefined();
  });
});
