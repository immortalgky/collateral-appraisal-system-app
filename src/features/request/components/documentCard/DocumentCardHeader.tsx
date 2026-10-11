import type { ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import type { Kpis } from '../../utils/documentList';

/**
 * The card's own header, styled like the other FormCard headers on the page: icon, title, and on
 * the right the numbers (required done/total, files, files an appraiser asked for) and any actions.
 */
const DocumentCardHeader = ({
  kpis,
  title,
  icon = 'paperclip',
  headingClassName = 'text-base',
  children,
}: {
  kpis: Kpis;
  /** Defaults to the Request page's "Attach Document". */
  title?: string;
  icon?: string;
  /** Heading size class (default text-base). */
  headingClassName?: string;
  children?: ReactNode;
}) => {
  const { t } = useTranslation('request');
  const complete = kpis.requiredDone === kpis.required;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 shadow-sm">
          <Icon name={icon} style="solid" className="size-4 text-teal-500" />
        </div>
        <h3 className={clsx('font-semibold text-gray-800', headingClassName)}>
          {title ?? t('forms.attachDocument')}
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
        {kpis.required > 0 && (
          <span
            className={clsx(
              'inline-flex items-center gap-1.5',
              complete ? 'text-green-700' : 'text-amber-700',
            )}
          >
            <Icon
              name={complete ? 'check-circle' : 'asterisk'}
              style="solid"
              className="size-3.5"
            />
            {t('docCard.kpi.required')}{' '}
            <b className="tabular-nums">
              {kpis.requiredDone}/{kpis.required}
            </b>
          </span>
        )}
        <span>
          {t('docCard.kpi.files')} <b className="tabular-nums text-gray-900">{kpis.files}</b>
        </span>
        {kpis.followUps > 0 && (
          <span>
            {t('docCard.kpi.followUps')}{' '}
            <b className="tabular-nums text-gray-900">{kpis.followUps}</b>
          </span>
        )}
        {children}
      </div>
    </div>
  );
};

export default DocumentCardHeader;
