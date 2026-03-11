import { FormFields } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import BoundaryFields from '../components/BoundaryFields';
import {
  allocationField,
  anticipationProsperityField,
  electricityField,
  encroachedField,
  evictionField,
  expropriateField,
  landBoundaryField,
  landEntranceField,
  landFillField,
  landInfoField,
  landLocationField,
  landUseField,
  otherInformationField,
  plotLocationField,
  publicUtilityField,
  remarkLandField,
  roadField,
  roadSurfaceField,
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

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="col-span-12 bg-gray-50 rounded-lg p-3">
    <div className="grid grid-cols-12 gap-3">{children}</div>
  </div>
);

const LandDetailForm = () => {
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

        <SectionRow title="Road & Surface" icon="road">
          <Card>
            <FormFields fields={roadField} />
          </Card>
          <Card>
            <FormFields fields={roadSurfaceField} />
          </Card>
        </SectionRow>

        <SectionRow title="Land Access & Utilities" icon="bolt">
          <Card>
            <FormFields fields={publicUtilityField} />
          </Card>
          <Card>
            <FormFields fields={landUseField} />
          </Card>
          <Card>
            <FormFields fields={landEntranceField} />
          </Card>
          <Card>
            <FormFields fields={transpotationField} />
          </Card>
        </SectionRow>

        <SectionRow title="Limitation" icon="triangle-exclamation">
          <Card>
            <FormFields fields={expropriateField} />
          </Card>
          <Card>
            <FormFields fields={encroachedField} />
          </Card>
          <Card>
            <FormFields fields={electricityField} />
          </Card>
          <Card>
            <FormFields fields={landBoundaryField} />
          </Card>
        </SectionRow>

        <SectionRow title="Assessment" icon="chart-line">
          <Card>
            <FormFields fields={anticipationProsperityField} />
          </Card>
          <Card>
            <FormFields fields={evictionField} />
          </Card>
          <Card>
            <FormFields fields={allocationField} />
          </Card>
        </SectionRow>

        <SectionRow title="Size and Boundary" icon="ruler-combined">
          <BoundaryFields />
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
