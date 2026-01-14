import { Dropdown } from '@/shared/components';
import { RHFArrayTable } from './components/RHFArrayTable';

export const WQSSection = () => {
  /**
   * Initial
   * (1) get property information in the group
   * (2) get market survey information in application
   * When we should map between market survey, wqs template and property?
   * => default collateral type, template => generate => query factors in template
   * =>
   */

  /**
   * Comparative
   */

  /**
   * Calculation
   */

  return (
    <div className="flex flex-col w-full min-h-0 mt-2">
      <div className="flex items-center gap-4">
        <span>Pricing Analysis Template</span>
        <div>
          <Dropdown label="Collateral Type" />
        </div>
        <div>
          <Dropdown label="Template" />
        </div>
        <div>
          <button
            type="button"
            onClick={() => console.log('Generate!')}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            GENERATE
          </button>
        </div>
      </div>
      <div>
        <RHFArrayTable />
      </div>
      <div></div>
      <div></div>
    </div>
  );
};
