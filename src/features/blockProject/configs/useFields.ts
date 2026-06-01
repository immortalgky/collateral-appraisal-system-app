/**
 * useFields — translated FormField factory for blockProject.
 *
 * Returns the same field arrays as fields.ts, but with `label` and `placeholder`
 * resolved via t() so they respond to the active locale.
 *
 * Usage:
 *   const { projectInformationFields, condoTowerInfoFields, ... } = useBlockProjectFields();
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormField } from '@/shared/components/form';
import { CONDO_FIRE_INSURANCE_CONDITION_OPTIONS, LB_FIRE_INSURANCE_OPTIONS } from '../data/options';

const ObligationDetail = ['02', '03', '04', '05', '99'];

export function useBlockProjectFields() {
  const { t } = useTranslation('blockProject');

  const projectInformationFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.projectInfo.projectName'),
        name: 'projectName',
        required: true,
        wrapperClassName: 'col-span-8',
        maxLength: 200,
      },
      {
        type: 'textarea',
        label: t('fields.projectInfo.projectDescription'),
        name: 'projectDescription',
        wrapperClassName: 'col-span-12',
        maxLength: 500,
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.developer'),
        name: 'developer',
        wrapperClassName: 'col-span-6',
        maxLength: 200,
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.projectSaleLaunchDate'),
        name: 'projectSaleLaunchDate',
        placeholder: t('projectInfo.fields.projectSaleLaunchDatePlaceholder'),
        maxLength: 10,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.projectInfo.rai'),
        name: 'landAreaRai',
        decimalPlaces: 0,
        maxIntegerDigits: 5,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.projectInfo.ngan'),
        name: 'landAreaNgan',
        decimalPlaces: 0,
        maxIntegerDigits: 1,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.projectInfo.squareWa'),
        name: 'landAreaSquareWa',
        decimalPlaces: 2,
        maxIntegerDigits: 3,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.projectInfo.unitForSale'),
        name: 'unitForSaleCount',
        decimalPlaces: 0,
        maxIntegerDigits: 5,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.projectInfo.numberOfPhase'),
        name: 'numberOfPhase',
        decimalPlaces: 0,
        maxIntegerDigits: 2,
        wrapperClassName: 'col-span-4',
      },
    ],
    [t],
  );

  const projectLocationFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.projectInfo.houseNumber'),
        name: 'houseNumber',
        wrapperClassName: 'col-span-4',
        maxLength: 10,
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.road'),
        name: 'road',
        wrapperClassName: 'col-span-4',
        maxLength: 100,
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.soi'),
        name: 'soi',
        wrapperClassName: 'col-span-4',
        maxLength: 100,
      },
      {
        type: 'location-selector',
        label: t('fields.projectInfo.subDistrict'),
        name: 'subDistrict',
        districtField: 'district',
        provinceField: 'province',
        postcodeField: 'postcode',
        subDistrictNameField: 'subDistrictName',
        districtNameField: 'districtName',
        provinceNameField: 'provinceName',
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.district'),
        name: 'districtName',
        disabled: true,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.province'),
        name: 'provinceName',
        disabled: true,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.postcode'),
        name: 'postcode',
        disabled: true,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.projectInfo.latitude'),
        name: 'latitude',
        decimalPlaces: 6,
        maxIntegerDigits: 3,
        allowNegative: true,
        allowZero: true,
        min: -90,
        max: 90,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.projectInfo.longitude'),
        name: 'longitude',
        decimalPlaces: 6,
        maxIntegerDigits: 3,
        allowNegative: true,
        allowZero: true,
        min: -180,
        max: 180,
        wrapperClassName: 'col-span-4',
      },
    ],
    [t],
  );

  const projectDetailFields = useMemo<FormField[]>(
    () => [
      {
        type: 'checkbox-group',
        label: t('fields.projectInfo.utilities'),
        name: 'utilities',
        group: 'PublicUtility',
        variant: 'tag',
        wrap: true,
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.utilitiesOther'),
        name: 'utilitiesOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'utilities', is: '99', operator: 'contains' },
        requiredWhen: { field: 'utilities', is: '99', operator: 'contains' },
        maxLength: 100,
      },
      {
        type: 'checkbox-group',
        label: t('fields.projectInfo.facilities'),
        name: 'facilities',
        group: 'Facilities',
        variant: 'tag',
        wrap: true,
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.facilitiesOther'),
        name: 'facilitiesOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'facilities', is: '99', operator: 'contains' },
        requiredWhen: { field: 'facilities', is: '99', operator: 'contains' },
        maxLength: 100,
      },
      {
        type: 'textarea',
        label: t('fields.projectInfo.remark'),
        name: 'remark',
        maxLength: 500,
        wrapperClassName: 'col-span-12',
      },
    ],
    [t],
  );

  const condoProjectInfoFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.projectInfo.builtOnTitleDeedNumber'),
        name: 'builtOnTitleDeedNumber',
        wrapperClassName: 'col-span-6',
        maxLength: 200,
      },
      {
        type: 'parameter-search',
        label: t('fields.projectInfo.landOffice'),
        name: 'landOffice',
        group: 'LandOffice',
        required: true,
        wrapperClassName: 'col-span-6',
      },
    ],
    [t],
  );

  const condoFacilityFields = useMemo<FormField[]>(
    () => [
      {
        type: 'checkbox-group',
        label: t('fields.projectInfo.facilities'),
        name: 'facilities',
        group: 'Facilities',
        variant: 'tag',
        wrap: true,
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.facilitiesOther'),
        name: 'facilitiesOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'facilities', is: '99', operator: 'contains' },
        requiredWhen: { field: 'facilities', is: '99', operator: 'contains' },
        maxLength: 100,
      },
    ],
    [t],
  );

  const lbProjectInfoFields = useMemo<FormField[]>(
    () => [
      {
        type: 'date-input',
        label: t('fields.projectInfo.licenseExpirationDate'),
        name: 'licenseExpirationDate',
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'parameter-search',
        label: t('fields.projectInfo.landOffice'),
        name: 'landOffice',
        group: 'LandOffice',
        required: true,
        wrapperClassName: 'col-span-4',
      },
    ],
    [t],
  );

  const lbFacilityFields = useMemo<FormField[]>(
    () => [
      {
        type: 'checkbox-group',
        label: t('fields.projectInfo.facilities'),
        name: 'facilities',
        group: 'Facilities',
        variant: 'tag',
        wrap: true,
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.projectInfo.facilitiesOther'),
        name: 'facilitiesOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'facilities', is: '99', operator: 'contains' },
        requiredWhen: { field: 'facilities', is: '99', operator: 'contains' },
        maxLength: 100,
      },
    ],
    [t],
  );

  const modelFloorMaterialFields = useMemo<FormField[]>(
    () => [
      {
        type: 'radio-group',
        label: t('fields.model.groundFloorMaterials'),
        name: 'groundFloorMaterialType',
        group: 'GroundFlooringMaterials',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.model.otherGroundFloor'),
        name: 'groundFloorMaterialTypeOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'groundFloorMaterialType', is: '99' },
        requiredWhen: { field: 'groundFloorMaterialType', is: '99' },
        maxLength: 100,
      },
      {
        type: 'radio-group',
        label: t('fields.model.upperFloorMaterials'),
        name: 'upperFloorMaterialType',
        group: 'UpperFlooringMaterials',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.model.otherUpperFloor'),
        name: 'upperFloorMaterialTypeOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'upperFloorMaterialType', is: '99' },
        requiredWhen: { field: 'upperFloorMaterialType', is: '99' },
        maxLength: 100,
      },
      {
        type: 'radio-group',
        label: t('fields.model.bathroomFloorMaterials'),
        name: 'bathroomFloorMaterialType',
        group: 'BathroomFlooringMaterials',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.model.otherBathroomFloor'),
        name: 'bathroomFloorMaterialTypeOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'bathroomFloorMaterialType', is: '99' },
        requiredWhen: { field: 'bathroomFloorMaterialType', is: '99' },
        maxLength: 100,
      },
    ],
    [t],
  );

  const condoModelInfoFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.model.modelName'),
        name: 'modelName',
        required: true,
        wrapperClassName: 'col-span-6',
        maxLength: 200,
      },
      {
        type: 'textarea',
        label: t('fields.model.modelDescription'),
        name: 'modelDescription',
        wrapperClassName: 'col-span-12',
        maxLength: 500,
      },
      {
        type: 'boolean-toggle',
        label: t('fields.model.hasMezzanine'),
        name: 'hasMezzanine',
        options: [t('options.yesNo.no'), t('options.yesNo.yes')],
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'number-input',
        label: t('fields.model.startingPriceMin'),
        name: 'startingPriceMin',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'number-input',
        label: t('fields.model.startingPriceMax'),
        name: 'startingPriceMax',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'number-input',
        label: t('fields.model.usableAreaMin'),
        name: 'usableAreaMin',
        decimalPlaces: 2,
        maxIntegerDigits: 6,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.usableAreaMax'),
        name: 'usableAreaMax',
        decimalPlaces: 2,
        maxIntegerDigits: 6,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.standardUsableArea'),
        name: 'standardUsableArea',
        decimalPlaces: 2,
        maxIntegerDigits: 5,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'dropdown',
        label: t('fields.model.fireInsuranceCondition'),
        name: 'fireInsuranceCondition',
        options: CONDO_FIRE_INSURANCE_CONDITION_OPTIONS,
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'radio-group',
        label: t('fields.model.roomLayout'),
        name: 'roomLayoutType',
        group: 'RoomLayout',
        variant: 'default',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.model.otherRoomLayout'),
        name: 'roomLayoutTypeOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'roomLayoutType', is: '99' },
        requiredWhen: { field: 'roomLayoutType', is: '99' },
        maxLength: 100,
      },
      {
        type: 'textarea',
        label: t('fields.model.remark'),
        name: 'remark',
        maxLength: 500,
        wrapperClassName: 'col-span-12',
      },
    ],
    [t],
  );

  const condoTowerInfoFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.tower.towerName'),
        name: 'towerName',
        wrapperClassName: 'col-span-6',
        maxLength: 200,
      },
      {
        type: 'text-input',
        label: t('fields.tower.condoRegistrationNumber'),
        name: 'condoRegistrationNumber',
        required: true,
        wrapperClassName: 'col-span-6',
        maxLength: 100,
      },
      {
        type: 'number-input',
        label: t('fields.tower.numberOfUnits'),
        name: 'numberOfUnits',
        required: true,
        decimalPlaces: 0,
        allowZero: true,
        maxIntegerDigits: 3,
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'number-input',
        label: t('fields.tower.numberOfFloors'),
        name: 'numberOfFloors',
        required: true,
        decimalPlaces: 0,
        maxIntegerDigits: 3,
        allowZero: true,
        wrapperClassName: 'col-span-6',
      },
    ],
    [t],
  );

  const condoTowerConditionFields = useMemo<FormField[]>(
    () => [
      {
        type: 'radio-group',
        label: t('fields.tower.condition'),
        name: 'conditionType',
        group: 'BuildingCondition',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'radio-group',
        label: t('fields.tower.isObligation'),
        name: 'hasObligation',
        orientation: 'horizontal',
        variant: 'button',
        group: 'Obligation',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.tower.obligation'),
        name: 'obligationDetails',
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
        requiredWhen: { field: 'hasObligation', is: ObligationDetail, operator: 'in' },
        maxLength: 200,
      },
      {
        type: 'radio-group',
        label: t('fields.tower.documentValidation'),
        name: 'documentValidationType',
        group: 'DocumentValidation',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
    ],
    [t],
  );

  const condoTowerLocationFields = useMemo<FormField[]>(
    () => [
      {
        type: 'boolean-toggle',
        label: t('fields.tower.locationCorrect'),
        name: 'isLocationCorrect',
        options: [t('options.correctIncorrect.incorrect'), t('options.correctIncorrect.correct')],
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'number-input',
        label: t('fields.tower.distance'),
        name: 'distance',
        decimalPlaces: 2,
        maxIntegerDigits: 5,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.tower.roadWidth'),
        name: 'roadWidth',
        decimalPlaces: 0,
        maxIntegerDigits: 3,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.tower.rightOfWay'),
        name: 'rightOfWay',
        decimalPlaces: 0,
        maxIntegerDigits: 3,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'radio-group',
        label: t('fields.tower.roadSurface'),
        name: 'roadSurfaceType',
        group: 'Condo_RoadSurface',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.tower.otherRoadSurface'),
        name: 'roadSurfaceTypeOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'roadSurfaceType', is: '99' },
        requiredWhen: { field: 'roadSurfaceType', is: '99' },
      },
    ],
    [t],
  );

  const condoTowerStructureFields = useMemo<FormField[]>(
    () => [
      {
        type: 'radio-group',
        label: t('fields.tower.decoration'),
        name: 'decorationType',
        group: 'Decoration',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'text-input',
        label: t('fields.tower.otherDecoration'),
        name: 'decorationTypeOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'decorationType', is: '99' },
        requiredWhen: { field: 'decorationType', is: '99' },
      },
      {
        type: 'number-input',
        label: t('fields.tower.buildingAge'),
        name: 'buildingAge',
        maxIntegerDigits: 3,
        decimalPlaces: 1,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'radio-group',
        label: t('fields.tower.buildingForm'),
        name: 'buildingFormType',
        group: 'BuildingForm',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
      {
        type: 'radio-group',
        label: t('fields.tower.constructionMaterials'),
        name: 'constructionMaterialType',
        group: 'ConstructionMaterials',
        variant: 'button',
        orientation: 'horizontal',
        wrapperClassName: 'col-span-12',
      },
    ],
    [t],
  );

  const condoTowerRoofFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.tower.otherRoofType'),
        name: 'roofTypeOther',
        placeholder: t('projectInfo.fields.specifyPlaceholder'),
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'roofType', is: '99', operator: 'contains' },
      },
    ],
    [t],
  );

  const condoTowerLegalFields = useMemo<FormField[]>(
    () => [
      {
        type: 'checkbox',
        label: t('fields.tower.isExpropriated'),
        name: 'isExpropriated',
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'checkbox',
        label: t('fields.tower.inLineExpropriated'),
        name: 'isInExpropriationLine',
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'text-input',
        label: t('fields.tower.royalDecreeReference'),
        name: 'royalDecree',
        wrapperClassName: 'col-span-12',
        showWhen: {
          conditions: [
            { field: 'isExpropriated', is: true },
            { field: 'isInExpropriationLine', is: true },
          ],
          match: 'any',
        },
        maxLength: 200,
      },
      {
        type: 'text-input',
        label: t('fields.tower.expropriationRemark'),
        name: 'expropriationRemark',
        wrapperClassName: 'col-span-12',
        maxLength: 200,
      },
      {
        type: 'boolean-toggle',
        label: t('fields.tower.inForestBoundary'),
        name: 'isForestBoundary',
        options: [t('options.yesNo.no'), t('options.yesNo.yes')],
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'text-input',
        label: t('fields.tower.forestBoundaryRemark'),
        name: 'forestBoundaryRemark',
        wrapperClassName: 'col-span-12',
        showWhen: { field: 'isForestBoundary', is: true },
        maxLength: 200,
      },
      {
        type: 'textarea',
        label: t('fields.tower.remark'),
        name: 'remark',
        maxLength: 500,
        wrapperClassName: 'col-span-12',
      },
    ],
    [t],
  );

  const pricingLocationSharedFields = useMemo<FormField[]>(
    () => [
      {
        type: 'number-input',
        label: t('fields.pricing.cornerAdjustment'),
        name: 'cornerAdjustment',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.pricing.edgeAdjustment'),
        name: 'edgeAdjustment',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.pricing.otherAdjustment'),
        name: 'otherAdjustment',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
    ],
    [t],
  );

  const pricingForceSaleFields = useMemo<FormField[]>(
    () => [
      {
        type: 'number-input',
        label: t('fields.pricing.forceSalePercentage'),
        name: 'forceSalePercentage',
        decimalPlaces: 2,
        min: 0,
        max: 100,
        wrapperClassName: 'col-span-6',
      },
    ],
    [t],
  );

  const condoPricingLocationFields = useMemo<FormField[]>(
    () => [
      {
        type: 'number-input',
        label: t('fields.pricing.poolViewAdjustment'),
        name: 'poolViewAdjustment',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.pricing.southAdjustment'),
        name: 'southAdjustment',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
    ],
    [t],
  );

  const condoPricingFloorFields = useMemo<FormField[]>(
    () => [
      {
        type: 'number-input',
        label: t('fields.pricing.floorIncrementEveryXFloor'),
        name: 'floorIncrementEveryXFloor',
        decimalPlaces: 0,
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'number-input',
        label: t('fields.pricing.floorIncrementAmount'),
        name: 'floorIncrementAmount',
        decimalPlaces: 2,
        wrapperClassName: 'col-span-6',
      },
    ],
    [t],
  );

  const lbModelInfoFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.model.modelName'),
        name: 'modelName',
        required: true,
        wrapperClassName: 'col-span-12',
        maxLength: 100,
      },
      {
        type: 'textarea',
        label: t('fields.model.modelDescription'),
        name: 'modelDescription',
        wrapperClassName: 'col-span-12',
        maxLength: 50,
      },
      {
        type: 'number-input',
        label: t('fields.model.numberOfHouses'),
        name: 'numberOfHouse',
        decimalPlaces: 0,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.startingPriceMin'),
        name: 'startingPriceMin',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.startingPriceMax'),
        name: 'startingPriceMax',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.usableAreaMin'),
        name: 'usableAreaMin',
        decimalPlaces: 2,
        maxIntegerDigits: 6,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.usableAreaMax'),
        name: 'usableAreaMax',
        decimalPlaces: 2,
        maxIntegerDigits: 6,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.standardUsableArea'),
        name: 'standardUsableArea',
        maxIntegerDigits: 6,
        decimalPlaces: 2,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.landAreaMin'),
        name: 'landAreaMin',
        decimalPlaces: 2,
        maxIntegerDigits: 8,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.landAreaMax'),
        name: 'landAreaMax',
        decimalPlaces: 2,
        maxIntegerDigits: 8,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.model.standardLandArea'),
        name: 'standardLandArea',
        decimalPlaces: 2,
        maxIntegerDigits: 8,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'dropdown',
        label: t('fields.model.fireInsuranceCondition'),
        name: 'fireInsuranceCondition',
        options: LB_FIRE_INSURANCE_OPTIONS,
        wrapperClassName: 'col-span-6',
      },
      {
        type: 'textarea',
        label: t('fields.model.remark'),
        name: 'remark',
        maxLength: 500,
        wrapperClassName: 'col-span-12',
      },
    ],
    [t],
  );

  const lbPricingLocationFields = useMemo<FormField[]>(
    () => [
      {
        type: 'number-input',
        label: t('fields.pricing.nearGardenAdjustment'),
        name: 'nearGardenAdjustment',
        decimalPlaces: 2,
        maxIntegerDigits: 15,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'number-input',
        label: t('fields.pricing.landIncreaseDecreaseRate'),
        name: 'landIncreaseDecreaseRate',
        decimalPlaces: 2,
        wrapperClassName: 'col-span-4',
      },
    ],
    [t],
  );

  const pricingLandAssumptionFields = useMemo<FormField[]>(
    () => [
      {
        type: 'number-input',
        label: t('fields.pricing.landIncreaseDecreaseRate'),
        name: 'landIncreaseDecreaseRate',
        decimalPlaces: 2,
        wrapperClassName: 'col-span-6',
      },
    ],
    [t],
  );

  const projectLandInfoFields = useMemo<FormField[]>(
    () => [
      {
        type: 'text-input',
        label: t('fields.land.propertyName'),
        name: 'propertyName',
        wrapperClassName: 'col-span-12',
        maxLength: 150,
      },
      {
        type: 'location-selector',
        label: t('fields.land.subDistrict'),
        name: 'subDistrict',
        districtField: 'district',
        districtNameField: 'districtName',
        provinceField: 'province',
        provinceNameField: 'provinceName',
        postcodeField: 'postcode',
        subDistrictNameField: 'subDistrictName',
        addressSource: 'title',
        wrapperClassName: 'col-span-4',
        required: true,
      },
      {
        type: 'text-input',
        label: t('fields.land.district'),
        name: 'districtName',
        disabled: true,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'text-input',
        label: t('fields.land.province'),
        name: 'provinceName',
        disabled: true,
        wrapperClassName: 'col-span-4',
      },
      {
        type: 'textarea',
        label: t('fields.land.landDescription'),
        name: 'landDescription',
        wrapperClassName: 'col-span-12',
        required: true,
        maxLength: 100,
        showCharCount: true,
      },
    ],
    [t],
  );

  return {
    projectInformationFields,
    projectLocationFields,
    projectDetailFields,
    condoProjectInfoFields,
    condoFacilityFields,
    lbProjectInfoFields,
    lbFacilityFields,
    modelFloorMaterialFields,
    condoModelInfoFields,
    condoTowerInfoFields,
    condoTowerConditionFields,
    condoTowerLocationFields,
    condoTowerStructureFields,
    condoTowerRoofFields,
    condoTowerLegalFields,
    pricingLocationSharedFields,
    pricingForceSaleFields,
    condoPricingLocationFields,
    condoPricingFloorFields,
    lbModelInfoFields,
    lbPricingLocationFields,
    pricingLandAssumptionFields,
    projectLandInfoFields,
  };
}
