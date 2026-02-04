import ResizableSidebar from '@/shared/components/ResizableSidebar';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateMarketSurveyRequest,
  useGetMarketSurveyById,
  useGetMarketSurveyTemplateById,
  useUpdateMarketSurveyRequest,
} from '../api';
import MarketSurveyForm from '../forms/MarketSurveyForm';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createMarketSurveyForm,
  createMarketSurveyFormDefault,
  type createMarketSurveyFormType,
} from '../schemas/form';
import toast from 'react-hot-toast';

const CreateMarketSurveyPage = () => {
  const navigate = useNavigate();
  // Get search params for edit mode and collateral type
  const [searchParams] = useSearchParams();
  // Wacth for marketId and collateralType in URL
  const marketId = searchParams.get('id');

  // if got marketId, will define isEditMode as true
  const isEditMode = !!marketId;
  // Fetch market survey data if got marketId
  const { data: marketComparable } = useGetMarketSurveyById(isEditMode ? marketId : undefined);
  const { data: template } = useGetMarketSurveyTemplateById(
    isEditMode ? marketComparable?.marketComparable.templateId : undefined,
  );

  const { mutate: createMarketSurvey, isPending: isCreating } = useCreateMarketSurveyRequest();
  const { mutate: updateMarketSurvey, isPending: isUpdating } = useUpdateMarketSurveyRequest();

  const isPending = isCreating || isUpdating;

  // Initialize form methods
  const methods = useForm<createMarketSurveyFormType>({
    defaultValues: createMarketSurveyFormDefault,
    resolver: zodResolver(createMarketSurveyForm),
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
      note: marketComparable.marketComparable.note,
      sourceInfo: marketComparable.marketComparable.sourceInfo,
      templateId: marketComparable.marketComparable.templateId,
      factorData: factorDataValue,
    });
  }, [isEditMode, marketComparable, template]);

  const onSubmit: SubmitHandler<createMarketSurveyFormType> = data => {
    // Convert factorData values to string
    const payload = {
      ...data,
      factorData: data.factorData.map(factor => ({
        ...factor,
        value: factor.value === null || factor.value === undefined ? '' : String(factor.value),
      })),
    };

    if (isEditMode && marketId) {
      updateMarketSurvey(
        {
          id: marketId,
          ...payload,
        } as any,
        {
          onSuccess: () => {
            toast.success('Market survey updated successfully');
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to update market survey. Please try again.',
            );
          },
        },
      );
    } else {
      createMarketSurvey(
        {
          ...payload,
          comparableNumber: 'MC-2026-005',
        } as any,
        {
          onSuccess: response => {
            toast.success('Market survey created successfully');
            navigate(`/market-comparable/detail?id=${response.id}`);
          },
          onError: (error: any) => {
            toast.error(
              error.apiError?.detail || 'Failed to update market survey. Please try again.',
            );
          },
        },
      );
    }
  };

  const { isOpen, onToggle } = useDisclosure();

  return (
    <div className="flex flex-col gap-6 overflow-y-auto h-full min-h-0 scroll-smooth">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <ResizableSidebar
            isOpen={isOpen}
            onToggle={onToggle}
            openedWidth="w-1/5"
            closedWidth="w-1/50"
          >
            <ResizableSidebar.Main>
              <div className="flex-auto flex flex-col gap-6 ">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Survey Information</h2>
                  <div className="h-[0.1px] bg-gray-300 col-span-5"></div>
                </div>
                <Section anchor className="flex flex-col gap-6">
                  <MarketSurveyForm />
                </Section>
              </div>
            </ResizableSidebar.Main>
          </ResizableSidebar>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <CancelButton />
              <div className="h-6 w-px bg-gray-200" />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={isPending}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CreateMarketSurveyPage;
