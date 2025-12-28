import { FormFields } from '@/shared/components/form';

const directions = ['north', 'south', 'east', 'west'] as const;

export default function LandBoundaryForm() {
  return (
    <div className="flex flex-col gap-8">
      {/* Size and Boundary of Land */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Size and Boundary of Land</h3>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          {directions.map(direction => (
            <div key={direction} className="card bg-base-100 border border-base-300">
              <div className="card-body p-4">
                <h4 className="card-title text-sm capitalize">{direction}</h4>
                <div className="grid grid-cols-6 gap-4">
                  <FormFields
                    fields={[
                      {
                        type: 'text-input',
                        label: 'Contact Area',
                        name: `sizeAndBoundary.${direction}.contactArea`,
                        wrapperClassName: 'col-span-3',
                      },
                      {
                        type: 'text-input',
                        label: 'Estimate Length',
                        name: `sizeAndBoundary.${direction}.estimateLength`,
                        wrapperClassName: 'col-span-3',
                      },
                    ]}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="divider my-0"></div>

      {/* Other Information */}
      <div className="flex gap-6">
        <div className="w-44 flex-shrink-0">
          <h3 className="text-base font-medium">Other Information</h3>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-6 gap-4">
            <FormFields
              fields={[
                {
                  type: 'text-input',
                  label: 'Front Area',
                  name: 'frontArea',
                  wrapperClassName: 'col-span-3',
                },
                {
                  type: 'text-input',
                  label: 'Depth of Plot',
                  name: 'depthOfPlot',
                  wrapperClassName: 'col-span-3',
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
