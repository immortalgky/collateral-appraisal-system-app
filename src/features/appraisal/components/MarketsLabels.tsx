import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { isPriceUnitCode, parsePlotLocation } from '../utils/marketComparableFormat';

/*
 * Small labels shared by the Markets tab's rows and its map list, so the two say the same thing
 * the same way.
 */

/**
 * "บาท/ตร.ว." for a MeasurementUnits code. Worded here rather than read from the master, whose
 * Thai rows carry English text ("Baht/Sq.Wa").
 */
export const PriceUnitLabel = ({ unit }: { unit: string | null }) => {
  const { t } = useTranslation('appraisal');
  if (!unit) return null;
  return <>{isPriceUnitCode(unit) ? t(`markets.units.${unit}`) : unit}</>;
};

const METHOD_CODES = ['WQS', 'SaleGrid', 'DirectComparison'] as const;
type MethodCode = (typeof METHOD_CODES)[number];
const isMethodCode = (v: string): v is MethodCode =>
  (METHOD_CODES as readonly string[]).includes(v);

/** "ใช้ใน WQS" — the one chip in a row that is good news rather than a warning. */
export const UsedInBadge = ({ method }: { method: string }) => {
  const { t } = useTranslation('appraisal');
  const label = isMethodCode(method) ? t(`markets.methods.${method}`) : method;
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-primary-50 px-1.5 text-[10.5px] font-semibold leading-[1.5] text-primary-700">
      {t('markets.usedIn', { method: label })}
    </span>
  );
};

/** The plot-location codes, each labelled from the PlotLocation master. */
export const PlotLocationText = ({ raw }: { raw: string | null | undefined }) => {
  const codes = parsePlotLocation(raw);
  if (codes.length === 0) return null;
  return (
    <>
      {codes.map((code, i) => (
        <Fragment key={code}>
          {i > 0 && ', '}
          <ParameterDisplay group="PlotLocation" code={code} fallback={code} />
        </Fragment>
      ))}
    </>
  );
};

/** One line of facts separated by dots; missing facts are dropped, not shown as blanks. */
export const DotJoin = ({ parts, className }: { parts: ReactNode[]; className?: string }) => {
  const shown = parts.filter(p => p != null && p !== false && p !== '');
  if (shown.length === 0) return null;
  return (
    <p className={className}>
      {shown.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="mx-1.5 text-gray-300">·</span>}
          {part}
        </Fragment>
      ))}
    </p>
  );
};
