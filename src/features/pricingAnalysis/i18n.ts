/**
 * Registers the `pricingAnalysis` i18n namespace without editing src/i18n/index.ts.
 * Import this file once at the pricingAnalysis entry-point (e.g. PricingAnalysisPage.tsx).
 */
import i18n from '@/i18n';
import en from '@/i18n/locales/en/pricingAnalysis.json';
import th from '@/i18n/locales/th/pricingAnalysis.json';
import zh from '@/i18n/locales/zh/pricingAnalysis.json';

i18n.addResourceBundle('en', 'pricingAnalysis', en, true, false);
i18n.addResourceBundle('th', 'pricingAnalysis', th, true, false);
i18n.addResourceBundle('zh', 'pricingAnalysis', zh, true, false);
