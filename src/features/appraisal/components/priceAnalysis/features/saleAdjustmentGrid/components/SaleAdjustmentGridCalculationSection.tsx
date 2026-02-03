import { useFormContext, useWatch } from 'react-hook-form';
import type { SaleAdjustmentGridTemplate } from '../../../data/data';
import { useEffect } from 'react';
import { QualitativeTable } from '../../../components/QualitativeTable';

interface SaleAdjustmentGridCalculationSectionProps {
  property: Record<string, any>;
  template: SaleAdjustmentGridTemplate;
  comparativeSurveys: Record<string, any>[];
}

export const SaleAdjustmentGridCalculationSection = ({
  property,
  template,
  comparativeSurveys,
}: SaleAdjustmentGridCalculationSectionProps) => {
  const { getValues } = useFormContext();
  const saleAdjustmentGridQualitatives = useWatch({ name: 'saleAdjustmentGridQualitatives' });
  const comparativeFactors = useWatch({ name: 'comparativeFactors' });

  useEffect(() => {
    console.log('qualitatives snapshot', structuredClone(saleAdjustmentGridQualitatives ?? []));
  }, [saleAdjustmentGridQualitatives]);

  return (
    <div>
      <QualitativeTable
        comparativeSurveys={comparativeSurveys}
        saleAdjustmentGridQualitatives={saleAdjustmentGridQualitatives}
        comparativeFactors={comparativeFactors}
        property={property}
        template={template}
        isLoading={false}
      />
    </div>
  );
};
