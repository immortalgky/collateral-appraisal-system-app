import ResizableSidebar from '@/shared/components/ResizableSidebar';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { FormProvider, useForm, useWatch, type SubmitHandler } from 'react-hook-form';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useCreateMarketSurveyRequest,
  useGetMarketSurveyById,
  useUpdateMarketSurveyRequest,
} from '../api';
import MarketSurveyForm from '../forms/MarketSurveyForm';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createMarketSurveyForm,
  createMarketSurveyFormDefault,
  type createMarketSurveyFormType,
} from '../schemas/form';
import toast from 'react-hot-toast';

// Define collateral types
type CollateralCode = 'L' | 'LB' | 'B' | 'U' | 'LS' | 'BS' | 'LBS' | 'MC';
interface Collateral {
  code: CollateralCode;
  description: string;
}
// List of collateral types
const Collateral: Collateral[] = [
  { code: 'L', description: 'Lands' },
  { code: 'LB', description: 'Land and Building' },
  { code: 'B', description: 'Building' },
  { code: 'U', description: 'Condominium' },
  { code: 'LS', description: 'Lease Agreement Lands' },
  { code: 'BS', description: 'Lease Agreement Building' },
  { code: 'LBS', description: 'Lease Agreement Land and Building' },
  { code: 'MC', description: 'Machinery' },
];
// Helper to get collateral code by description
const getCollateralCodeByDescription = (description?: string): CollateralCode | undefined => {
  return Collateral.find(c => c.description === description)?.code;
};

const CreateMarketSurveyPage = () => {
  // Get search params for edit mode and collateral type
  const [searchParams] = useSearchParams();
  // Wacth for marketId and collateralType in URL
  const marketId = searchParams.get('id');
  const collateralType = searchParams.get('collateralType');
  // if got marketId, will define isEditMode as true
  const isEditMode = !!marketId;
  // Fetch market survey data if got marketId
  const { data: marketSurvey } = useGetMarketSurveyById(isEditMode ? marketId : undefined);

  const { mutate: createMarketSurvey, isPending: isCreating } = useCreateMarketSurveyRequest();
  const { mutate: updateMarketSurvey, isPending: isUpdating } = useUpdateMarketSurveyRequest();

  const isPending = isCreating || isUpdating;

  // Initialize form methods
  const methods = useForm<createMarketSurveyFormType>({
    defaultValues: createMarketSurveyFormDefault,
    resolver: zodResolver(createMarketSurveyForm),
  });

  // Populate form for edit
  useEffect(() => {
    if (!isEditMode || !marketSurvey) return;

    methods.reset({
      surveyName: marketSurvey.surveyName,
      collateralType: marketSurvey.collateralCode,
      surveyTemplateCode: marketSurvey.templateCode,
      marketSurveyData: marketSurvey.marketSurveyData,
    });
  }, [isEditMode, marketSurvey]);

  const { handleSubmit, getValues, setValue } = methods;

  const { mutate } = useCreateMarketSurveyRequest();

  const onSubmit: SubmitHandler<createMarketSurveyFormType> = data => {
    if (isEditMode && marketId) {
      updateMarketSurvey(
        {
          data,
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
          data,
        } as any,
        {
          onSuccess: response => {
            toast.success('Market survey created successfully');
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

  const handleSaveDraft = () => {
    const data = getValues();
    mutate(data);
  };

  // Set collateral type in form when got collateralType in URL
  useEffect(() => {
    if (!collateralType) return;

    const code = getCollateralCodeByDescription(collateralType);
    if (code) {
      setValue('collateralType', code);
    }
  }, [collateralType, setValue]);

  return (
    <div className="flex flex-col gap-6 overflow-y-auto h-[calc(100dvh-15rem)] scroll-smooth">
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
              <Button variant="outline" type="button" onClick={handleSaveDraft}>
                Save draft
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CreateMarketSurveyPage;
