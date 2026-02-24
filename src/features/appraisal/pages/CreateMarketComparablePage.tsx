import { useEffect } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';

import {
  useCreateMarketComparable,
  useGetMarketComparableById,
  useGetMarketComparableTemplateById,
  useUpdateMarketComparable,
} from '../api/marketComparable';
import MarketComparableForm from '../forms/MarketComparableForm';
import {
  createMarketComparableForm,
  createMarketComparableFormDefault,
  type createMarketComparableFormType,
} from '../schemas/form';

const CreateMarketComparablePage = () => {
  const navigate = useNavigate();

  // Support both appraisal-nested routes (URL params) and standalone routes (search params)
  const { appraisalId, marketComparableId } = useParams<{
    appraisalId?: string;
    marketComparableId?: string;
  }>();
  const [searchParams] = useSearchParams();

  // Edit mode: URL param (appraisal context) or search param (standalone)
  const marketId = marketComparableId || searchParams.get('id');
  const isEditMode = !!marketId;

  const { data: marketComparable, isLoading: isLoadingComparable } = useGetMarketComparableById(
    isEditMode ? marketId : undefined,
  );
  const { data: template, isLoading: isLoadingTemplate } = useGetMarketComparableTemplateById(
    isEditMode ? marketComparable?.marketComparable.templateId : undefined,
  );

  const { mutate: createMarketComparable, isPending: isCreating } = useCreateMarketComparable();
  const { mutate: updateMarketComparable, isPending: isUpdating } = useUpdateMarketComparable();

  const isPending = isCreating || isUpdating;

  const methods = useForm<createMarketComparableFormType>({
    defaultValues: createMarketComparableFormDefault,
    resolver: zodResolver(createMarketComparableForm),
  });

  const { handleSubmit } = methods;

  // Populate form for edit
  useEffect(() => {
    if (!isEditMode || !marketComparable || !template) return;

    const factorDataValue = template.template.factors.map((factor: any) => {
      const existing = marketComparable.marketComparable.factorData.find(
        (ed: any) => ed.factorId === factor.factorId,
      );
      return existing;
    });

    methods.reset({
      surveyName: marketComparable.marketComparable.surveyName,
      propertyType: marketComparable.marketComparable.propertyType,
      templateCode: template?.template.templateCode,
      infoDateTime: marketComparable.marketComparable.infoDateTime,
      notes: marketComparable.marketComparable.notes,
      sourceInfo: marketComparable.marketComparable.sourceInfo,
      templateId: marketComparable.marketComparable.templateId,
      factorData: factorDataValue,
    });
  }, [isEditMode, marketComparable, template]);

  const onSubmit: SubmitHandler<createMarketComparableFormType> = data => {
    // Convert factorData values to string
    const payload = {
      ...data,
      factorData: (data.factorData ?? []).map(factor => ({
        ...factor,
        value: factor.value === null || factor.value === undefined ? '' : String(factor.value),
      })),
    };

    if (isEditMode && marketId) {
      updateMarketComparable(
        {
          id: marketId,
          ...payload,
        } as any,
        {
          onSuccess: () => {
            toast.success('Market comparable updated successfully');
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to update market comparable. Please try again.',
            );
          },
        },
      );
    } else {
      createMarketComparable(
        {
          ...payload,
          comparableNumber: 'MC-2026-006',
        } as any,
        {
          onSuccess: response => {
            toast.success('Market comparable created successfully');
            // Navigate to edit mode within the same context
            if (appraisalId) {
              navigate(`/appraisal/${appraisalId}/property/market-comparable/${response.id}`);
            } else {
              navigate(`/market-comparable/detail?id=${response.id}`);
            }
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to create market comparable. Please try again.',
            );
          },
        },
      );
    }
  };

  const { isOpen, onToggle } = useDisclosure();

  // Loading state
  const isLoading = isEditMode && (isLoadingComparable || isLoadingTemplate);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[{ label: 'Comparable', id: 'comparable-section', icon: 'chart-line' }]}
        />
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
          {/* Scrollable Form Content */}
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <ResizableSidebar
              isOpen={isOpen}
              onToggle={onToggle}
              openedWidth="w-1/5"
              closedWidth="w-1/50"
            >
              <ResizableSidebar.Main>
                <div className="flex-auto flex flex-col gap-6 min-w-0">
                  {/* Comparable Information Header */}
                  <Section id="comparable-section" anchor>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Icon
                          name="magnifying-glass-location"
                          style="solid"
                          className="w-5 h-5 text-orange-600"
                        />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Comparable Information
                      </h2>
                    </div>
                    <div className="h-px bg-gray-200 mb-4" />
                  </Section>

                  {/* Market Comparable Form */}
                  <Section anchor className="flex flex-col gap-6">
                    <MarketComparableForm />
                  </Section>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>

          {/* Sticky Action Bar */}
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <CancelButton />
                <div className="h-6 w-px bg-gray-200" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" isLoading={isPending} disabled={isPending}>
                  <Icon name="check" style="solid" className="size-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CreateMarketComparablePage;
