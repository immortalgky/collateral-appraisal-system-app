/**
 * Registers the `evaluationConfig` i18n namespace.
 * Import once at the entry-point (EvaluationConfigPage).
 * zh falls back to en until dedicated translations are provided.
 */
import i18n from '@/i18n';
import en from '@/i18n/locales/en/evaluationConfig.json';
import th from '@/i18n/locales/th/evaluationConfig.json';

i18n.addResourceBundle('en', 'evaluationConfig', en, true, false);
i18n.addResourceBundle('th', 'evaluationConfig', th, true, false);
i18n.addResourceBundle('zh', 'evaluationConfig', en, true, false);
