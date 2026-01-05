import { type CreateRequestRequestType } from './v1';

export const createRequestRequestDefaults: CreateRequestRequestType = {
  sessionId: undefined,
  purpose: null,
  channel: null,
  // TODO: Replace with actual logged-in user when login is implemented
  requestor: {
    userId: 'P000000001',
    username: 'System User',
  },
  creator: {
    userId: 'P000000001',
    username: 'System User',
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
    prevAppraisalReportNo: null,
    prevAppraisalValue: null,
    prevAppraisalDate: null,
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
