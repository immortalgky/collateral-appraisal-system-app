import { Dropdown } from '@/shared/components';
import { RHFArrayTable } from './components/RHFArrayTable';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { columnGroups, columns, rows } from './components/data';
import { any } from 'zod';
import { WQSDto, type WQSRequestType } from './form';

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

  const methods = useForm<WQSRequestType>({
    defaultValues: {},
    resolver: zodResolver(WQSDto),
  });

  const { handleSubmit, getValues } = methods;

  const onSubmit = data => {
    console.log(getValues());
  };

  const onDraft = () => {
    console.log(getValues());
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
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
            <RHFArrayTable
              name="WQSMarketSurveys.WQSScores"
              columns={columns}
              groups={columnGroups}
              defaultRow={rows}
            />
          </div>
          <div></div>
          <div></div>
          <div>
            <button type="submit">Submit</button>
          </div>
          <div>
            <button type="button" onClick={() => onDraft()}>
              Draft
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
