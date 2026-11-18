import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import { mapSurfacesToApi } from '@/features/appraisal/utils/mappers';

import { isCondo } from '../types';
import type { Project, ProjectModel, ProjectTower, ProjectType } from '../types';
import type { CondoModelFormType, LbModelFormType, ProjectTowerFormType } from '../schemas/form';

/**
 * Record-to-form mappers of the block pages, shared with the data-correction screen, which edits the same
 * records with the same forms. Each is what its page seeds the form with.
 */

export const projectToInfoForm = (project: Project, projectType: ProjectType) => {
  // The names are display-only and normally written by the location selector, which a read page
  // does not mount. Any source, as the field's resolveFromAnySource does.
  const address = project.subDistrict
    ? findAddressBySubDistrictCode(project.subDistrict)
    : undefined;
  const shared = {
    projectName: project.projectName ?? '',
    projectDescription: project.projectDescription ?? null,
    developer: project.developer ?? null,
    projectSaleLaunchDate: project.projectSaleLaunchDate ?? null,
    landAreaRai: project.landAreaRai ?? null,
    landAreaNgan: project.landAreaNgan ?? null,
    landAreaSquareWa: project.landAreaSquareWa ?? null,
    unitForSaleCount: project.unitForSaleCount ?? null,
    landOffice: project.landOffice ?? '',
    projectType: '', // placeholder; stamped from the stored type at submit
    numberOfPhase: project.numberOfPhase ?? null,
    isUnderConstruction: project.isUnderConstruction ?? null,
    constructionProgressPercent: project.constructionProgressPercent ?? null,
    houseNumber: project.houseNumber ?? null,
    road: project.road ?? null,
    soi: project.soi ?? null,
    subDistrict: project.subDistrict ?? null,
    district: project.district ?? null,
    province: project.province ?? null,
    postcode: project.postcode ?? null,
    subDistrictName: address?.subDistrictName ?? null,
    districtName: address?.districtName ?? null,
    provinceName: address?.provinceName ?? null,
    latitude: project.latitude ?? null,
    longitude: project.longitude ?? null,
    utilities: project.utilities ?? [],
    utilitiesOther: project.utilitiesOther ?? null,
    facilities: project.facilities ?? [],
    facilitiesOther: project.facilitiesOther ?? null,
    remark: project.remark ?? null,
  };
  return isCondo(projectType)
    ? { ...shared, builtOnTitleDeedNumber: project.builtOnTitleDeedNumber ?? null }
    : { ...shared, licenseExpirationDate: project.licenseExpirationDate ?? null };
};

/** A saved tower */
export const towerToForm = (tower: ProjectTower): ProjectTowerFormType => ({
  towerName: tower.towerName ?? null,
  numberOfUnits: tower.numberOfUnits ?? 0,
  numberOfFloors: tower.numberOfFloors ?? 0,
  condoRegistrationNumber: tower.condoRegistrationNumber ?? '',
  conditionType: tower.conditionType ?? null,
  hasObligation: tower.hasObligation ?? '',
  obligationDetails: tower.obligationDetails ?? null,
  documentValidationType: tower.documentValidationType ?? null,
  isLocationCorrect: tower.isLocationCorrect ?? true,
  distance: tower.distance ?? null,
  roadWidth: tower.roadWidth ?? null,
  rightOfWay: tower.rightOfWay ?? null,
  roadSurfaceType: tower.roadSurfaceType ?? null,
  roadSurfaceTypeOther: tower.roadSurfaceTypeOther ?? null,
  decorationType: tower.decorationType ?? null,
  decorationTypeOther: tower.decorationTypeOther ?? null,
  buildingAge: tower.buildingAge ?? null,
  buildingFormType: tower.buildingFormType ?? null,
  constructionMaterialType: tower.constructionMaterialType ?? null,
  roofType: tower.roofType ?? [],
  roofTypeOther: tower.roofTypeOther ?? null,
  isExpropriated: tower.isExpropriated ?? false,
  expropriationRemark: tower.expropriationRemark ?? null,
  isInExpropriationLine: tower.isInExpropriationLine ?? false,
  royalDecree: tower.royalDecree ?? null,
  isForestBoundary: tower.isForestBoundary ?? false,
  forestBoundaryRemark: tower.forestBoundaryRemark ?? null,
  remark: tower.remark ?? null,
});

/** A saved model */
export const modelToForm = (model: ProjectModel, projectType: ProjectType) => {
  if (isCondo(projectType)) {
    return {
      modelName: model.modelName ?? '',
      modelDescription: model.modelDescription ?? null,
      projectTowerId: model.projectTowerId ?? null,
      startingPriceMin: model.startingPriceMin ?? null,
      startingPriceMax: model.startingPriceMax ?? null,
      hasMezzanine: model.hasMezzanine ?? false,
      usableAreaMin: model.usableAreaMin ?? null,
      usableAreaMax: model.usableAreaMax ?? null,
      standardUsableArea: model.standardUsableArea ?? null,
      fireInsuranceCode: model.fireInsuranceCode ?? null,
      roomLayoutType: model.roomLayoutType ?? null,
      roomLayoutTypeOther: model.roomLayoutTypeOther ?? null,
      groundFloorMaterialType: model.groundFloorMaterialType ?? null,
      groundFloorMaterialTypeOther: model.groundFloorMaterialTypeOther ?? null,
      upperFloorMaterialType: model.upperFloorMaterialType ?? null,
      upperFloorMaterialTypeOther: model.upperFloorMaterialTypeOther ?? null,
      bathroomFloorMaterialType: model.bathroomFloorMaterialType ?? null,
      bathroomFloorMaterialTypeOther: model.bathroomFloorMaterialTypeOther ?? null,
      remark: model.remark ?? null,
      areaDetails: model.areaDetails ?? [],
    } satisfies CondoModelFormType;
  }
  return {
    modelName: model.modelName ?? '',
    modelDescription: model.modelDescription ?? null,
    numberOfHouse: model.numberOfHouse ?? null,
    startingPriceMin: model.startingPriceMin ?? null,
    startingPriceMax: model.startingPriceMax ?? null,
    usableAreaMin: model.usableAreaMin ?? null,
    usableAreaMax: model.usableAreaMax ?? null,
    standardUsableArea: model.standardUsableArea ?? null,
    landAreaMin: model.landAreaMin ?? null,
    landAreaMax: model.landAreaMax ?? null,
    standardLandArea: model.standardLandArea ?? null,
    fireInsuranceCode: model.fireInsuranceCode ?? null,
    remark: model.remark ?? null,
    buildingType: model.buildingType ?? null,
    buildingTypeOther: model.buildingTypeOther ?? null,
    numberOfFloors: model.numberOfFloors ?? null,
    decorationType: model.decorationType ?? null,
    decorationTypeOther: model.decorationTypeOther ?? null,
    isEncroachingOthers: model.isEncroachingOthers ?? false,
    encroachingOthersRemark: model.encroachingOthersRemark ?? null,
    encroachingOthersArea: model.encroachingOthersArea ?? null,
    buildingMaterialType: model.buildingMaterialType ?? null,
    buildingStyleType: model.buildingStyleType ?? null,
    isResidential: model.isResidential ?? false,
    buildingAge: model.buildingAge ?? null,
    constructionYear: model.constructionYear ?? null,
    residentialRemark: model.residentialRemark ?? null,
    constructionStyleType: model.constructionStyleType ?? null,
    constructionStyleRemark: model.constructionStyleRemark ?? null,
    constructionType: model.constructionType ?? null,
    constructionTypeOther: model.constructionTypeOther ?? null,
    utilizationType: model.utilizationType ?? null,
    utilizationTypeOther: model.utilizationTypeOther ?? null,
    structureType: model.structureType ?? [],
    structureTypeOther: model.structureTypeOther ?? null,
    roofFrameType: model.roofFrameType ?? [],
    roofFrameTypeOther: model.roofFrameTypeOther ?? null,
    roofType: model.roofType ?? [],
    roofTypeOther: model.roofTypeOther ?? null,
    ceilingType: model.ceilingType ?? [],
    ceilingTypeOther: model.ceilingTypeOther ?? null,
    interiorWallType: model.interiorWallType ?? [],
    interiorWallTypeOther: model.interiorWallTypeOther ?? null,
    exteriorWallType: model.exteriorWallType ?? [],
    exteriorWallTypeOther: model.exteriorWallTypeOther ?? null,
    fenceType: model.fenceType ?? [],
    fenceTypeOther: model.fenceTypeOther ?? null,
    surfaces: [...(model.surfaces ?? [])].sort(
      (a, b) => (a.fromFloorNumber ?? 0) - (b.fromFloorNumber ?? 0),
    ),
    depreciationDetails: model.depreciationDetails ?? [],
  } satisfies Partial<LbModelFormType>;
};

/** The body `PUT …/models/{id}` takes, from the model form's values: the surfaces in the API's shape. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const modelToPayload = (values: any) =>
  values.surfaces ? { ...values, surfaces: mapSurfacesToApi(values.surfaces) } : values;
