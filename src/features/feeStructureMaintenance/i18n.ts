/**
 * Registers the `feeStructureMaintenance` i18n namespace.
 * Import once at the entry-point (FeeStructurePage).
 * zh falls back to en until dedicated translations are provided.
 */
import i18n from '@/i18n';
import en from '@/i18n/locales/en/feeStructureMaintenance.json';
import th from '@/i18n/locales/th/feeStructureMaintenance.json';

i18n.addResourceBundle('en', 'feeStructureMaintenance', en, true, false);
i18n.addResourceBundle('th', 'feeStructureMaintenance', th, true, false);
i18n.addResourceBundle('zh', 'feeStructureMaintenance', en, true, false);
