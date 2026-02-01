import { useForm, useFormContext, useWatch } from 'react-hook-form';
import { RHFTable } from '../../adapters/rhf-table/RHFTable';
import { useGetSaleAdjustmentGridCalculationConfig } from './useGetSaleAdjustmentGridCalculationConfig';
import type { SaleAdjustmentGridTemplate } from '../../data/data';
import { useContext, useEffect, useMemo } from 'react';
import { RHFInputCell } from '../../components/table/RHFInputCell';
import { Icon } from '@/shared/components';
import { getFactorDesciption } from '../../domain/getFactorDescription';
import { getDesciptions } from '../wqs/WQSSection';
import { QualitativeTable } from '../../components/QualitativeTable';

interface SaleAdjustmentGridCalculationSectionProps {
  property: Record<string, any>;
  template: SaleAdjustmentGridTemplate;
}

export const SaleAdjustmentGridCalculationSection = ({
  property,
  template,
}: SaleAdjustmentGridCalculationSectionProps) => {
  const { getValues } = useFormContext();
  const saleAdjustmentGridQualitatives = useWatch({ name: 'saleAdjustmentGridQualitatives' });
  const comparativeFactors = useWatch({ name: 'comparativeFactors' });
  const comparativeSurveys = useWatch({ name: 'comparativeSurveys' });

  useEffect(() => {
    console.log('qualitatives snapshot', structuredClone(saleAdjustmentGridQualitatives ?? []));
  }, [saleAdjustmentGridQualitatives]);

  const {
    saleAdjustmentGridQualitativeColumnConfig,
    saleAdjustmentGridQualitativeRowConfig,
    saleAdjustmentGridQualitativeColumnGroupConfig,
  } = useGetSaleAdjustmentGridCalculationConfig({
    comparativeSurveys,
    saleAdjustmentGridQualitatives,
    template,
    comparativeFactors,
  });

  return (
    <div>
      {/* <RHFHorizontalArrayTable
        name={'saleAdjustmentGridQualitatives'}
        columns={saleAdjustmentGridQualitativeColumnConfig}
        groups={saleAdjustmentGridQualitativeColumnGroupConfig}
        defaultRow={{ factorCode: '', surveys: [] }}
        ctx={null}
      /> */}
      {/* <RHFVerticalArrayTable
        name={'saleAdjustmentGridCalculations'}
        rowDef={[]}
        ctx={null}
        defaultRow={{}}
      /> */}
      {/* <RHFTable
        name="saleAdjustmentGridQualitatives"
        rowDefs={saleAdjustmentGridQualitativeRowConfig}
        ctx={{
          template: template,
          comparativeFactors: comparativeFactors,
          qualitatives: saleAdjustmentGridQualitatives,
          property: property,
        }}
        columnDefs={saleAdjustmentGridQualitativeColumnConfig}
        columnGroups={saleAdjustmentGridQualitativeColumnGroupConfig}
        defaultColumn={null}
      /> */}
      <QualitativeTable
        comparativeSurveys={comparativeSurveys}
        qualitativeFactors={saleAdjustmentGridQualitatives}
        comparativeFactors={comparativeFactors}
        isLoading={false}
      />
    </div>
  );
};
