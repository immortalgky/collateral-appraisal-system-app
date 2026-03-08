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
import clsx from 'clsx';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';

const dataTypeOptions = [
  { value: 'Dropdown', label: 'Dropdown' },
  { value: 'Radio', label: 'Radio' },
  { value: 'CheckboxGroup', label: 'Checkbox Group' },
  { value: 'Checkbox', label: 'Checkbox' },
  { value: 'Numeric', label: 'Numeric' },
  { value: 'Text', label: 'Text' },
];

const AVAILABLE_LANGUAGES = [
  { value: 'en', label: 'English (en)' },
  { value: 'th', label: 'Thai (th)' },
  { value: 'cn', label: 'Chinese (cn)' },
  { value: 'jp', label: 'Japanese (jp)' },
];

type TranslationEntry = { language: string; factorName: string };

type FactorFormData = {
  factorCode: string;
  translations: TranslationEntry[];
  fieldName: string;
  dataType: string;
  fieldLength: number | null;
  fieldDecimal: number | null;
  parameterGroup: string | null;
};

const emptyForm: FactorFormData = {
  factorCode: '',
  translations: [{ language: 'en', factorName: '' }],
  fieldName: '',
  dataType: 'Text',
  fieldLength: null,
  fieldDecimal: null,
  parameterGroup: null,
};

const MarketComparableFactorListPage = () => {
  const language = useLocaleStore((s) => s.language);
  const { data: factors = [], isLoading } = useGetFactors();
  const createFactor = useCreateFactor();
  const updateFactor = useUpdateFactor();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
    const translations: TranslationEntry[] = factor.translations?.length
      ? factor.translations.map(t => ({ language: t.language.toLowerCase(), factorName: t.factorName }))
      : [{ language: 'en', factorName: '' }];
    setForm({
      factorCode: factor.factorCode,
      translations,
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

  const usedLanguages = form.translations.map(t => t.language);
  const availableToAdd = AVAILABLE_LANGUAGES.filter(l => !usedLanguages.includes(l.value));

  const addTranslation = (language: string) => {
    setForm(prev => ({
      ...prev,
      translations: [...prev.translations, { language, factorName: '' }],
    }));
  };

  const removeTranslation = (index: number) => {
    setForm(prev => ({
      ...prev,
      translations: prev.translations.filter((_, i) => i !== index),
    }));
  };

  const updateTranslation = (index: number, factorName: string) => {
    setForm(prev => ({
      ...prev,
      translations: prev.translations.map((t, i) => (i === index ? { ...t, factorName } : t)),
    }));
  };

  const handleSubmit = () => {
    const enTranslation = form.translations.find(t => t.language === 'en');
    if (!form.factorCode || !enTranslation?.factorName || !form.fieldName || !form.dataType) {
      toast.error('Please fill in all required fields (EN name is required)');
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

    const translations = form.translations.filter(t => t.factorName.trim());

    if (editingFactor) {
      updateFactor.mutate(
        {
          id: editingFactor.id,
          fieldName: form.fieldName,
          dataType: form.dataType,
          fieldLength: form.fieldLength,
          fieldDecimal: form.fieldDecimal,
          parameterGroup: form.parameterGroup,
          translations,
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
      createFactor.mutate(
        {
          factorCode: form.factorCode,
          fieldName: form.fieldName,
          dataType: form.dataType,
          fieldLength: form.fieldLength,
          fieldDecimal: form.fieldDecimal,
          parameterGroup: form.parameterGroup,
          translations,
        },
        {
          onSuccess: () => {
            toast.success('Factor created successfully');
            setShowModal(false);
          },
          onError: () => toast.error('Failed to create factor'),
        },
      );
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
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="relative flex-1 max-w-sm">
            <Icon name="magnifying-glass" style="regular" className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-2 capitalize transition-colors',
                  statusFilter === s
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-500 hover:bg-gray-50',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <FactorTable
          factors={factors.filter((f) => {
            if (statusFilter === 'active' && !f.isActive) return false;
            if (statusFilter === 'inactive' && f.isActive) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return (
              f.factorCode.toLowerCase().includes(q) ||
              getTranslatedFactorName(f.translations, language).toLowerCase().includes(q)
            );
          })}
          onEdit={handleOpenEdit}
          isLoading={isLoading}
          totalCount={factors.length}
        />
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

        {/* Translations Table */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Factor Name Translations <span className="text-red-500">*</span>
            </label>
            {availableToAdd.length > 0 && (
              <Dropdown
                value=""
                onChange={(val: string) => addTranslation(val)}
                options={[
                  { value: '', label: 'Add language...' },
                  ...availableToAdd,
                ]}
                className="w-44"
              />
            )}
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-xs font-semibold text-gray-500 py-2.5 px-4 text-left w-24">Language</th>
                  <th className="text-xs font-semibold text-gray-500 py-2.5 px-4 text-left">Factor Name</th>
                  <th className="text-xs font-semibold text-gray-500 py-2.5 px-4 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {form.translations.map((t, index) => {
                  const langLabel = AVAILABLE_LANGUAGES.find(l => l.value === t.language)?.label ?? t.language;
                  const isEN = t.language === 'en';
                  return (
                    <tr key={t.language} className="border-t border-gray-100">
                      <td className="py-2 px-4">
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 rounded px-2 py-1">
                          {t.language}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={t.factorName}
                          onChange={(e) => updateTranslation(index, e.target.value)}
                          placeholder={`Factor name in ${langLabel}`}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        {!isEN ? (
                          <button
                            type="button"
                            onClick={() => removeTranslation(index)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Icon name="trash-can" style="regular" className="size-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">required</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
