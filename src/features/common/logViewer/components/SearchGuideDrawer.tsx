import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import SlideOverPanel from '@shared/components/SlideOverPanel';
import { GUIDE_RECIPES, GUIDE_SECTIONS } from '../utils/searchGuideContent';
import type { LogAdminKey } from '../types';

interface SearchGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTryQuery: (query: string) => void;
}

const SearchGuideDrawer = ({ isOpen, onClose, onTryQuery }: SearchGuideDrawerProps) => {
  const { t } = useTranslation('logAdmin');

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      title={t('guide.title')}
      subtitle={t('guide.subtitle')}
      width="2xl"
    >
      <div className="flex flex-col gap-6">
        {GUIDE_SECTIONS.map(section => (
          <div key={section.id}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {t(`guide.sections.${section.id}.title` as LogAdminKey)}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-1.5 pr-2 font-medium">{t('guide.columnPattern')}</th>
                    <th className="pb-1.5 pr-2 font-medium">{t('guide.columnSearchesIn')}</th>
                    <th className="pb-1.5 pr-2 font-medium">{t('guide.columnSpeed')}</th>
                    <th className="pb-1.5 pr-2 font-medium">{t('guide.columnOldRows')}</th>
                    <th className="pb-1.5 font-medium">{t('guide.columnUsage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map(row => (
                    <tr key={row.id} className="border-t border-gray-100 align-top">
                      <td className="py-2 pr-2 whitespace-nowrap">
                        <code className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 font-mono">
                          {row.pattern}
                        </code>
                      </td>
                      <td className="py-2 pr-2 text-gray-600">{row.columns}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        <span
                          className={clsx(
                            'font-semibold',
                            row.speed === 'fast' ? 'text-green-600' : 'text-amber-600',
                          )}
                        >
                          {t(row.speed === 'fast' ? 'guide.speedFast' : 'guide.speedScan')}
                        </span>
                      </td>
                      <td className="py-2 pr-2 whitespace-nowrap">
                        <span className={row.worksOnOldRows ? 'text-green-600' : 'text-danger'}>
                          {t(row.worksOnOldRows ? 'guide.oldRowsYes' : 'guide.oldRowsNo')}
                        </span>
                      </td>
                      <td className="py-2 text-gray-700">
                        {t(`guide.rows.${row.id}` as LogAdminKey)}
                        {row.examples.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {row.examples.map(example => (
                              <button
                                key={example}
                                type="button"
                                onClick={() => onTryQuery(example)}
                                className="font-mono text-[11px] rounded-md border border-primary/20 bg-primary/5 text-primary px-1.5 py-0.5 hover:border-primary/40"
                              >
                                {example}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('guide.recipesTitle')}</h3>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {GUIDE_RECIPES.map(recipe => (
                <tr key={recipe.id} className="border-t border-gray-100">
                  <td className="py-2 pr-3 text-gray-700">
                    {t(`guide.recipes.${recipe.id}` as LogAdminKey)}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => onTryQuery(recipe.query)}
                      className="font-mono text-[11px] rounded-md border border-primary/20 bg-primary/5 text-primary px-1.5 py-0.5 hover:border-primary/40"
                    >
                      {recipe.query}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('guide.tipsTitle')}</h3>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-xs text-gray-600">
            {(t('guide.tips', { returnObjects: true }) as string[]).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </SlideOverPanel>
  );
};

export default SearchGuideDrawer;
