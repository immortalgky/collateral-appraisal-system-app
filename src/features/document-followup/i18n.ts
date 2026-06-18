/**
 * Registers the `documentFollowup` i18n namespace without editing src/i18n/index.ts.
 * Import this file once at the document-followup entry-point (e.g. ProvideDocumentsTaskPage.tsx).
 */
import i18n from '@/i18n';
import en from '@/i18n/locales/en/documentFollowup.json';
import th from '@/i18n/locales/th/documentFollowup.json';
import zh from '@/i18n/locales/zh/documentFollowup.json';

i18n.addResourceBundle('en', 'documentFollowup', en, true, false);
i18n.addResourceBundle('th', 'documentFollowup', th, true, false);
i18n.addResourceBundle('zh', 'documentFollowup', zh, true, false);
