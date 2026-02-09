import { useFormContext, useWatch } from 'react-hook-form';
import type { directComparisonTemplate } from '../../../data/data';
import { useEffect } from 'react';
import { QualitativeTable } from './QualitativeTable';
import { directComparisonPath } from '../adapters/fieldPath';

interface DirectComparisonCalculationSectionProps {
  property: Record<string, any>;
  template: directComparisonTemplate;
  comparativeSurveys: Record<string, any>[];
}

export const DirectComparisonCalculationSection = ({
  property,
  template,
  comparativeSurveys,
}: DirectComparisonCalculationSectionProps) => {
  const { qualitative: qualitativePath, comparativeFactor: comparativeFactorPath } =
    directComparisonPath;
  const { getValues } = useFormContext();
  const directComparisonQualitatives = useWatch({ name: qualitativePath() });
  const comparativeFactors = useWatch({ name: comparativeFactorPath() });

  return (
    <div>
      <QualitativeTable
        comparativeSurveys={comparativeSurveys}
        directComparisonQualitatives={directComparisonQualitatives}
        comparativeFactors={comparativeFactors}
        property={property}
        template={template}
        isLoading={false}
      />
    </div>
  );
};
