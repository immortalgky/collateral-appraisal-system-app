import type { GetRequestByIdResultType } from '../api';
import type { createRequestFormType } from '../schemas/form';

/**
 * Map Request API response to form values
 */
export const mapRequestResponseToForm = (
  response: GetRequestByIdResultType,
): createRequestFormType => {
  return {
    purpose: response.purpose ?? '',
    channel: response.channel ?? '',
    priority: response.priority ?? 'normal',
    isPma: response.isPma ?? false,
    creator: response.creator ?? { userId: '', username: '' },
    requestor: response.requestor ?? { userId: '', username: '' },
    detail: {
      hasAppraisalBook: response.detail?.hasAppraisalBook ?? false,
      loanDetail: {
        bankingSegment: response.detail?.loanDetail?.bankingSegment ?? '',
        loanApplicationNumber: response.detail?.loanDetail?.loanApplicationNumber ?? '',
        facilityLimit: response.detail?.loanDetail?.facilityLimit ?? 0,
        additionalFacilityLimit: response.detail?.loanDetail?.additionalFacilityLimit ?? null,
        previousFacilityLimit: response.detail?.loanDetail?.previousFacilityLimit ?? null,
        totalSellingPrice: response.detail?.loanDetail?.totalSellingPrice ?? 0,
      },
      prevAppraisalId: response.detail?.prevAppraisalId ?? null,
      prevAppraisalReportNo: response.detail?.prevAppraisalReportNo ?? null,
      prevAppraisalValue: response.detail?.prevAppraisalValue ?? null,
      prevAppraisalDate: response.detail?.prevAppraisalDate ?? null,
      address: {
        houseNumber: response.detail?.address?.houseNumber ?? '',
        projectName: response.detail?.address?.projectName ?? '',
        moo: response.detail?.address?.moo ?? '',
        soi: response.detail?.address?.soi ?? '',
        road: response.detail?.address?.road ?? '',
        subDistrict: response.detail?.address?.subDistrict ?? '',
        subDistrictName: null,
        district: response.detail?.address?.district ?? '',
        districtName: null,
        province: response.detail?.address?.province ?? '',
        provinceName: null,
        postcode: response.detail?.address?.postcode ?? '',
      },
      contact: {
        contactPersonName: response.detail?.contact?.contactPersonName ?? '',
        contactPersonPhone: response.detail?.contact?.contactPersonPhone ?? '',
        dealerCode: response.detail?.contact?.dealerCode ?? '',
      },
      appointment: {
        appointmentDateTime: response.detail?.appointment?.appointmentDateTime ?? '',
        appointmentLocation: response.detail?.appointment?.appointmentLocation ?? '',
      },
      fee: {
        feePaymentType: response.detail?.fee?.feePaymentType ?? '',
        feeNotes: response.detail?.fee?.feeNotes ?? '',
        absorbedAmount: response.detail?.fee?.absorbedAmount ?? 0,
      },
    },
    customers: (response.customers ?? []).map(c => ({
      name: c.name ?? '',
      contactNumber: c.contactNumber ?? '',
    })),
    properties: (response.properties ?? []).map(p => ({
      propertyType: p.propertyType ?? '',
      buildingType: p.buildingType ?? null,
      sellingPrice: p.sellingPrice ?? null,
    })),
    // Type assertions needed due to complex Zod type inference differences
    // between API response schema and form schema
    titles: (response.titles ?? []) as createRequestFormType['titles'],
    documents: (response.documents ?? []) as createRequestFormType['documents'],
    comments: [] as createRequestFormType['comments'],
  };
};
