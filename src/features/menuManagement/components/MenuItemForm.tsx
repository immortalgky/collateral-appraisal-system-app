import { useId, useState } from 'react';
import clsx from 'clsx';
import { IconPicker } from './IconPicker';
import { PermissionSelect } from './PermissionSelect';
import type { MenuItemAdminDto, MenuScope, IconStyle } from '../types';

/** Constrained 500-level Tailwind color swatch options for icon color */
const COLOR_OPTIONS: { label: string; value: string }[] = [
  { label: 'Blue', value: 'text-blue-500' },
  { label: 'Emerald', value: 'text-emerald-500' },
  { label: 'Purple', value: 'text-purple-500' },
  { label: 'Amber', value: 'text-amber-500' },
  { label: 'Cyan', value: 'text-cyan-500' },
  { label: 'Teal', value: 'text-teal-500' },
  { label: 'Rose', value: 'text-rose-500' },
  { label: 'Orange', value: 'text-orange-500' },
  { label: 'Indigo', value: 'text-indigo-500' },
  { label: 'Sky', value: 'text-sky-500' },
  { label: 'Violet', value: 'text-violet-500' },
  { label: 'Gray', value: 'text-gray-500' },
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
  return translations.find(t => t.languageCode === lang)?.label ?? '';
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
      translations: v.translations.map(t => (t.languageCode === lang ? { ...t, label } : t)),
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
          Item Key <span className="text-red-500">*</span>
        </label>
        <input
          id={ids.itemKey}
          type="text"
          value={values.itemKey}
          onChange={e => setValues(v => ({ ...v, itemKey: e.target.value }))}
          disabled={isSystem}
          required
          placeholder="e.g. main.dashboard"
          className={clsx(
            'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30',
            isSystem && 'bg-gray-50 cursor-not-allowed text-gray-500',
          )}
        />
        {isSystem && (
          <p className="text-xs text-amber-600 mt-1">Item key is locked for system items.</p>
        )}
      </div>

      {/* Scope */}
      <div>
        <label htmlFor={ids.scope} className="block text-sm font-medium text-gray-700 mb-1">
          Scope
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
          Parent
        </label>
        <select
          id={ids.parent}
          value={values.parentId ?? ''}
          onChange={e => setValues(v => ({ ...v, parentId: e.target.value || null }))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">— None (top-level) —</option>
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
          Path
        </label>
        <input
          id={ids.path}
          type="text"
          value={values.path ?? ''}
          onChange={e => setValues(v => ({ ...v, path: e.target.value || null }))}
          placeholder="/dashboard or :basePath/property"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-gray-400 mt-1">
          Appraisal items may use :basePath and :requestId placeholders.
        </p>
      </div>

      {/* Icon — composite control, use role=group + aria-label */}
      <div role="group" aria-labelledby={`${fieldId}-icon-label`}>
        <span id={`${fieldId}-icon-label`} className="block text-sm font-medium text-gray-700 mb-1">
          Icon
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
          Icon Color
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setValues(v => ({ ...v, iconColor: null }))}
            className={clsx(
              'w-7 h-7 rounded-full border-2 bg-gray-200 flex items-center justify-center',
              !values.iconColor ? 'border-gray-700' : 'border-transparent',
            )}
            title="None"
            aria-label="No color"
          >
            <span className="text-gray-500 text-xs">—</span>
          </button>
          {COLOR_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValues(v => ({ ...v, iconColor: opt.value }))}
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={values.iconColor === opt.value}
              className={clsx(
                'w-7 h-7 rounded-full border-2',
                COLOR_BG_MAP[opt.value] ?? 'bg-gray-400',
                values.iconColor === opt.value ? 'border-gray-700 scale-110' : 'border-transparent',
              )}
            />
          ))}
        </div>
      </div>

      {/* Sort Order */}
      <div>
        <label htmlFor={ids.sortOrder} className="block text-sm font-medium text-gray-700 mb-1">
          Sort Order
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
          View Permission <span className="text-red-500">*</span>
        </span>
        <PermissionSelect
          value={values.viewPermissionCode}
          onChange={code => setValues(v => ({ ...v, viewPermissionCode: code }))}
          placeholder="Select view permission..."
        />
      </div>

      {/* Edit Permission — composite control */}
      <div role="group" aria-labelledby={`${fieldId}-edit-perm-label`}>
        <span
          id={`${fieldId}-edit-perm-label`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Edit Permission
        </span>
        <PermissionSelect
          value={values.editPermissionCode ?? ''}
          onChange={code => setValues(v => ({ ...v, editPermissionCode: code || null }))}
          placeholder="None (read-only)"
          allowEmpty
        />
      </div>

      {/* Labels (tabbed) */}
      <div role="group" aria-labelledby={`${fieldId}-labels-label`}>
        <span
          id={`${fieldId}-labels-label`}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Labels
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
                  {lang.toUpperCase()} label
                </label>
                <input
                  id={ids.labelInput(lang)}
                  type="text"
                  value={getTranslation(values.translations, lang)}
                  onChange={e => updateTranslation(lang, e.target.value)}
                  required={lang === 'en'}
                  placeholder={
                    lang === 'en'
                      ? 'English label (required)'
                      : `${lang.toUpperCase()} label (optional)`
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
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
