import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['templateManagement', 'common']);
  const language = useLocaleStore(s => s.language);
  const { data: factors = [], isLoading } = useGetFactors();
  const createFactor = useCreateFactor();
  const updateFactor = useUpdateFactor();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingFactor, setEditingFactor] = useState<MarketComparableFactorDtoType | null>(null);
  const [form, setForm] = useState<FactorFormData>(emptyForm);

  const dataTypeOptions = [
    { value: 'Dropdown', label: t('factors.dataTypes.Dropdown') },
    { value: 'Radio', label: t('factors.dataTypes.Radio') },
    { value: 'CheckboxGroup', label: t('factors.dataTypes.CheckboxGroup') },
    { value: 'Checkbox', label: t('factors.dataTypes.Checkbox') },
    { value: 'Numeric', label: t('factors.dataTypes.Numeric') },
    { value: 'Text', label: t('factors.dataTypes.Text') },
  ];

  const availableLanguages = [
    { value: 'en', label: t('factorForm.translations.languages.en') },
    { value: 'th', label: t('factorForm.translations.languages.th') },
    { value: 'cn', label: t('factorForm.translations.languages.cn') },
    { value: 'jp', label: t('factorForm.translations.languages.jp') },
  ];

  const handleOpenCreate = () => {
    setEditingFactor(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleOpenEdit = (factor: MarketComparableFactorDtoType) => {
    setEditingFactor(factor);
    const translations: TranslationEntry[] = factor.translations?.length
      ? factor.translations.map(tr => ({
          language: tr.language.toLowerCase(),
          factorName: tr.factorName,
        }))
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
    setForm(prev => ({
      ...prev,
      dataType: val,
      parameterGroup: ['Dropdown', 'Radio', 'CheckboxGroup'].includes(val)
        ? prev.parameterGroup
        : null,
      fieldLength: ['Text', 'Numeric'].includes(val) ? prev.fieldLength : null,
      fieldDecimal: val === 'Numeric' ? prev.fieldDecimal : null,
    }));
  };

  const usedLanguages = form.translations.map(tr => tr.language);
  const availableToAdd = availableLanguages.filter(l => !usedLanguages.includes(l.value));

  const addTranslation = (lang: string) => {
    setForm(prev => ({
      ...prev,
      translations: [...prev.translations, { language: lang, factorName: '' }],
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
      translations: prev.translations.map((tr, i) => (i === index ? { ...tr, factorName } : tr)),
    }));
  };

  const handleSubmit = () => {
    const enTranslation = form.translations.find(tr => tr.language === 'en');
    if (!form.factorCode || !enTranslation?.factorName || !form.fieldName || !form.dataType) {
      toast.error(t('factorForm.validation.requiredFields'));
      return;
    }
    if (needsParameterGroup && !form.parameterGroup) {
      toast.error(t('factorForm.validation.parameterGroupRequired'));
      return;
    }
    if (needsLength && form.fieldLength == null) {
      toast.error(t('factorForm.validation.fieldLengthRequired'));
      return;
    }
    if (needsDecimal && form.fieldDecimal == null) {
      toast.error(t('factorForm.validation.fieldDecimalRequired'));
      return;
    }

    const translations = form.translations.filter(tr => tr.factorName.trim());

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
            toast.success(t('toasts.factorUpdated'));
            setShowModal(false);
          },
          onError: () => toast.error(t('toasts.factorUpdateFailed')),
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
            toast.success(t('toasts.factorCreated'));
            setShowModal(false);
          },
          onError: () => toast.error(t('toasts.factorCreateFailed')),
        },
      );
    }
  };

  const updateField = <K extends keyof FactorFormData>(key: K, value: FactorFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const isSaving = createFactor.isPending || updateFactor.isPending;

  const filterLabels: Record<'all' | 'active' | 'inactive', string> = {
    all: t('factors.filterAll'),
    active: t('factors.filterActive'),
    inactive: t('factors.filterInactive'),
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <SectionHeader
        title={t('factors.pageTitle')}
        subtitle={t('factors.pageSubtitle')}
        icon="database"
        iconColor="purple"
        rightIcon={
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Icon name="plus" style="solid" className="size-3.5" />}
          >
            {t('factors.createButton')}
          </Button>
        }
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="relative flex-1 max-w-sm">
            <Icon
              name="magnifying-glass"
              style="regular"
              className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('factors.searchPlaceholder')}
              aria-label={t('factors.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['all', 'active', 'inactive'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-2 transition-colors',
                  statusFilter === s
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-gray-500 hover:bg-gray-50',
                )}
              >
                {filterLabels[s]}
              </button>
            ))}
          </div>
        </div>
        <FactorTable
          factors={factors.filter(f => {
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
        title={editingFactor ? t('factorForm.editTitle') : t('factorForm.createTitle')}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label={t('factorForm.fields.factorCode')}
            value={form.factorCode}
            onChange={e => updateField('factorCode', e.currentTarget.value)}
            disabled={!!editingFactor}
            required
            placeholder={t('factorForm.fields.factorCodePlaceholder')}
          />
          <TextInput
            label={t('factorForm.fields.fieldName')}
            value={form.fieldName}
            onChange={e => updateField('fieldName', e.currentTarget.value)}
            required
            placeholder={t('factorForm.fields.fieldNamePlaceholder')}
          />
          <Dropdown
            label={t('factorForm.fields.dataType')}
            value={form.dataType}
            onChange={(val: string) => handleDataTypeChange(val)}
            options={dataTypeOptions}
            required
          />
          {needsParameterGroup && (
            <TextInput
              label={t('factorForm.fields.parameterGroup')}
              value={form.parameterGroup ?? ''}
              onChange={e => updateField('parameterGroup', e.currentTarget.value || null)}
              placeholder={t('factorForm.fields.parameterGroupPlaceholder')}
              required
            />
          )}
          {needsLength && (
            <NumberInput
              label={t('factorForm.fields.fieldLength')}
              value={form.fieldLength}
              onChange={e => updateField('fieldLength', e.target.value)}
              placeholder={t('factorForm.fields.fieldLengthPlaceholder')}
              decimalPlaces={0}
              required
            />
          )}
          {needsDecimal && (
            <NumberInput
              label={t('factorForm.fields.fieldDecimal')}
              value={form.fieldDecimal}
              onChange={e => updateField('fieldDecimal', e.target.value)}
              placeholder={t('factorForm.fields.fieldDecimalPlaceholder')}
              decimalPlaces={0}
              required
            />
          )}
        </div>

        {/* Translations Table */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              {t('factorForm.translations.sectionLabel')} <span className="text-red-500">*</span>
            </label>
            {availableToAdd.length > 0 && (
              <Dropdown
                value=""
                onChange={(val: string) => addTranslation(val)}
                options={[
                  { value: '', label: t('factorForm.translations.addLanguagePlaceholder') },
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
                  <th className="text-xs font-semibold text-gray-500 py-2.5 px-4 text-left w-24">
                    {t('factorForm.translations.columns.language')}
                  </th>
                  <th className="text-xs font-semibold text-gray-500 py-2.5 px-4 text-left">
                    {t('factorForm.translations.columns.factorName')}
                  </th>
                  <th className="text-xs font-semibold text-gray-500 py-2.5 px-4 text-center w-16">
                    {t('factorForm.translations.columns.action')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.translations.map((tr, index) => {
                  const langLabel =
                    availableLanguages.find(l => l.value === tr.language)?.label ?? tr.language;
                  const isEN = tr.language === 'en';
                  return (
                    <tr key={tr.language} className="border-t border-gray-100">
                      <td className="py-2 px-4">
                        <span className="text-xs font-semibold text-gray-600 bg-gray-100 rounded px-2 py-1">
                          {tr.language}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={tr.factorName}
                          onChange={e => updateTranslation(index, e.target.value)}
                          placeholder={t('factorForm.translations.namePlaceholder', {
                            lang: langLabel,
                          })}
                          aria-label={t('factorForm.translations.namePlaceholder', {
                            lang: langLabel,
                          })}
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        {!isEN ? (
                          <button
                            type="button"
                            onClick={() => removeTranslation(index)}
                            aria-label={t('common:actions.remove')}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Icon name="trash-can" style="regular" className="size-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {t('factorForm.translations.required')}
                          </span>
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
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSubmit}>
            {editingFactor ? t('common:actions.save') : t('common:actions.create')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MarketComparableFactorListPage;
