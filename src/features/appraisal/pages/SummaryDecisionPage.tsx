import { Button, Icon, ResizableSidebar, Section } from '@/shared/components';
import { FormProvider } from '@/shared/components/form';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import {
  summaryDecisionForm,
  summaryDecisionFormDefault,
  type summaryDecisionFormType,
} from '../schemas/form';
import { useGetSummaryDecision, useUpdateSummaryDecision } from '../api';
import { useEffect } from 'react';
import { mapSummaryDecisionResponseToForm } from '../utils/mappers';
import SummaryDecisionForm, { PriceVerificationForm } from '../forms/SummaryDecisionForm';
import DecisionApproachTable from '../components/tables/DecisionApproachTable';
import LandGovernmentPriceTable from '../components/tables/LandGovernmentPriceTable';

const SummaryDecisionPage = () => {
  const { isOpen, onToggle } = useDisclosure();
  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;

  const methods = useForm<summaryDecisionFormType>({
    defaultValues: summaryDecisionFormDefault,
    resolver: zodResolver(summaryDecisionForm),
  });
  const { mutate, isPending } = useUpdateSummaryDecision();

  const { data: summaryData, isLoading } = useGetSummaryDecision(appraisalId);

  const { handleSubmit, getValues, reset } = methods;

  useEffect(() => {
    if (!summaryData) return;
    const formValues = mapSummaryDecisionResponseToForm(summaryData);
    reset(formValues);
  }, [summaryData, reset]);

  const onSubmit: SubmitHandler<summaryDecisionFormType> = data => {
    mutate({ ...data, apprId: appraisalId } as any);
  };

  const handleSaveDraft = () => {
    const data = getValues();
    mutate({ ...data, apprId: appraisalId } as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider methods={methods} schema={summaryDecisionForm}>
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
                  {/* Building Information Header */}
                  <Section id="properties-section" anchor>
                    <div className="flex justify-between">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
                          <Icon
                            name="circle-info"
                            style="solid"
                            className="w-5 h-5 text-yellow-400"
                          />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Summary Information</h2>
                      </div>
                      <Link
                        to="#"
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                      >
                        <Icon name="map-location-dot" style="solid" className="size-5 shrink-0" />
                      </Link>
                    </div>
                    <div className="h-px bg-gray-200" />
                  </Section>

                  {/* Building Form */}
                  <Section
                    id="building-info"
                    anchor
                    className="flex flex-col gap-6 min-w-0 overflow-hidden"
                  >
                    <div className="w-full max-w-full overflow-hidden">
                      <h2 className="text-sm mb-2 shrink-0">Decision Approach</h2>
                      <DecisionApproachTable data={summaryData?.groupValuations} />
                    </div>
                    <PriceVerificationForm />
                    <div className="w-full max-w-full overflow-hidden">
                      <div className="flex justify-between">
                        <h2 className="text-sm mb-2 shrink-0">
                          Government Appraisal Price ({summaryData?.landTitle?.length})
                        </h2>
                        <div
                          onClick={() => {}}
                          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          <Icon name="eye" style="solid" className="size-5 shrink-0" />
                        </div>
                      </div>
                      <LandGovernmentPriceTable data={summaryData?.landTitle} />
                    </div>
                    <SummaryDecisionForm />
                  </Section>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>

          {/* Sticky Action Buttons */}
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-end items-center">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isPending}
                >
                  <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                  Save draft
                </Button>
                <Button type="submit" disabled={isPending}>
                  <Icon name="check" style="solid" className="size-4 mr-2" />
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default SummaryDecisionPage;
