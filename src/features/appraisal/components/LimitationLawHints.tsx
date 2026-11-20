import { useContext } from 'react';
import { useWatch } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { FieldLabelContext } from '@/shared/components/form';
import { COMPACT } from '@/shared/components/form/compactStyles';
import { useFormLayout } from '@/shared/components/form/formLayoutContext';
import Icon from '@/shared/components/Icon';
import { useParameterDescription } from '@/shared/utils/parameterUtils';
import { useAppraisalId, useBasePath } from '../context/AppraisalContext';
import { useGetLawAndRegulations } from '../api/lawAndRegulation';

/** The Law & Regulation topics (parameter group `LawRegulationHeader`) the limitation chips point to. */
const LAW_HEADER_GROUP = 'LawRegulationHeader';
const TOPICS = [
  { field: 'isInExpropriationLine', code: '04' },
  { field: 'isForestBoundary', code: '05' },
] as const;

// Container segments that host the Laws & Regulation tab, as in the tab itself.
const PARENT_SEGMENTS = ['block-condo', 'block-village', 'property-pma', 'property'] as const;

function Hint({
  field,
  code,
  items,
  onGo,
}: {
  field: string;
  code: string;
  items: { headerCode: string }[];
  onGo: () => void;
}) {
  const { t } = useTranslation('appraisal');
  const relabel = useContext(FieldLabelContext);
  const topic = useParameterDescription(LAW_HEADER_GROUP, code);
  const chip = relabel ? relabel({ type: 'text-input', name: field, label: field }).label : field;
  const present = items.some(i => i.headerCode === code);
  return (
    <p
      className={clsx(
        'flex items-start gap-1.5 text-xs',
        present ? 'text-(--palette-accent-ink)' : 'text-(--palette-warn)',
      )}
    >
      <Icon
        name={present ? 'circle-check' : 'circle-info'}
        style="solid"
        className="mt-0.5 shrink-0"
      />
      <span>
        {present ? (
          t('forms.limitationLawHint.present', { topic })
        ) : (
          <>
            {t('forms.limitationLawHint.missing', { chip, topic })}{' '}
            <button
              type="button"
              onClick={onGo}
              className="cursor-pointer underline underline-offset-2"
            >
              {t('forms.limitationLawHint.link')} →
            </button>
          </>
        )}
      </span>
    </p>
  );
}

/**
 * Under the limitation chips: for each of "in the expropriation line" and "in the forest line" that is
 * ticked, whether the Law & Regulation tab already holds its topic (expropriation, forest / state reserved land check),
 * with a way to the tab. A hint only: it never blocks a save. Law records belong to the appraisal
 * (`GET /appraisals/{id}/law-and-regulations`), so one query answers for every property of it.
 */
export default function LimitationLawHints() {
  const flags = useWatch({ name: TOPICS.map(x => x.field) }) as unknown[];
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const layout = useFormLayout();
  const { data } = useGetLawAndRegulations(appraisalId);
  const ticked = TOPICS.filter((_, i) => flags?.[i] === true);
  // Nothing to say until the records are known.
  if (!ticked.length || !data) return null;

  const first = pathname.replace(`${basePath}/`, '').split('/').filter(Boolean)[0];
  const parent = (PARENT_SEGMENTS as readonly string[]).find(s => s === first) ?? 'property';
  const go = () => navigate(`${basePath}/${parent}?tab=laws`);
  const lines = ticked.map(({ field, code }) => (
    <Hint key={field} field={field} code={code} items={data.items ?? []} onGo={go} />
  ));
  // Compact: a row of its own with the label column left empty, so the lines sit in the control
  // column under the chips, as a field's helper line does.
  if (layout === 'compact')
    return (
      <div className={COMPACT.pair}>
        <div className={COMPACT.label} />
        <div className={clsx(COMPACT.control, 'flex-col items-start gap-1')}>{lines}</div>
      </div>
    );
  return <div className="col-span-12 flex flex-col gap-1">{lines}</div>;
}
