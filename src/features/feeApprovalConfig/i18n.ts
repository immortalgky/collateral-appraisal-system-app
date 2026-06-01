/**
 * Registers the `feeApprovalConfig` i18n namespace.
 * Import once at the entry-point (FeeApprovalTierPage / AppointmentApprovalRulePage).
 * zh falls back to en until dedicated translations are provided.
 */
import i18n from '@/i18n';
import en from '@/i18n/locales/en/feeApprovalConfig.json';
import th from '@/i18n/locales/th/feeApprovalConfig.json';

i18n.addResourceBundle('en', 'feeApprovalConfig', en, true, false);
i18n.addResourceBundle('th', 'feeApprovalConfig', th, true, false);
i18n.addResourceBundle('zh', 'feeApprovalConfig', en, true, false);
