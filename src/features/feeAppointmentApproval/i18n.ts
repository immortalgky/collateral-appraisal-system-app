/**
 * Registers the `feeAppointmentApproval` i18n namespace.
 * Import once at the entry-point (FeeAppointmentApprovalTaskPage.tsx).
 * zh falls back to en until dedicated translations are provided.
 */
import i18n from '@/i18n';
import en from '@/i18n/locales/en/feeAppointmentApproval.json';
import th from '@/i18n/locales/th/feeAppointmentApproval.json';

i18n.addResourceBundle('en', 'feeAppointmentApproval', en, true, false);
i18n.addResourceBundle('th', 'feeAppointmentApproval', th, true, false);
i18n.addResourceBundle('zh', 'feeAppointmentApproval', en, true, false);
