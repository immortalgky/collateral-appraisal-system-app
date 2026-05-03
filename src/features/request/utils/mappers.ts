import type { GetRequestByIdResultType } from '../api';
import type { createRequestFormType } from '../schemas/form';
import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import type { AppraisalCopyTemplate } from '@/features/appraisal/api/copyTemplate';

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
      address: (() => {
        const detailAddrLookup = response.detail?.address?.subDistrict
          ? findAddressBySubDistrictCode(response.detail.address.subDistrict)
          : undefined;
        return {
          houseNumber: response.detail?.address?.houseNumber ?? '',
          projectName: response.detail?.address?.projectName ?? '',
          moo: response.detail?.address?.moo ?? '',
          soi: response.detail?.address?.soi ?? '',
          road: response.detail?.address?.road ?? '',
          subDistrict: response.detail?.address?.subDistrict ?? '',
          subDistrictName: detailAddrLookup?.subDistrictName ?? null,
          district: response.detail?.address?.district ?? '',
          districtName: detailAddrLookup?.districtName ?? null,
          province: response.detail?.address?.province ?? '',
          provinceName: detailAddrLookup?.provinceName ?? null,
          postcode: response.detail?.address?.postcode ?? '',
        };
      })(),
      contact: {
        contactPersonName: response.detail?.contact?.contactPersonName ?? '',
        contactPersonPhone: response.detail?.contact?.contactPersonPhone ?? '',
        dealerCode: response.detail?.contact?.dealerCode ?? '',
      },
      appointment: {
        appointmentDateTime: response.detail?.appointment?.appointmentDateTime ?? null,
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

/**
 * Partial detail shape returned by mapCopyTemplateToForm.
 * Deliberately excludes `appointment` and `fee` — those must be preserved from current form values.
 */
type CopyTemplateDetailPartial = Omit<createRequestFormType['detail'], 'appointment' | 'fee'>;

/**
 * Map a copy-template API response to a partial form value.
 * Appointment and fee are intentionally excluded — the caller in RequestPage
 * merges this with current.detail.appointment and current.detail.fee preserved.
 */
export const mapCopyTemplateToForm = (
  template: AppraisalCopyTemplate,
): {
  detail: CopyTemplateDetailPartial;
  customers: createRequestFormType['customers'];
  properties: createRequestFormType['properties'];
  titles: createRequestFormType['titles'];
  documents: createRequestFormType['documents'];
} => {
  const addrLookup = template.detail.address?.subDistrict
    ? findAddressBySubDistrictCode(template.detail.address.subDistrict)
    : undefined;

  return {
    detail: {
      hasAppraisalBook: template.detail.hasAppraisalBook ?? false,
      loanDetail: {
        bankingSegment: template.detail.loanDetail?.bankingSegment ?? '',
        loanApplicationNumber: template.detail.loanDetail?.loanApplicationNumber ?? '',
        facilityLimit: template.detail.loanDetail?.facilityLimit ?? 0,
        additionalFacilityLimit: template.detail.loanDetail?.additionalFacilityLimit ?? null,
        previousFacilityLimit: template.detail.loanDetail?.previousFacilityLimit ?? null,
        totalSellingPrice: template.detail.loanDetail?.totalSellingPrice ?? 0,
      },
      // Stamp prev-appraisal metadata from the snapshot
      prevAppraisalId: template.prevAppraisal.appraisalId,
      prevAppraisalReportNo: template.prevAppraisal.appraisalNumber,
      prevAppraisalValue: template.prevAppraisal.appraisalValue ?? null,
      prevAppraisalDate: template.prevAppraisal.completedDate ?? null,
      address: {
        houseNumber: template.detail.address?.houseNumber ?? '',
        projectName: template.detail.address?.projectName ?? '',
        moo: template.detail.address?.moo ?? '',
        soi: template.detail.address?.soi ?? '',
        road: template.detail.address?.road ?? '',
        subDistrict: template.detail.address?.subDistrict ?? '',
        // *Name fields aren't returned by the copy-template endpoint —
        // resolved client-side from the subDistrict code via findAddressBySubDistrictCode.
        subDistrictName: addrLookup?.subDistrictName ?? null,
        district: template.detail.address?.district ?? '',
        districtName: addrLookup?.districtName ?? null,
        province: template.detail.address?.province ?? '',
        provinceName: addrLookup?.provinceName ?? null,
        postcode: template.detail.address?.postcode ?? '',
      },
      contact: {
        contactPersonName: template.detail.contact?.contactPersonName ?? '',
        contactPersonPhone: template.detail.contact?.contactPersonPhone ?? '',
        dealerCode: template.detail.contact?.dealerCode ?? '',
      },
    },
    customers: (template.customers ?? []).map(c => ({
      name: c.name ?? '',
      contactNumber: c.contactNumber ?? '',
    })),
    properties: (template.properties ?? []).map(p => ({
      propertyType: p.propertyType ?? '',
      buildingType: p.buildingType ?? null,
      sellingPrice: p.sellingPrice ?? null,
    })),
    titles: (template.titles ?? []) as createRequestFormType['titles'],
    documents: (template.documents ?? []) as createRequestFormType['documents'],
  };
};
