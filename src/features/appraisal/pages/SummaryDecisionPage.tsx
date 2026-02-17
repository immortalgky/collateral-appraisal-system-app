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
import { useEffect, useState } from 'react';
import { mapSummaryDecisionResponseToForm } from '../utils/mappers';
import SummaryDecisionForm, {
  PriceVerificationForm,
  DecisionForm,
} from '../forms/SummaryDecisionForm';
import LandGovernmentPriceTable from '../components/tables/LandGovernmentPriceTable';
import DecisionApproachTable from '../components/tables/DecisionApproachTable';
import {
  useGetActivityTracking,
  useGetSummaryDecision,
  useUpdateSummaryDecision,
} from '../api/summaryDecision';

const SummaryDecisionPage = () => {
  const { isOpen, onToggle } = useDisclosure();
  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isModalLandOpen, setIsModalLandOpen] = useState(false);

  const methods = useForm<summaryDecisionFormType>({
    defaultValues: summaryDecisionFormDefault,
    resolver: zodResolver(summaryDecisionForm),
  });
  const { mutate, isPending } = useUpdateSummaryDecision();

  const { data: summaryData, isLoading: summaryLoading } = useGetSummaryDecision(appraisalId);
  const { data: activityTracking, isLoading: activityTrackingLoading } =
    useGetActivityTracking(appraisalId);

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

  if (summaryLoading) {
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
                  <Section>
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

                  <Section className="flex flex-col gap-6 min-w-0 overflow-hidden">
                    <div className="w-full max-w-full overflow-hidden">
                      <h2 className="text-sm mb-2 shrink-0">Decision Approach</h2>
                      <DecisionApproachTable data={summaryData?.groupValuations} />
                    </div>
                    <PriceVerificationForm />
                    <div className="w-full max-w-full overflow-hidden">
                      <div className="flex justify-between">
                        <h2 className="text-sm mb-2 shrink-0">
                          Government Appraisal Price ({summaryData?.landTitle?.length}) items
                        </h2>
                        <div
                          onClick={() => {
                            setIsModalLandOpen(true);
                          }}
                          className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                        >
                          <Icon name="eye" style="solid" className="size-5 shrink-0" />
                        </div>
                      </div>
                      <LandGovernmentPriceTable data={summaryData?.landTitle} displayItems={5} />
                    </div>
                    <SummaryDecisionForm />
                    <div className="h-px bg-gray-200 col-span-9 my-4" />

                    {/* Activity Tracking */}
                    <div className="grid grid-cols-13 col-span-9 gap-4">
                      <div className="col-span-6">
                        <div className=" cursor-pointer">
                          <div
                            className="flex justify-between items-center"
                            onClick={() => setIsActivityOpen(prev => !prev)}
                          >
                            <div className="flex items-center gap-3 ">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Icon
                                  name="clock-rotate-left"
                                  style="solid"
                                  className="w-5 h-5 text-blue-500"
                                />
                              </div>
                              <h2 className="text-lg font-semibold text-gray-900">
                                Activity Tracking
                              </h2>
                            </div>
                            <Icon
                              name="chevron-up"
                              style="solid"
                              className={`w-5 h-5 transition-transform duration-300 ${
                                isActivityOpen ? 'rotate-0' : 'rotate-180'
                              }`}
                            />
                          </div>
                          <div className="h-px bg-gray-200 my-4" />
                        </div>
                        <div
                          className={`transition-all duration-500 overflow-hidden ${
                            isActivityOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          {isActivityOpen && (
                            <>
                              {activityTrackingLoading ? (
                                <div className="flex items-center justify-center h-64">
                                  <Icon
                                    name="spinner"
                                    style="solid"
                                    className="w-8 h-8 animate-spin text-primary"
                                  />
                                </div>
                              ) : (
                                activityTracking?.map(item => (
                                  <div className="flex gap-4 p-1.5 hover:bg-gray-100">
                                    <div className="w-14 h-14 bg-amber-100 rounded-full"></div>
                                    <div>
                                      <h2 className="text-lg font-semibold text-yellow-500">
                                        {item.role}
                                      </h2>
                                      <p className="text-xs text-gray-900">{item.userName}</p>
                                      <p className="text-xs text-gray-900">
                                        Remark : {item.remarkDecision}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <div className="w-px bg-gray-200" />
                      </div>

                      {/* Decision */}
                      <div className="col-span-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon name="rocket" style="solid" className="w-5 h-5 text-primary" />
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900">Decision</h2>
                        </div>
                        <div className="h-px bg-gray-200 my-4" />
                        <DecisionForm />
                      </div>
                    </div>
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

      {/* Modal Land Government Price */}
      {isModalLandOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl h-3/5 w-3/5 flex flex-col">
            {/* Header */}
            <div className="flex justify-between shrink-0">
              <h2 className="text-lg font-semibold mb-2">
                Government Appraisal Price ({summaryData?.landTitle?.length}) items
              </h2>

              <div
                onClick={() => setIsModalLandOpen(false)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              >
                <Icon name="x" style="solid" className="size-5" />
              </div>
            </div>

            <div className="h-[1px] bg-gray-300 my-2 mb-4 shrink-0"></div>

            {/* Scroll Area */}
            <div className="flex-1 overflow-y-auto">
              <LandGovernmentPriceTable data={summaryData?.landTitle} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummaryDecisionPage;
