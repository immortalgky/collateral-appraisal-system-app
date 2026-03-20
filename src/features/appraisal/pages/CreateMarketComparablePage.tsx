import { useEffect, useMemo, useRef } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';

import type {
  CreateMarketComparableRequestType,
  UpdateMarketComparableRequestType,
} from '@/shared/schemas/v1';
import MarketComparablePhotoSection, {
  type MarketComparablePhotoSectionRef,
} from '../components/MarketComparablePhotoSection';
import {
  useCreateMarketComparable,
  useGetMarketComparableById,
  useGetMarketComparableTemplateById,
  useLinkAppraisalComparable,
  useUpdateMarketComparable,
} from '../api/marketComparable';
import MarketComparableForm from '../forms/MarketComparableForm';
import {
  createMarketComparableForm,
  createMarketComparableFormDefault,
  type createMarketComparableFormType,
} from '../schemas/form';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

const CreateMarketComparablePage = () => {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const { mutateAsync: linkAppraisalComparable } = useLinkAppraisalComparable();

  const photoSectionRef = useRef<MarketComparablePhotoSectionRef>(null);

  const isPending = isCreating || isUpdating;

  const mapComparableToForm = useMemo(() => {
    if (!isEditMode || !marketComparable || !template) return null;

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
      templateCode: template?.template.templateCode,
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
  }, [isEditMode, marketComparable, template]);

  const formDefaults = mapComparableToForm ?? createMarketComparableFormDefault;

  const methods = useForm<createMarketComparableFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createMarketComparableForm),
  });

  const {
    handleSubmit,
    formState: { isDirty },
  } = methods;

  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    if (isEditMode && mapComparableToForm) {
      methods.reset(mapComparableToForm);
    }
  }, [isEditMode, mapComparableToForm]);

  const onSubmit: SubmitHandler<createMarketComparableFormType> = data => {
    // Convert factorData values to string
    const factorData = (data.factorData ?? []).map(factor => ({
      ...factor,
      value:
        factor.value === null || factor.value === undefined
          ? ''
          : Array.isArray(factor.value)
            ? JSON.stringify(factor.value)
            : String(factor.value),
    }));

    if (isEditMode && marketId) {
      const updatePayload: UpdateMarketComparableRequestType & { id: string; factorData?: any[] } =
        {
          id: marketId,
          propertyType: data.propertyType ?? '',
          surveyName: data.surveyName,
          infoDateTime: data.infoDateTime || null,
          sourceInfo: data.sourceInfo || null,
          notes: data.notes || null,
          templateId: data.templateId || null,
          offerPrice: data.offerPrice ?? null,
          offerPriceAdjustmentPercent: null,
          offerPriceAdjustmentAmount: null,
          offerPriceUnit: data.offerPriceUnit ?? null,
          salePrice: data.salePrice ?? null,
          salePriceUnit: data.salePriceUnit ?? null,
          saleDate: data.saleDate || null,
          factorData,
        };

      updateMarketComparable(updatePayload, {
        onSuccess: () => {
          methods.reset(methods.getValues());
          if (appraisalId) {
            queryClient.invalidateQueries({
              queryKey: ['appraisals', appraisalId, 'comparables'],
            });
          }
          skipWarning();
          toast.success('Market comparable updated successfully');
          navigate(`/appraisals/${appraisalId}/property?tab=markets`);
        },
        onError: (error: any) => {
          toast.error(
            error.apiError?.detail || 'Failed to update market comparable. Please try again.',
          );
        },
      });
    } else {
      const createPayload: CreateMarketComparableRequestType & { factorData?: any[] } = {
        comparableNumber: data.comparableNumber ?? '',
        propertyType: data.propertyType ?? '',
        surveyName: data.surveyName,
        infoDateTime: data.infoDateTime || null,
        sourceInfo: data.sourceInfo || null,
        notes: data.notes || null,
        templateId: data.templateId || null,
        offerPrice: data.offerPrice ?? null,
        offerPriceAdjustmentPercent: null,
        offerPriceAdjustmentAmount: null,
        offerPriceUnit: data.offerPriceUnit ?? null,
        salePrice: data.salePrice ?? null,
        salePriceUnit: data.salePriceUnit ?? null,
        saleDate: data.saleDate || null,
        factorData,
      };

      createMarketComparable(createPayload, {
        onSuccess: async response => {
          if (appraisalId) {
            try {
              await linkAppraisalComparable({
                appraisalId,
                marketComparableId: response.id,
                sequenceNumber: 0,
                originalPricePerUnit: 0,
              });
            } catch (error: any) {
              toast.error(
                error.apiError?.detail || 'Created comparable but failed to link to appraisal.',
              );
              return;
            }
          }
          // Link any pending photos to the newly created comparable
          await photoSectionRef.current?.linkImagesToComparable(response.id);

          skipWarning();
          toast.success('Market comparable created successfully');
          if (appraisalId) {
            navigate(`/appraisals/${appraisalId}/property/market-comparable/${response.id}`);
          } else {
            navigate(`/market-comparable/detail?id=${response.id}`);
          }
        },
        onError: (error: any) => {
          toast.error(
            error.apiError?.detail || 'Failed to create market comparable. Please try again.',
          );
        },
      });
    }
  };

  const { isOpen, onToggle } = useDisclosure();

  // Loading state — block render until both data sources are available in edit mode
  const isLoading =
    isEditMode && (isLoadingComparable || isLoadingTemplate || !marketComparable || !template);
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
          anchors={[
            ...(appraisalId ? [{ label: 'Photos', id: 'photos-section', icon: 'images' }] : []),
            { label: 'Comparable', id: 'comparable-section', icon: 'chart-line' },
            { label: 'Survey Factors', id: 'factors-section', icon: 'sliders' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createMarketComparableForm}>
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
                    {/* Photo Section (appraisal context only) */}
                    {appraisalId && (
                      <Section id="photos-section" anchor>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Icon name="images" style="solid" className="w-5 h-5 text-blue-600" />
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
                        </div>
                        <div className="h-px bg-gray-200 mb-4" />
                        <MarketComparablePhotoSection
                          ref={photoSectionRef}
                          appraisalId={appraisalId}
                          marketComparableId={marketId ?? undefined}
                          images={marketComparable?.marketComparable?.images}
                        />
                      </Section>
                    )}

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
            <ActionBar>
              <ActionBar.Left>
                <CancelButton />
                {!isReadOnly && (
                  <>
                    <ActionBar.Divider />
                    <ActionBar.UnsavedIndicator show={isDirty} />
                  </>
                )}
              </ActionBar.Left>
              {!isReadOnly && (
                <ActionBar.Right>
                  <Button type="submit" isLoading={isPending} disabled={isPending}>
                    <Icon name="check" style="solid" className="size-4 mr-2" />
                    Save
                  </Button>
                </ActionBar.Right>
              )}
            </ActionBar>

            <UnsavedChangesDialog blocker={blocker} />
          </form>
      </FormProvider>
    </div>
  );
};

export default CreateMarketComparablePage;
