import { useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Modal from '@/shared/components/Modal';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import {
  useGetMarketComparableById,
  useGetMarketComparableTemplateById,
} from '@/features/appraisal/api/marketComparable';
import MarketComparableForm from '@/features/appraisal/forms/MarketComparableForm';
import {
  createMarketComparableForm,
  createMarketComparableFormDefault,
  type createMarketComparableFormType,
} from '@/features/appraisal/schemas/form';

interface MarketComparableDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketComparableId: string | null;
}

export function MarketComparableDetailModal({
  isOpen,
  onClose,
  marketComparableId,
}: MarketComparableDetailModalProps) {
  const { data: marketComparable, isLoading: isLoadingComparable } =
    useGetMarketComparableById(marketComparableId ?? undefined);
  const { data: template, isLoading: isLoadingTemplate } =
    useGetMarketComparableTemplateById(
      marketComparable?.marketComparable.templateId ?? undefined,
    );

  const isLoading = isLoadingComparable || isLoadingTemplate;

  const mapComparableToForm = useMemo(() => {
    if (!marketComparable || !template) return null;

    const factorDataValue = template.template.factors
      .map((factor: any) => {
        const found = marketComparable.marketComparable.factorData.find(
          (ed: any) => ed.factorId === factor.factorId,
        );
        if (!found) return undefined;
        if (factor.dataType === 'Checkbox') {
          return { ...found, value: found.value === true || found.value === 'true' };
        }
        if (factor.dataType === 'CheckboxGroup') {
          let parsed = found.value;
          if (typeof found.value === 'string') {
            try {
              parsed = JSON.parse(found.value);
            } catch {
              parsed = [];
            }
          }
          return { ...found, value: Array.isArray(parsed) ? parsed : [] };
        }
        return found;
      })
      .filter(Boolean);

    return {
      surveyName: marketComparable.marketComparable.surveyName,
      propertyType: marketComparable.marketComparable.propertyType,
      templateCode: template.template.templateCode,
      infoDateTime: marketComparable.marketComparable.infoDateTime,
      notes: marketComparable.marketComparable.notes,
      sourceInfo: marketComparable.marketComparable.sourceInfo,
      templateId: marketComparable.marketComparable.templateId,
      offerPrice: marketComparable.marketComparable.offerPrice ?? null,
      offerPriceUnit: marketComparable.marketComparable.offerPriceUnit ?? null,
      salePrice: marketComparable.marketComparable.salePrice ?? null,
      salePriceUnit: marketComparable.marketComparable.salePriceUnit ?? null,
      saleDate: marketComparable.marketComparable.saleDate ?? null,
      factorData: factorDataValue,
    };
  }, [marketComparable, template]);

  const methods = useForm<createMarketComparableFormType>({
    defaultValues: createMarketComparableFormDefault,
    resolver: zodResolver(createMarketComparableForm),
  });

  useEffect(() => {
    if (mapComparableToForm) {
      methods.reset(mapComparableToForm);
    }
  }, [mapComparableToForm, methods]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Market Comparable Detail" size="3xl">
      <div className="max-h-[75vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600" />
          </div>
        ) : (
          <div key={marketComparableId}>
            <FormProvider {...methods}>
              <FormReadOnlyContext.Provider value={true}>
                <MarketComparableForm />
              </FormReadOnlyContext.Provider>
            </FormProvider>
          </div>
        )}
      </div>
    </Modal>
  );
}
