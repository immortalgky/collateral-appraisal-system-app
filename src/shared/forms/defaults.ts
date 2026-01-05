import type { CreateMarketSurveyRequestType } from './marketSurvey';

export const requestTitleDtoDefaults = {
  // Discriminator field - now at top level
  collateralType: '' as string,
  // Common fields - moved from collateral object
  titleNo: '',
  collateralStatus: '',
  owner: '',
  noOfBuilding: '' as unknown as number,
  titleDetail: '',
  titleDocuments: [],
  area: {
    rai: '' as unknown as number,
    ngan: '' as unknown as number,
    wa: '' as unknown as number,
    usageArea: '' as unknown as number,
  },
  condo: {
    condoName: '',
    condoBuildingNo: '',
    condoRoomNo: '',
    condoFloorNo: '',
  },
  titleAddress: {
    houseNo: '',
    roomNo: '',
    floorNo: '',
    buildingNo: '',
    moo: '',
    soi: '',
    road: '',
    subDistrict: '',
    district: '',
    province: '',
    postcode: '',
  },
  dopaAddress: {
    dopaHouseNo: '',
    dopaRoomNo: '',
    dopaFloorNo: '',
    dopaBuildingNo: '',
    dopaMoo: '',
    dopaSoi: '',
    dopaRoad: '',
    dopaSubDistrict: '',
    dopaDistrict: '',
    dopaProvince: '',
    dopaPostcode: '',
  },
  building: {
    buildingType: '',
  },
  vehicle: {
    vehicleType: '',
    vehicleRegistrationNo: '',
    vehAppointmentLocation: '',
  },
  machine: {
    machineStatus: '',
    machineType: '',
    machineRegistrationStatus: '',
    machineRegistrationNo: '',
    machineInvoiceNo: '',
    noOfMachine: '' as unknown as number,
  },
};

export const createMarketSurveyRequestDefault: CreateMarketSurveyRequestType = {
  surveyName: '',
  surveyTemplateCode: 'LD1',
  marketSurveyData: [],
};
