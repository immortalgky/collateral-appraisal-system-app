import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import {
  usePropertyNameSoftDefault,
  type UsePropertyNameSoftDefaultOptions,
} from '../hooks/usePropertyNameSoftDefault';
interface LandDetailFormProps {
  isLoaded: boolean;
  softDefault?: UsePropertyNameSoftDefaultOptions | false;
}
  allocationField,
  anticipationProsperityField,
  encroachedField,
  evictionField,
  expropriateField,
  landEntranceField,
  landFillField,
  landInfoField,
  landLocationField,
  landUseField,
  LimitationOther,
  otherInformationField,
  plotLocationField,
  publicUtilityField,
  remarkLandField,
  roadField,
  roadSurfaceField,
  sizeAndBoundary,
  transpotationField,
} from '../configs/fields';

/** Section row component for form layout */
interface SectionRowProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const SectionRow = ({ title, icon, children, isLast = false }: SectionRowProps) => (
  <>
    <div className="col-span-1 pt-1">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <Icon style="solid" name={icon} className="size-3.5 text-primary-600" />
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 leading-tight">{title}</span>
      </div>
    </div>
    <div className="col-span-4">
      <div className="grid grid-cols-12 gap-4">{children}</div>
    </div>
    {!isLast && <div className="h-px bg-gray-200 col-span-5 my-2" />}
  </>
);

const LandDetailForm = ({ isLoaded, softDefault }: LandDetailFormProps) => {
  const defaultConfig: UsePropertyNameSoftDefaultOptions = {
    fields: ['titles'],
    arrayField: values =>
      values[0]
        ?.map((t: any) => t?.titleNumber)
        .filter(Boolean)
        .join(', '),
  };

  usePropertyNameSoftDefault(
    softDefault === false ? { ...defaultConfig, enabled: false } : (softDefault ?? defaultConfig),
    isLoaded,
  );
  return (
    <div className="w-full max-w-full overflow-hidden">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Land Detail</h2>
      <div className="grid grid-cols-5 gap-x-6 gap-y-4">
        <SectionRow title="Land Information" icon="info-circle">
          <FormFields fields={landInfoField} />
        </SectionRow>

        <SectionRow title="Land Location" icon="map-location-dot">
          <FormFields fields={landLocationField} />
        </SectionRow>

        <SectionRow title="Plot Location" icon="location-dot">
          <FormFields fields={plotLocationField} />
        </SectionRow>

        <SectionRow title="Landfill" icon="mountain">
          <FormFields fields={landFillField} />
        </SectionRow>

        <SectionRow title="Road" icon="road">
          <FormFields fields={roadField} />
        </SectionRow>

        <SectionRow title="Road Surface" icon="road-circle-check">
          <FormFields fields={roadSurfaceField} />
        </SectionRow>

        <SectionRow title="Public Utility" icon="bolt">
          <FormFields fields={publicUtilityField} />
        </SectionRow>

        <SectionRow title="Land Use" icon="seedling">
          <FormFields fields={landUseField} />
        </SectionRow>

        <SectionRow title="Land Entrance-Exit" icon="door-open">
          <FormFields fields={landEntranceField} />
        </SectionRow>

        <SectionRow title="Transportation" icon="car">
          <FormFields fields={transpotationField} />
        </SectionRow>

        <SectionRow title="Anticipation of Prosperity" icon="chart-line">
          <FormFields fields={anticipationProsperityField} />
        </SectionRow>

        <SectionRow title="Limitation" icon="triangle-exclamation">
          <FormFields fields={expropriateField} />
          <FormFields fields={encroachedField} />
          <FormFields fields={LimitationOther} />
        </SectionRow>

        <SectionRow title="Eviction" icon="ban">
          <FormFields fields={evictionField} />
        </SectionRow>

        <SectionRow title="Allocation" icon="th-large">
          <FormFields fields={allocationField} />
        </SectionRow>

        <SectionRow title="Size and Boundary" icon="ruler-combined">
          <FormFields fields={sizeAndBoundary} />
        </SectionRow>

        <SectionRow title="Other Information" icon="circle-info">
          <FormFields fields={otherInformationField} />
        </SectionRow>

        <SectionRow title="Remark" icon="comment" isLast>
          <FormFields fields={remarkLandField} />
        </SectionRow>
      </div>
    </div>
  );
};

export default LandDetailForm;
