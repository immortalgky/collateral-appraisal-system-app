import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import { useUIStore } from '@shared/store';
import { DENSITY_OPTIONS } from '@shared/components/densityConstants';
import { FORM_LAYOUT_OPTIONS } from '@shared/components/formLayoutConstants';
import ProfileSection from './ProfileSection';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'th', label: 'ไทย' },
  { code: 'zh', label: '中文' },
] as const;

interface SegmentedProps<T extends string> {
  /** Row heading. Omit when the enclosing section title already names the setting. */
  label?: string;
  description?: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
  renderLabel: (option: T) => string;
}

/**
 * Segmented control for a single preference. Deliberately separate from the
 * navbar's DensityPicker/FormLayoutPicker: those are sized for a dropdown panel,
 * this one for a full-width settings row. Both write the same useUIStore value,
 * so the two stay in sync for free.
 */
function Segmented<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
  renderLabel,
}: SegmentedProps<T>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        {label && (
          <p className="text-sm font-medium text-gray-800 dark:text-base-content">{label}</p>
        )}
        {description && (
          <p
            className={
              label
                ? 'mt-0.5 text-xs text-gray-500 dark:text-gray-400'
                : 'text-sm text-gray-600 dark:text-gray-300'
            }
          >
            {description}
          </p>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label={label ?? description}
        className="flex items-center gap-0.5 rounded-lg bg-gray-50 dark:bg-base-300 p-0.5"
      >
        {options.map(option => {
          const isActive = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(option)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-white dark:bg-base-100 text-gray-900 dark:text-base-content shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-base-content',
              )}
            >
              {renderLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Deliberately no theme switch here. `useUIStore.theme` exists and ThemeProvider
 * honours it, but the shared Input component carries no `dark:` styling at all,
 * so every form in the app is unreadable in dark mode — which is why Navbar's
 * ThemeToggle is commented out as "hidden for now". Add the row once the shared
 * inputs are themed.
 */
const ProfilePreferencesTab = () => {
  const { t, i18n } = useTranslation(['userManagement', 'nav']);
  const density = useUIStore(s => s.density);
  const setDensity = useUIStore(s => s.setDensity);
  const formLayout = useUIStore(s => s.formLayout);
  const setFormLayout = useUIStore(s => s.setFormLayout);

  const currentLanguage =
    LANGUAGES.find(l => i18n.language?.startsWith(l.code))?.code ?? LANGUAGES[0].code;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm text-gray-600 dark:border-base-300 dark:bg-base-200 dark:text-gray-300">
        <Icon name="circle-info" style="solid" className="mt-0.5 size-4 shrink-0 text-gray-400" />
        <p>{t('myProfile.browserOnlySetting')}</p>
      </div>

      <ProfileSection icon="sliders" color="violet" title={t('myProfile.appearance')}>
        <div className="divide-y divide-gray-100 dark:divide-base-300">
          <Segmented
            label={t('nav:density.label')}
            description={t('myProfile.densityHint')}
            options={DENSITY_OPTIONS}
            value={density}
            onChange={setDensity}
            renderLabel={option => t(`nav:density.${option}` as never)}
          />
          <Segmented
            label={t('nav:formLayout.label')}
            description={t('myProfile.formLayoutHint')}
            options={FORM_LAYOUT_OPTIONS}
            value={formLayout}
            onChange={setFormLayout}
            renderLabel={option => t(`nav:formLayout.${option}` as never)}
          />
        </div>
      </ProfileSection>

      <ProfileSection icon="globe" color="teal" title={t('myProfile.language')}>
        <Segmented
          description={t('myProfile.languageHint')}
          options={LANGUAGES.map(l => l.code)}
          value={currentLanguage}
          onChange={code => void i18n.changeLanguage(code)}
          renderLabel={code => LANGUAGES.find(l => l.code === code)?.label ?? code}
        />
      </ProfileSection>
    </div>
  );
};

export default ProfilePreferencesTab;
