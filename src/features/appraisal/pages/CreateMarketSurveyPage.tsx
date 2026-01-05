import ResizableSidebar from '@/shared/components/ResizableSidebar';
import AppHeader from '@/shared/components/sections/AppHeader';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateMarketSurveyRequest,
  type CreateMarketSurveyRequestType,
} from '@/shared/forms/marketSurvey';
import { useCreateMarketSurveyRequest } from '../api';
import MarketSurveyForm from '../forms/MarketSurveyForm';
import { createMarketSurveyRequestDefault } from '@/shared/forms/defaults';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

type CollateralCode = 'L' | 'LB' | 'B' | 'U' | 'LS' | 'BS' | 'LBS' | 'MC';
interface Collateral {
  code: CollateralCode;
  description: string;
}

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

const getCollateralCodeByDescription = (description?: string): CollateralCode | undefined => {
  return Collateral.find(c => c.description === description)?.code;
};

const CreateMarketSurveyPage = () => {
  const [searchParams] = useSearchParams();
  const collateralType = searchParams.get('collateralType');
  const methods = useForm<CreateMarketSurveyRequestType>({
    defaultValues: createMarketSurveyRequestDefault,
    resolver: zodResolver(CreateMarketSurveyRequest),
  });

  const { handleSubmit, getValues, setValue } = methods;

  const { mutate } = useCreateMarketSurveyRequest();

  const onSubmit: SubmitHandler<CreateMarketSurveyRequestType> = data => {
    mutate(data);
  };

  const { isOpen, onToggle } = useDisclosure();

  const handleSaveDraft = () => {
    const data = getValues();
    mutate(data);
  };

  useEffect(() => {
    if (!collateralType) return;

    const code = getCollateralCodeByDescription(collateralType);
    if (code) {
      setValue('collateralType', code);
    }
  }, [collateralType, setValue]);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <AppHeader title="Create Market Survey" />
      </div>
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
                    <h2 className="text-lg font-semibol mb-2">Survey Information</h2>
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
    </div>
  );
};

export default CreateMarketSurveyPage;
