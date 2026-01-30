import { useWatch } from 'react-hook-form';
import { RHFTable } from '../../adapters/rhf-table/RHFTable';
import { useGetSaleAdjustmentGridCalculationConfig } from './useGetSaleAdjustmentGridCalculationConfig';
import type { SaleAdjustmentGridTemplate } from '../../data/data';
import { useEffect, useMemo } from 'react';
import { RHFInputCell } from '../../components/table/RHFInputCell';

interface SaleAdjustmentGridCalculationSectionProps {
  property: Record<string, any>;
  surveys: Record<string, any>[];
  template: SaleAdjustmentGridTemplate;
}

export const SaleAdjustmentGridCalculationSection = ({
  property,
  surveys,
  template,
}: SaleAdjustmentGridCalculationSectionProps) => {
  const saleAdjustmentGridQualitatives = useWatch({ name: 'saleAdjustmentGridQualitatives' });
  const comparativeFactors = useWatch({ name: 'comparativeFactors' });

  useEffect(() => {
    console.log('qualitatives snapshot', structuredClone(saleAdjustmentGridQualitatives ?? []));
  }, [saleAdjustmentGridQualitatives]);

  const {
    saleAdjustmentGridQualitativeColumnConfig,
    saleAdjustmentGridQualitativeRowConfig,
    saleAdjustmentGridQualitativeColumnGroupConfig,
  } = useGetSaleAdjustmentGridCalculationConfig({
    surveys,
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
      <RHFTable
        name="saleAdjustmentGridQualitatives"
        rowDefs={saleAdjustmentGridQualitativeRowConfig}
        ctx={{
          template: template,
          comparativeFactors: comparativeFactors,
          qualitatives: saleAdjustmentGridQualitatives,
        }}
        columnDefs={saleAdjustmentGridQualitativeColumnConfig}
        columnGroups={saleAdjustmentGridQualitativeColumnGroupConfig}
        defaultColumn={null}
      />
    </div>
  );
};
