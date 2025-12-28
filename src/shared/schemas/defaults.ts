import { type CreateRequestRequestType } from './v1';

export const createRequestRequestDefaults: CreateRequestRequestType = {
  sessionId: undefined,
  purpose: null,
  channel: null,
  requestor: {
    userId: '',
    username: '',
  },
  creator: {
    userId: '',
    username: '',
  },
  priority: 'NORMAL',
  isPma: false,
  detail: {
    hasAppraisalBook: false,
    loanDetail: {
      bankingSegment: null,
      loanApplicationNumber: null,
      facilityLimit: null,
      additionalFacilityLimit: null,
      previousFacilityLimit: null,
      totalSellingPrice: null,
    },
    prevAppraisalId: null,
    address: {
      houseNumber: null,
      projectName: null,
      moo: null,
      soi: null,
      road: null,
      subDistrict: null,
      district: null,
      province: null,
      postcode: null,
    },
    contact: {
      contactPersonName: null,
      contactPersonPhone: null,
      dealerCode: null,
    },
    appointment: {
      appointmentDateTime: null,
      appointmentLocation: null,
    },
    fee: {
      feePaymentType: null,
      feeNotes: null,
      absorbedAmount: null,
    },
  },
  customers: [],
  properties: [],
  titles: [],
  documents: [],
  comments: [],
};
