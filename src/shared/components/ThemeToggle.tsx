import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { useUIStore } from '@shared/store';

export default function ThemeToggle(): React.ReactNode {
  const { t } = useTranslation('nav');
  const theme = useUIStore(s => s.theme);
  const toggleTheme = useUIStore(s => s.toggleTheme);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('themeToggle.toLight') : t('themeToggle.toDark')}
      className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-base-200 dark:hover:bg-base-300 border border-gray-200/60 dark:border-base-300 text-gray-700 dark:text-base-content transition-all cursor-pointer"
    >
      <Icon
        name={isDark ? 'sun' : 'moon'}
        style="solid"
        className="size-4"
      />
    </button>
  );
}
