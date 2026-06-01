import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { IconPicker } from './IconPicker';
import { PermissionSelect } from './PermissionSelect';
import type { MenuItemAdminDto, MenuScope, IconStyle } from '../types';

type ColorKey =
  | 'Blue'
  | 'Emerald'
  | 'Purple'
  | 'Amber'
  | 'Cyan'
  | 'Teal'
  | 'Rose'
  | 'Orange'
  | 'Indigo'
  | 'Sky'
  | 'Violet'
  | 'Gray';

/** Constrained 500-level Tailwind color swatch options for icon color */
const COLOR_VALUES: { key: ColorKey; value: string }[] = [
  { key: 'Blue', value: 'text-blue-500' },
  { key: 'Emerald', value: 'text-emerald-500' },
  { key: 'Purple', value: 'text-purple-500' },
  { key: 'Amber', value: 'text-amber-500' },
  { key: 'Cyan', value: 'text-cyan-500' },
  { key: 'Teal', value: 'text-teal-500' },
  { key: 'Rose', value: 'text-rose-500' },
  { key: 'Orange', value: 'text-orange-500' },
  { key: 'Indigo', value: 'text-indigo-500' },
  { key: 'Sky', value: 'text-sky-500' },
  { key: 'Violet', value: 'text-violet-500' },
  { key: 'Gray', value: 'text-gray-500' },
];

const COLOR_BG_MAP: Record<string, string> = {
  'text-blue-500': 'bg-blue-500',
  'text-emerald-500': 'bg-emerald-500',
  'text-purple-500': 'bg-purple-500',
  'text-amber-500': 'bg-amber-500',
  'text-cyan-500': 'bg-cyan-500',
  'text-teal-500': 'bg-teal-500',
  'text-rose-500': 'bg-rose-500',
  'text-orange-500': 'bg-orange-500',
  'text-indigo-500': 'bg-indigo-500',
  'text-sky-500': 'bg-sky-500',
  'text-violet-500': 'bg-violet-500',
  'text-gray-500': 'bg-gray-500',
};

const SCOPES: MenuScope[] = ['Main', 'Appraisal'];
const LANGS = ['en', 'th', 'zh'] as const;

export interface MenuItemFormValues {
  itemKey: string;
  scope: MenuScope;
  parentId: string | null;
  path: string | null;
  iconName: string;
  iconStyle: IconStyle;
  iconColor: string | null;
  sortOrder: number;
  viewPermissionCode: string;
  editPermissionCode: string | null;
  translations: { languageCode: string; label: string }[];
}

interface MenuItemFormProps {
  initial?: MenuItemAdminDto | null;
  parentOptions: Array<{ id: string; label: string }>;
  onSubmit: (values: MenuItemFormValues) => void;
  isSubmitting?: boolean;
}

function getTranslation(
  translations: { languageCode: string; label: string }[],
  lang: string,
): string {
  return translations.find(tr => tr.languageCode === lang)?.label ?? '';
}

/**
 * Create/edit form for a single menu item.
 * Tabbed label inputs for en / th / zh.
 * Constrained color swatch picker.
 * Icon picker via sprite parsing.
 */
export function MenuItemForm({
  initial,
  parentOptions,
  onSubmit,
  isSubmitting,
}: MenuItemFormProps) {
  const { t } = useTranslation(['menuManagement', 'common']);
  const isSystem = initial?.isSystem ?? false;
  const [activeTab, setActiveTab] = useState<(typeof LANGS)[number]>('en');
  const fieldId = useId();
  const ids = {
    itemKey: `${fieldId}-itemKey`,
    scope: `${fieldId}-scope`,
    parent: `${fieldId}-parent`,
    path: `${fieldId}-path`,
    sortOrder: `${fieldId}-sortOrder`,
    labelInput: (lang: string) => `${fieldId}-label-${lang}`,
  };

  const [values, setValues] = useState<MenuItemFormValues>(() => ({
    itemKey: initial?.itemKey ?? '',
    scope: initial?.scope ?? 'Main',
    parentId: initial?.parentId ?? null,
    path: initial?.path ?? '',
    iconName: initial?.iconName ?? '',
    iconStyle: initial?.iconStyle ?? 'solid',
    iconColor: initial?.iconColor ?? null,
    sortOrder: initial?.sortOrder ?? 10,
    viewPermissionCode: initial?.viewPermissionCode ?? '',
    editPermissionCode: initial?.editPermissionCode ?? null,
    translations: LANGS.map(lang => ({
      languageCode: lang,
      label: getTranslation(initial?.translations ?? [], lang),
    })),
  }));

  const updateTranslation = (lang: string, label: string) => {
    setValues(v => ({
      ...v,
      translations: v.translations.map(tr => (tr.languageCode === lang ? { ...tr, label } : tr)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Item Key */}
      <div>
        <label htmlFor={ids.itemKey} className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.itemKey')} <span className="text-red-500">*</span>
        </label>
        <input
          id={ids.itemKey}
          type="text"
          value={values.itemKey}
          onChange={e => setValues(v => ({ ...v, itemKey: e.target.value }))}
          disabled={isSystem}
          required
          placeholder={t('form.itemKeyPlaceholder')}
          className={clsx(
            'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30',
            isSystem && 'bg-gray-50 cursor-not-allowed text-gray-500',
          )}
        />
        {isSystem && <p className="text-xs text-amber-600 mt-1">{t('form.itemKeyLocked')}</p>}
      </div>

      {/* Scope */}
      <div>
        <label htmlFor={ids.scope} className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.scope')}
        </label>
        <select
          id={ids.scope}
          value={values.scope}
          onChange={e => setValues(v => ({ ...v, scope: e.target.value as MenuScope }))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {SCOPES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Parent */}
      <div>
        <label htmlFor={ids.parent} className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.parent')}
        </label>
        <select
          id={ids.parent}
          value={values.parentId ?? ''}
          onChange={e => setValues(v => ({ ...v, parentId: e.target.value || null }))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">{t('form.parentNone')}</option>
          {parentOptions.map(opt => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Path */}
      <div>
        <label htmlFor={ids.path} className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.path')}
        </label>
        <input
          id={ids.path}
          type="text"
          value={values.path ?? ''}
          onChange={e => setValues(v => ({ ...v, path: e.target.value || null }))}
          placeholder={t('form.pathPlaceholder')}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-gray-400 mt-1">{t('form.pathHint')}</p>
      </div>

      {/* Icon — composite control, use role=group + aria-label */}
      <div role="group" aria-labelledby={`${fieldId}-icon-label`}>
        <span id={`${fieldId}-icon-label`} className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.icon')}
        </span>
        <IconPicker
          value={values.iconName}
          styleValue={values.iconStyle}
          onChangeIcon={name => setValues(v => ({ ...v, iconName: name }))}
          onChangeStyle={style => setValues(v => ({ ...v, iconStyle: style }))}
        />
      </div>

      {/* Icon Color — composite control, use role=group */}
      <div role="group" aria-labelledby={`${fieldId}-color-label`}>
        <span
          id={`${fieldId}-color-label`}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t('form.iconColor')}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setValues(v => ({ ...v, iconColor: null }))}
            className={clsx(
              'w-7 h-7 rounded-full border-2 bg-gray-200 flex items-center justify-center',
              !values.iconColor ? 'border-gray-700' : 'border-transparent',
            )}
            title={t('form.iconColorNone')}
            aria-label={t('form.iconColorNone')}
          >
            <span className="text-gray-500 text-xs">—</span>
          </button>
          {COLOR_VALUES.map(opt => {
            const label = t(`colors.${opt.key}`);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValues(v => ({ ...v, iconColor: opt.value }))}
                title={label}
                aria-label={label}
                aria-pressed={values.iconColor === opt.value}
                className={clsx(
                  'w-7 h-7 rounded-full border-2',
                  COLOR_BG_MAP[opt.value] ?? 'bg-gray-400',
                  values.iconColor === opt.value
                    ? 'border-gray-700 scale-110'
                    : 'border-transparent',
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor={ids.sortOrder} className="block text-sm font-medium text-gray-700 mb-1">
          {t('form.sortOrder')}
        </label>
        <input
          id={ids.sortOrder}
          type="number"
          value={values.sortOrder}
          min={1}
          onChange={e => setValues(v => ({ ...v, sortOrder: Number(e.target.value) }))}
          className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* View Permission — composite control */}
      <div role="group" aria-labelledby={`${fieldId}-view-perm-label`}>
        <span
          id={`${fieldId}-view-perm-label`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t('form.viewPermission')} <span className="text-red-500">*</span>
        </span>
        <PermissionSelect
          value={values.viewPermissionCode}
          onChange={code => setValues(v => ({ ...v, viewPermissionCode: code }))}
        />
      </div>

      {/* Edit Permission — composite control */}
      <div role="group" aria-labelledby={`${fieldId}-edit-perm-label`}>
        <span
          id={`${fieldId}-edit-perm-label`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t('form.editPermission')}
        </span>
        <PermissionSelect
          value={values.editPermissionCode ?? ''}
          onChange={code => setValues(v => ({ ...v, editPermissionCode: code || null }))}
          allowEmpty
          emptyLabel={t('permissionSelect.editPermissionEmpty')}
        />
      </div>

      {/* Labels (tabbed) */}
      <div role="group" aria-labelledby={`${fieldId}-labels-label`}>
        <span
          id={`${fieldId}-labels-label`}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t('form.labels')}
        </span>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            {LANGS.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveTab(lang)}
                aria-pressed={activeTab === lang}
                className={clsx(
                  'px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === lang
                    ? 'text-primary border-b-2 border-primary bg-white'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {lang.toUpperCase()}
                {lang === 'en' && <span className="text-red-500 ml-0.5">*</span>}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="p-3">
            {LANGS.map(lang => (
              <div key={lang} className={activeTab === lang ? '' : 'hidden'}>
                <label htmlFor={ids.labelInput(lang)} className="sr-only">
                  {t('form.labelAriaInput', { lang: lang.toUpperCase() })}
                </label>
                <input
                  id={ids.labelInput(lang)}
                  type="text"
                  value={getTranslation(values.translations, lang)}
                  onChange={e => updateTranslation(lang, e.target.value)}
                  required={lang === 'en'}
                  placeholder={
                    lang === 'en'
                      ? t('form.labelPlaceholderEn')
                      : t('form.labelPlaceholderOther', { lang: lang.toUpperCase() })
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? t('form.submitting') : t('form.submit')}
        </button>
      </div>
    </form>
  );
}
