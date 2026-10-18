import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import FormTable, { AddRowButton } from '../components/tables/FormTable';
import { makeCustomerColumns } from '../configs/tableColumns';
import { SectionHeader } from '@shared/components';
import { useFormReadOnly } from '@/shared/components/form/context';

const CustomersForm = () => {
  const { t } = useTranslation('request');
  const readOnly = useFormReadOnly();
  const addRow = useRef<() => void>(null);

  const customersColumns = useMemo(() => makeCustomerColumns(t), [t]);

  return (
    <div>
      <SectionHeader
        title={t('forms.customers')}
        required={true}
        rightIcon={
          !readOnly && (
            <AddRowButton onClick={() => addRow.current?.()} label={t('requestForm.addCustomer')} />
          )
        }
      />
      <FormTable
        columns={customersColumns}
        name={'customers'}
        variant="plain"
        hideAddButton
        addRowRef={addRow}
        seedEmptyRow
      />
    </div>
  );
};

export default CustomersForm;
