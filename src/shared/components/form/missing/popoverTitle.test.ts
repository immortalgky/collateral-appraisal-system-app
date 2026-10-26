import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import en from '@/i18n/locales/en/common.json';
import th from '@/i18n/locales/th/common.json';
import zh from '@/i18n/locales/zh/common.json';

// The popover title is plural by its section count (`count`); the number missing is `missing`.
async function translator(lng: 'en' | 'th' | 'zh') {
  const i18n = createInstance();
  await i18n.init({
    lng,
    fallbackLng: false,
    ns: ['common'],
    defaultNS: 'common',
    resources: { en: { common: en }, th: { common: th }, zh: { common: zh } },
    interpolation: { escapeValue: false },
  });
  return i18n.t.bind(i18n);
}

describe('missing.popoverTitle', () => {
  it('is singular for one section and plural for more, in English', async () => {
    const t = await translator('en');
    expect(t('missing.popoverTitle', { count: 1, missing: 1 })).toBe('1 missing in 1 section');
    expect(t('missing.popoverTitle', { count: 2, missing: 5 })).toBe('5 missing in 2 sections');
  });

  it('carries both numbers in Thai and Chinese', async () => {
    const thai = await translator('th');
    expect(thai('missing.popoverTitle', { count: 2, missing: 5 })).toBe('ขาด 5 ช่อง ใน 2 ส่วน');
    const chinese = await translator('zh');
    expect(chinese('missing.popoverTitle', { count: 2, missing: 5 })).toBe('2 个部分共缺 5 项');
  });
});
