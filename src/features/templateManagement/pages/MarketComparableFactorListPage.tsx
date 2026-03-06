import { useState } from 'react';
import toast from 'react-hot-toast';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import NumberInput from '@shared/components/inputs/NumberInput';
import FactorTable from '../components/FactorTable';
import { useGetFactors, useCreateFactor, useUpdateFactor } from '../api/marketComparableFactor';
import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';

const dataTypeOptions = [
  { value: 'Dropdown', label: 'Dropdown' },
  { value: 'Radio', label: 'Radio' },
  { value: 'CheckboxGroup', label: 'Checkbox Group' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'Numeric', label: 'Numeric' },
  { value: 'Text', label: 'Text' },
];

type FactorFormData = {
  factorCode: string;
  factorName: string;
  fieldName: string;
  dataType: string;
  fieldLength: number | null;
  fieldDecimal: number | null;
  parameterGroup: string | null;
};

const emptyForm: FactorFormData = {
  factorCode: '',
  factorName: '',
  fieldName: '',
  dataType: 'Text',
  fieldLength: null,
  fieldDecimal: null,
  parameterGroup: null,
};

const MarketComparableFactorListPage = () => {
  const { data: factors = [], isLoading } = useGetFactors();
  const createFactor = useCreateFactor();
  const updateFactor = useUpdateFactor();

  const [showModal, setShowModal] = useState(false);
  const [editingFactor, setEditingFactor] = useState<MarketComparableFactorDtoType | null>(null);
  const [form, setForm] = useState<FactorFormData>(emptyForm);

  const handleOpenCreate = () => {
    setEditingFactor(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (factor: MarketComparableFactorDtoType) => {
    setEditingFactor(factor);
    setForm({
      factorCode: factor.factorCode,
      factorName: factor.factorName,
      fieldName: factor.fieldName,
      dataType: factor.dataType,
      fieldLength: factor.fieldLength,
      fieldDecimal: factor.fieldDecimal,
      parameterGroup: factor.parameterGroup,
    });
    setShowModal(true);
  };

  const needsParameterGroup = ['Dropdown', 'Radio', 'CheckboxGroup'].includes(form.dataType);
  const needsLength = ['Text', 'Numeric'].includes(form.dataType);
  const needsDecimal = form.dataType === 'Numeric';

  const handleDataTypeChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      dataType: val,
      // Reset fields that don't apply to the new type
      parameterGroup: ['Dropdown', 'Radio', 'CheckboxGroup'].includes(val) ? prev.parameterGroup : null,
      fieldLength: ['Text', 'Numeric'].includes(val) ? prev.fieldLength : null,
      fieldDecimal: val === 'Numeric' ? prev.fieldDecimal : null,
    }));
  };

  const handleSubmit = () => {
    if (!form.factorCode || !form.factorName || !form.fieldName || !form.dataType) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (needsParameterGroup && !form.parameterGroup) {
      toast.error('Parameter Group is required for this data type');
      return;
    }
    if (needsLength && form.fieldLength == null) {
      toast.error('Field Length is required for this data type');
      return;
    }
    if (needsDecimal && form.fieldDecimal == null) {
      toast.error('Field Decimal is required for Numeric data type');
      return;
    }

    if (editingFactor) {
      updateFactor.mutate(
        {
          id: editingFactor.id,
          factorName: form.factorName,
          fieldName: form.fieldName,
          dataType: form.dataType,
          fieldLength: form.fieldLength,
          fieldDecimal: form.fieldDecimal,
          parameterGroup: form.parameterGroup,
        },
        {
          onSuccess: () => {
            toast.success('Factor updated successfully');
            setShowModal(false);
          },
          onError: () => toast.error('Failed to update factor'),
        },
      );
    } else {
      createFactor.mutate(form, {
        onSuccess: () => {
          toast.success('Factor created successfully');
          setShowModal(false);
        },
        onError: () => toast.error('Failed to create factor'),
      });
    }
  };

  const updateField = <K extends keyof FactorFormData>(key: K, value: FactorFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isSaving = createFactor.isPending || updateFactor.isPending;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title="Market Comparable Factors"
        subtitle="Manage the master list of factors shared across all template types"
        icon="database"
        iconColor="purple"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            Create Factor
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <FactorTable factors={factors} onEdit={handleOpenEdit} isLoading={isLoading} />
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingFactor ? 'Edit Factor' : 'Create Factor'}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Factor Code"
            value={form.factorCode}
            onChange={(e) => updateField('factorCode', e.currentTarget.value)}
            disabled={!!editingFactor}
            required
            placeholder="e.g., AREA"
          />
          <TextInput
            label="Factor Name"
            value={form.factorName}
            onChange={(e) => updateField('factorName', e.currentTarget.value)}
            required
            placeholder="e.g., Area Size"
          />
          <TextInput
            label="Field Name"
            value={form.fieldName}
            onChange={(e) => updateField('fieldName', e.currentTarget.value)}
            required
            placeholder="e.g., areaSize"
          />
          <Dropdown
            label="Data Type"
            value={form.dataType}
            onChange={(val: string) => handleDataTypeChange(val)}
            options={dataTypeOptions}
            required
          />
          {needsParameterGroup && (
            <TextInput
              label="Parameter Group"
              value={form.parameterGroup ?? ''}
              onChange={(e) => updateField('parameterGroup', e.currentTarget.value || null)}
              placeholder="e.g., PropertyType"
              required
            />
          )}
          {needsLength && (
            <NumberInput
              label="Field Length"
              value={form.fieldLength}
              onChange={(e) => updateField('fieldLength', e.target.value)}
              placeholder="e.g., 100"
              decimalPlaces={0}
              required
            />
          )}
          {needsDecimal && (
            <NumberInput
              label="Field Decimal"
              value={form.fieldDecimal}
              onChange={(e) => updateField('fieldDecimal', e.target.value)}
              placeholder="e.g., 2"
              decimalPlaces={0}
              required
            />
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSubmit}>
            {editingFactor ? 'Update' : 'Create'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MarketComparableFactorListPage;
