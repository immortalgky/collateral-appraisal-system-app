import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import ConfirmDialog from '@/shared/components/ConfirmDialog';

import type {
  CreateMarketComparableRequestType,
  UpdateMarketComparableRequestType,
} from '@/shared/schemas/v1';
import type { MarketComparablePhotoSectionRef } from '../components/MarketComparablePhotoSection';
import { ComparableEditorHeader } from '../components/ComparableEditorHeader';
import type { EditorTab } from '../components/EditorIdentityCard';
import {
  useCreateMarketComparable,
  useGetMarketComparableById,
  useGetMarketComparableTemplateById,
  useLinkAppraisalComparable,
  useUpdateMarketComparable,
} from '../api/marketComparable';
import MarketComparableForm, {
  COMPARABLE_SECTION_FIELDS,
  COMPARABLE_SECTIONS,
} from '../forms/MarketComparableForm';
import {
  createMarketComparableForm,
  createMarketComparableFormDefault,
  type createMarketComparableFormType,
} from '../schemas/form';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import useBreadcrumbExtras from '@/shared/hooks/useBreadcrumbExtras';
import { DuplicateButton } from '@/shared/components';

// Container segments that host market-comparable detail pages — drives the
// after-save redirect so the URL prefix (block-condo / property / etc.) is preserved.
const PARENT_SEGMENTS = ['block-condo', 'block-village', 'property-pma', 'property'] as const;

const CreateMarketComparablePage = () => {
  const { t } = useTranslation(['appraisal', 'common']);
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const location = useLocation();
  const queryClient = useQueryClient();
  const appraisalId = useAppraisalId();

  const segments = location.pathname.replace(`${basePath}/`, '').split('/').filter(Boolean);
  const parentSegment =
    (PARENT_SEGMENTS as readonly string[]).find(s => s === segments[0]) ?? 'property';

  // Support both appraisal-nested routes (URL params) and standalone routes (search params)
  const { marketComparableId } = useParams<{
    marketComparableId?: string;
  }>();
  const [searchParams] = useSearchParams();

  // Edit mode: URL param (appraisal context) or search param (standalone)
  const marketId = marketComparableId || searchParams.get('id');
  const isEditMode = !!marketId;

  // Copy mode: prefill the form from an existing survey (?copyFrom=) but still
  // CREATE a brand-new comparable on save (so the user doesn't re-key everything).
  const copyFromId = searchParams.get('copyFrom');
  const sourceId = marketId ?? copyFromId ?? undefined;

  const { data: marketComparable, isLoading: isLoadingComparable } =
    useGetMarketComparableById(sourceId);
  const { data: template, isLoading: isLoadingTemplate } = useGetMarketComparableTemplateById(
    marketComparable?.marketComparable.templateId,
  );

  // The "Property Information → Market Comparable" structural parents are derived
  // from the URL by the layout. Only push the dynamic leaf (comparable number) here.
  const comparableNumber = marketComparable?.marketComparable.comparableNumber?.trim();
  const comparableLeafLabel = isEditMode ? comparableNumber || '...' : null;
  useBreadcrumbExtras(
    comparableLeafLabel
      ? [
          {
            label: comparableLeafLabel,
            href: location.pathname,
            icon: 'magnifying-glass-location',
          },
        ]
      : [],
    [comparableLeafLabel, location.pathname],
  );

  const { mutate: createMarketComparable, isPending: isCreating } = useCreateMarketComparable();
  const { mutate: updateMarketComparable, isPending: isUpdating } = useUpdateMarketComparable();
  const { mutateAsync: linkAppraisalComparable } = useLinkAppraisalComparable();

  const photoSectionRef = useRef<MarketComparablePhotoSectionRef>(null);

  const isPending = isCreating || isUpdating;

  const mapComparableToForm = useMemo(() => {
    // Prefill from the loaded source in BOTH edit mode and copy mode.
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
      latitude: marketComparable.marketComparable.latitude ?? null,
      longitude: marketComparable.marketComparable.longitude ?? null,
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
    formState: { isDirty, errors },
  } = methods;

  // A new comparable takes its type from the template the form picks, or from the link it came from.
  const typeCode =
    useWatch({ control: methods.control, name: 'propertyType' }) ||
    searchParams.get('propertyType') ||
    '';
  const factorCount = useWatch({ control: methods.control, name: 'factorData' })?.length ?? 0;

  // The header's section bar, with each section's failed fields counted so none hides off-screen.
  const countErrors = (names: readonly string[]) =>
    names.filter(name => errors[name as keyof typeof errors]).length;
  const factorErrors = Array.isArray(errors.factorData)
    ? errors.factorData.filter(Boolean).length
    : 0;
  const sections: EditorTab[] = [
    {
      id: COMPARABLE_SECTIONS.source,
      label: t('marketEditor.sections.source'),
      errorCount: countErrors(COMPARABLE_SECTION_FIELDS.source),
    },
    {
      id: COMPARABLE_SECTIONS.price,
      label: t('marketEditor.sections.price'),
      // With no price at all both fail, but only the one the toggle shows is on screen.
      errorCount:
        countErrors(COMPARABLE_SECTION_FIELDS.price) +
        (errors.offerPrice || errors.salePrice ? 1 : 0),
    },
    {
      id: COMPARABLE_SECTIONS.location,
      label: t('marketEditor.sections.location'),
      errorCount: countErrors(COMPARABLE_SECTION_FIELDS.location),
    },
    {
      id: COMPARABLE_SECTIONS.factors,
      label: t('marketEditor.sections.factors'),
      count: factorCount,
      errorCount: countErrors(COMPARABLE_SECTION_FIELDS.factors) + factorErrors,
    },
    {
      id: COMPARABLE_SECTIONS.remark,
      label: t('marketEditor.sections.remark'),
      errorCount: countErrors(COMPARABLE_SECTION_FIELDS.remark),
    },
  ];

  const { blocker, skipWarning } = useUnsavedChangesWarning(isDirty);

  useEffect(() => {
    // Reset the form once the source data is mapped (edit OR copy prefill).
    if (mapComparableToForm) {
      methods.reset(mapComparableToForm);
    }
  }, [mapComparableToForm]);

  useEffect(() => {
    if (!sourceId && location.state?.duplicateData) {
      methods.reset(location.state.duplicateData);
    }
  }, [sourceId, location.state]);

  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const handleDuplicate = () => {
    setIsDuplicateDialogOpen(true);
  };
  const handleConfirmDuplicate = () => {
    const duplicateData = methods.getValues();
    navigate(`${basePath}/${parentSegment}/market-comparable/new`, { state: { duplicateData } });
    setIsDuplicateDialogOpen(false);
  };

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
          // Falsy (0 / empty) → null so an unset coordinate doesn't pin at 0,0.
          latitude: data.latitude || null,
          longitude: data.longitude || null,
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
          toast.success(t('toasts.marketComparableUpdated'));
          navigate(`${basePath}/${parentSegment}?tab=markets`);
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || t('marketEditor.toasts.updateFailed'));
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
        // Falsy (0 / empty) → null so an unset coordinate doesn't pin at 0,0.
        latitude: data.latitude || null,
        longitude: data.longitude || null,
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
                weight: null,
                selectionReason: null,
                notes: null,
              });
            } catch (error: any) {
              toast.error(error.apiError?.detail || t('marketEditor.toasts.linkFailed'));
              return;
            }
          }
          // Link any pending photos to the newly created comparable
          await photoSectionRef.current?.linkImagesToComparable(response.id);

          skipWarning();
          toast.success(t('toasts.marketComparableCreated'));
          if (appraisalId) {
            navigate(`${basePath}/${parentSegment}/market-comparable/${response.id}`);
          } else {
            navigate(`/market-comparable/detail?id=${response.id}`);
          }
        },
        onError: (error: any) => {
          toast.error(error.apiError?.detail || t('marketEditor.toasts.createFailed'));
        },
      });
    }
  };

  const { isOpen, onToggle } = useDisclosure();

  // Loading state — block render until the source data is available when prefilling
  // (edit OR copy), so the form mounts already populated rather than flashing empty.
  const isLoading =
    !!sourceId && (isLoadingComparable || isLoadingTemplate || !marketComparable || !template);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider methods={methods} schema={createMarketComparableForm}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
          {/* Scrollable Form Content */}
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <ComparableEditorHeader
              appraisalId={appraisalId}
              marketComparableId={marketId ?? undefined}
              source={marketComparable?.marketComparable}
              isCopy={!isEditMode && !!copyFromId}
              typeCode={typeCode}
              photoSectionRef={photoSectionRef}
              sections={sections}
            />
            <ResizableSidebar
              isOpen={isOpen}
              onToggle={onToggle}
              openedWidth="w-1/5"
              closedWidth="w-1/50"
            >
              <ResizableSidebar.Main>
                <MarketComparableForm />
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>

          {/* Sticky Action Bar */}
          <ActionBar>
            <ActionBar.Left>
              <CancelButton fallbackPath={`${basePath}/property?tab=markets`} />
              {!isReadOnly && (
                <>
                  <ActionBar.Divider />
                  <ActionBar.UnsavedIndicator show={isDirty} />
                </>
              )}
              <DuplicateButton onClick={handleDuplicate} disabled={!isEditMode || isPending} />
            </ActionBar.Left>
            {!isReadOnly && (
              <ActionBar.Right>
                <Button type="submit" isLoading={isPending} disabled={isPending}>
                  <Icon name="check" style="solid" className="size-4 mr-2" />
                  {t('createPage.save')}
                </Button>
              </ActionBar.Right>
            )}
          </ActionBar>

          <UnsavedChangesDialog blocker={blocker} />
        </form>
      </FormProvider>

      <ConfirmDialog
        isOpen={isDuplicateDialogOpen}
        onClose={() => setIsDuplicateDialogOpen(false)}
        onConfirm={handleConfirmDuplicate}
        title={t('forms.marketComparable.duplicateDialog.title')}
        message={t('forms.marketComparable.duplicateDialog.message')}
        confirmText={t('forms.marketComparable.duplicateDialog.confirm')}
        cancelText={t('common:actions.cancel')}
        variant="info"
      />
    </div>
  );
};

export default CreateMarketComparablePage;
