import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import FormTable, { AddRowButton } from '../components/tables/FormTable';
import { SectionHeader } from '../../../shared/components';
import { FormFields } from '@/shared/components/form';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useDealerOptions } from '@/shared/utils/parameterUtils';
import { makeDealerFields } from '../configs/fields';
import { makePropertyColumns } from '../configs/tableColumns';

const PropertiesForm = () => {
  const { t } = useTranslation('request');
  const readOnly = useFormReadOnly();
  const addRow = useRef<() => void>(null);
  const dealerOptions = useDealerOptions();
  const dealerFields = useMemo(() => makeDealerFields(t, dealerOptions), [t, dealerOptions]);

  const propertiesColumns = useMemo(() => makePropertyColumns(t), [t]);

  return (
    <div>
      <SectionHeader
        title={t('requestForm.sections.properties')}
        required={true}
        rightIcon={
          !readOnly && (
            <AddRowButton onClick={() => addRow.current?.()} label={t('requestForm.addProperty')} />
          )
        }
      />
      <FormTable
        name="properties"
        columns={propertiesColumns}
        sumColumns={['sellingPrice']}
        totalFieldName="detail.loanDetail.totalSellingPrice"
        variant="plain"
        totalLabel={t('requestForm.totalSellingPrice')}
        hideAddButton
        addRowRef={addRow}
        seedEmptyRow
      />
      {/* The dealer code is property data (like a project code), so it sits under the table. */}
      <div className="mt-3 grid grid-cols-12 gap-x-3.5">
        <div className="col-span-5">
          <FormFields fields={dealerFields} namePrefix="detail.contact" />
        </div>
      </div>
    </div>
  );
};

export default PropertiesForm;
