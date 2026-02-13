import { ALL_FACTORS, WQS_TEMPLATES } from '../data/data';
import { MethodSectionRenderer } from './MethodSectionRenderer';

export const ActiveMethodPanel = ({
  methodId,
  methodType,
  property,
  marketSurveys,
  onCalculationMethodDirty,
}: {
  methodId: string;
  methodType: string;
  property: Record<string, unknown>;
  marketSurveys: Record<string, unknown>[];
  onCalculationMethodDirty: (check: boolean) => void;
}) => {
  /**
   * TODO:
   * (1) read config by using methodId or sth
   * (2) pass config into method components
   */

  /** Query template that belongs to method type */
  const templates = WQS_TEMPLATES;

  /** Get all factor */
  const allFactors = ALL_FACTORS;

  return (
    <MethodSectionRenderer
      methodId={methodId}
      methodType={methodType}
      property={property}
      marketSurveys={marketSurveys}
      templates={templates}
      allFactors={allFactors}
      onCalculationMethodDirty={onCalculationMethodDirty}
    />
  );
};
