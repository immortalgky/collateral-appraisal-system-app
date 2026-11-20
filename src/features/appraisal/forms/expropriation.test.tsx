import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render } from '@/test/test-utils';
import { createCondoFormDefault, createLandFormDefault } from '../schemas/form';
import { allCondoFields, allLandFields, lawTabOriginalFields } from '../configs/fields';
import {
  mapCondoFormDataToApiPayload,
  mapCondoPropertyResponseToForm,
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
  mapLandPropertyResponseToForm,
} from '../utils/mappers';
import { landToPayload } from '../utils/propertyFormRecipes';
import { PropertyNameInHeaderContext } from '../components/propertyNameInHeader';
import CondoDetailForm from './CondoDetailForm';
import LandDetailForm from './LandDetailForm';

/**
 * "Located in an expropriation map sheet" (isExpropriated, and its remark) is no longer asked. The
 * record still holds it, so it must neither show nor be lost on save; only the expropriation line
 * is asked, and the royal decree belongs to it alone.
 */
let methods: ReturnType<typeof useForm<Record<string, unknown>>>;
const Harness = ({
  kind,
  defaults,
}: {
  kind: 'land' | 'condo';
  defaults: Record<string, unknown>;
}) => {
  methods = useForm<Record<string, unknown>>({
    defaultValues: {
      ...(kind === 'land' ? createLandFormDefault : createCondoFormDefault),
      ...defaults,
    },
  });
  return (
    <PropertyNameInHeaderContext.Provider value>
      <FormProvider {...methods}>
        {kind === 'land' ? <LandDetailForm /> : <CondoDetailForm />}
      </FormProvider>
    </PropertyNameInHeaderContext.Provider>
  );
};
const field = (n: string) => document.querySelector(`[data-field="${n}"]`);
const stored = { isExpropriated: true, expropriationRemark: 'อยู่ในระวางเวนคืน ปี 2560' };

describe.each(['land', 'condo'] as const)('expropriation on the %s form', kind => {
  it('does not ask the map-sheet toggle or its remark, but keeps what is stored', () => {
    render(<Harness kind={kind} defaults={{ ...stored, isInExpropriationLine: false }} />);
    expect(field('isExpropriated')).toBeNull();
    expect(field('expropriationRemark')).toBeNull();
    expect(methods.getValues('isExpropriated')).toBe(true);
    expect(methods.getValues('expropriationRemark')).toBe(stored.expropriationRemark);
  });

  it('does not draw the decree or the line remark, whatever the line says', () => {
    for (const on of [false, true]) {
      const { unmount } = render(
        <Harness kind={kind} defaults={{ ...stored, isInExpropriationLine: on }} />,
      );
      expect(field('royalDecree')).toBeNull();
      expect(field('expropriationLineRemark')).toBeNull();
      unmount();
    }
  });
});

describe('the stored values go back out unchanged', () => {
  it('on land, land and building and condo', () => {
    const response = { ...stored, isInExpropriationLine: false } as never;
    expect(landToPayload(mapLandPropertyResponseToForm(response) as never)).toMatchObject(stored);
    expect(
      mapLandAndBuildingFormDataToApiPayload(
        mapLandAndBuildingPropertyResponseToForm(response) as never,
      ),
    ).toMatchObject(stored);
    expect(
      mapCondoFormDataToApiPayload(mapCondoPropertyResponseToForm(response) as never),
    ).toMatchObject(stored);
  });
});

describe('the details moved to the Law & Regulation tab are carried, not asked', () => {
  const law = {
    isInExpropriationLine: true,
    royalDecree: 'พ.ร.ฎ. 2565',
    expropriationLineRemark: 'แนวถนนตัดใหม่',
    isForestBoundary: true,
    forestBoundaryRemark: 'ทับซ้อนเขตป่าสงวน',
    isLandlocked: true,
    landlockedRemark: 'ไม่มีทางเข้าออก',
    hasElectricity: true,
    electricityDistance: 350,
  };

  it('are not drawn on the land form, nor required when their chip is on', () => {
    render(
      <Harness kind="land" defaults={{ ...law, royalDecree: '', expropriationLineRemark: '' }} />,
    );
    for (const f of [
      'royalDecree',
      'expropriationLineRemark',
      'forestBoundaryRemark',
      'isLandlocked',
      'landlockedRemark',
      'hasElectricity',
      'electricityDistance',
    ])
      expect(field(f)).toBeNull();
    const rules = (fields: { name: string; requiredWhen?: unknown; showWhen?: unknown }[]) =>
      fields
        .filter(f =>
          [
            'expropriationLineRemark',
            'forestBoundaryRemark',
            'landlockedRemark',
            'electricityDistance',
          ].includes(f.name),
        )
        .map(f => [f.name, f.requiredWhen, f.showWhen]);
    expect(rules(allLandFields).every(([, req, show]) => req == null && show == null)).toBe(true);
    expect(rules(allCondoFields).every(([, req, show]) => req == null && show == null)).toBe(true);
  });

  it('go back out unchanged on land, land and building and condo', () => {
    expect(landToPayload(mapLandPropertyResponseToForm(law as never) as never)).toMatchObject(law);
    expect(
      mapLandAndBuildingFormDataToApiPayload(
        mapLandAndBuildingPropertyResponseToForm(law as never) as never,
      ),
    ).toMatchObject(law);
    const condoLaw = { ...law } as Partial<typeof law>;
    delete condoLaw.isLandlocked;
    delete condoLaw.landlockedRemark;
    delete condoLaw.hasElectricity;
    delete condoLaw.electricityDistance;
    expect(
      mapCondoFormDataToApiPayload(mapCondoPropertyResponseToForm(condoLaw as never) as never),
    ).toMatchObject(condoLaw);
  });

  it('are still asked, with their rules, on the block project land form', () => {
    const rule = lawTabOriginalFields.get('expropriationLineRemark')!;
    expect(rule.requiredWhen).toBeDefined();
    expect(lawTabOriginalFields.get('landlockedRemark')!.requiredWhen).toBeDefined();
  });
});
