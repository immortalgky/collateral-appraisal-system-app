import { FormProvider, type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  landDetailFormDefaults,
  LandDetailFormSchema,
  type LandDetailFormType,
} from '../types/landDetail';
import LandDetailTable from '../components/LandDetailTable';
import LandInformationForm from '../forms/LandInformationForm';
import LandLocationForm from '../forms/LandLocationForm';
import PlotLocationForm from '../forms/PlotLocationForm';
import LandCharacteristicsForm from '../forms/LandCharacteristicsForm';
import LandBoundaryForm from '../forms/LandBoundaryForm';
import Dropdown from '@shared/components/inputs/Dropdown';

export default function LandDetailPage() {
  const methods = useForm<LandDetailFormType>({
    defaultValues: landDetailFormDefaults,
    resolver: zodResolver(LandDetailFormSchema),
  });

  const { handleSubmit, getValues } = methods;

  const onSubmit: SubmitHandler<LandDetailFormType> = data => {
    console.log('Form data:', data);
    // TODO: Add API call to save data
  };

  const handleSaveDraft = () => {
    const data = getValues();
    console.log('Save draft:', data);
    // TODO: Add API call to save draft
  };

  const groupOptions = [
    { value: 'group1', label: 'Group 1' },
    { value: 'group2', label: 'Group 2' },
    { value: 'group3', label: 'Group 3' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto p-6 -mt-4">

          {/* Top Navigation Tabs - DaisyUI tabs */}
          <div role="tablist" className="tabs tabs-bordered mt-4 mb-6">
            <button type="button" role="tab" className="tab tab-active">
              PROPERTIES
            </button>
            <button type="button" role="tab" className="tab">
              MARKETS
            </button>
            <button type="button" role="tab" className="tab">
              GALLERY
            </button>
            <button type="button" role="tab" className="tab">
              PHOTO
            </button>
            <button type="button" role="tab" className="tab">
              LAWS AND REGULATION
            </button>
          </div>

          {/* Image Upload Section */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <button
              type="button"
              className="btn btn-outline btn-ghost flex-shrink-0 w-36 h-28 border-2 border-dashed"
            >
              Click to add picture
            </button>
            <div className="flex-shrink-0 w-36 h-28 rounded-lg ring-4 ring-primary overflow-hidden">
              <div className="w-full h-full bg-base-200 flex items-center justify-center text-base-content/50">
                Image 1
              </div>
            </div>
            <div className="flex-shrink-0 w-36 h-28 rounded-lg overflow-hidden">
              <div className="w-full h-full bg-base-200 flex items-center justify-center text-base-content/50">
                Image 2
              </div>
            </div>
            <div className="flex-shrink-0 w-20 h-28 overflow-hidden rounded-lg">
              <div className="w-full h-full bg-base-200 flex items-center justify-center text-base-content/50">
                +
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col gap-6 overflow-y-auto max-h-[calc(100dvh-24rem)]">
            {/* Appraisal Information Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium">Appraisal Information</h2>
              <div className="w-28">
                <Dropdown
                  name="groupId"
                  options={groupOptions}
                  value="group1"
                  onChange={() => {}}
                />
              </div>
            </div>
            <div className="divider my-0"></div>

            {/* Land Detail Table */}
            <LandDetailTable />

            <div className="divider my-0"></div>

            {/* Land Information Section */}
            <LandInformationForm />

            <div className="divider my-0"></div>

            {/* Land Location Section */}
            <LandLocationForm />

            <div className="divider my-0"></div>

            {/* Plot Location Section */}
            <PlotLocationForm />

            <div className="divider my-0"></div>

            {/* Land Characteristics Section */}
            <LandCharacteristicsForm />

            <div className="divider my-0"></div>

            {/* Size and Boundary Section */}
            <LandBoundaryForm />
          </div>

          {/* Footer Actions */}
          <div className="divider"></div>
          <div className="flex justify-between">
            <button type="button" className="btn btn-ghost">
              Cancel
            </button>
            <div className="flex gap-4">
              <button type="button" className="btn btn-outline" onClick={handleSaveDraft}>
                Save draft
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
