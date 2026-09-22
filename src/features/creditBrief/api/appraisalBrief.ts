import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

/**
 * One collateral item on the brief.
 *
 * There is no per-item value on purpose — see the remarks on `BriefAsset` in the backend.
 * `AppraisalProperties.SellingPrice` is written on 6 of 105,660 rows, because pricing in this
 * system hangs off a property group, not a property.
 */
export interface BriefAsset {
  id: string;
  sequenceNumber: number;
  propertyType: string | null;
  title: string | null;
  area: string | null;
  location: string | null;
  /** Building type CODE — render through `ParameterDisplay group="BuildingType"`. */
  buildingType: string | null;
  numberOfFloors: number | null;
  /** Land area components. Raw, because rai-ngan-wa carry at 4 and 100 — totals need the parts. */
  areaRai: number | null;
  areaNgan: number | null;
  areaSquareWa: number | null;
  /** A machine's own name — it has no title, area or location to identify it by. */
  machineName: string | null;
  /** Free text behind `buildingType` '99' (อื่นๆ) — for that code this, not the label, is the answer. */
  buildingTypeOther: string | null;
  /** Storeys in the condo building this unit is in. */
  condoFloors: number | null;
  /** The floor the unit is on, as stored — nvarchar, and '-' on rows nobody filled in. Parse defensively. */
  condoFloorNumber: string | null;
}

/** A person to contact. `department` rides along because IntAdmin is not scoped to one desk. */
export interface BriefContact {
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  department: string | null;
  /** The bank code they log in with. Credit asks for desk staff by code as often as by name. */
  userName: string | null;
}

export interface BriefDocument {
  documentId: string;
  typeCode: string;
  typeName: string | null;
  typeNameTh: string | null;
  /** D043 Appraisal Summary and D001 Appraisal Report — the two credit actually files. */
  isPrimary: boolean;
  fileName: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string | null;
}

/**
 * Who the appraisal is sitting with right now.
 *
 * External work is assigned to a FIRM, not a named person — `assignedTo`/`name` are then null
 * and the `company*` fields carry the contact. Render whichever side is populated rather than
 * assuming there is always a person.
 *
 * `pendingCount > 1` means the step fanned out to a group (a committee review). This object
 * describes the most recently assigned of them, so say so rather than presenting the one name
 * as the only person involved.
 */
export interface BriefHolder {
  activityName: string | null;
  activityId: string | null;
  assignedTo: string | null;
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  department: string | null;
  position: string | null;
  companyName: string | null;
  companyNameLocal: string | null;
  companyPhone: string | null;
  companyEmail: string | null;
  companyContactPerson: string | null;
  heldSince: string | null;
  pendingCount: number;
  /** The group a queued task waits in when no individual holds it — "IntAdmin", or
   *  "ExtAdmin:Team_<companyId>" when the pool was scoped to a team. Null when a person holds it. */
  poolName: string | null;
}

/** A committee sitting the appraisal is tabled at. Titles already name the committee and the sitting. */
export interface BriefMeeting {
  title: string | null;
  startAt: string | null;
  status: string | null;
}

/** An outside valuation firm and its admin — who credit actually rings about external work. */
export interface BriefExternalCompany {
  name: string | null;
  nameLocal: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  adminName: string | null;
  adminPhone: string | null;
  adminEmail: string | null;
}

/**
 * The project a BLOCK appraisal values.
 *
 * A block appraisal has zero `assets` — it values a whole project rather than a
 * list of properties — so this is its collateral, and the section must render it
 * or the panel claims the application has no security at all.
 */
export interface BriefProject {
  projectName: string | null;
  /** Shares the PropertyType wire format — 'U', 'LB', 'L'. */
  projectType: string | null;
  developer: string | null;
  unitForSaleCount: number | null;
  landAreaRai: number | null;
  landAreaNgan: number | null;
  landAreaSquareWa: number | null;
  subDistrict: string | null;
  numberOfPhase: number | null;
  /** Towers in the project. 0 for a horizontal project (houses, shophouses). */
  towerCount: number;
  /** Storeys in the tallest tower, or null when the project records none. */
  maxFloor: number | null;
  /** Units actually uploaded. Stands in for `unitForSaleCount`, which is often unset. */
  unitCount: number;
  /** Storeys of a house on a horizontal project — NOT the floor a condo unit is on. */
  unitStoreys: number | null;
}

export interface AppraisalBrief {
  id: string;
  appraisalNumber: string | null;
  requestNumber: string | null;
  loanApplicationNumber: string | null;
  status: string;
  appraisalType: string | null;
  purpose: string | null;
  channel: string | null;
  propertyTypes: string | null;

  customerName: string | null;
  customerCount: number;
  customerContactNumber: string | null;

  requestedBy: string | null;
  requestedByName: string | null;
  requestedAt: string | null;
  appointmentDateTime: string | null;
  completedAt: string | null;

  /**
   * The date the appraisal is due. A TARGET, not a forecast: the server stamps it once at
   * intake (requestedAt + the SLA policy's hours, counted in business hours) and never moves
   * it, so a late job keeps a date in the past rather than sliding. Render it as the commitment
   * it is, and once `completedAt` exists show that instead.
   */
  dueDate: string | null;

  facilityLimit: number | null;

  /**
   * The single flag the locked/unlocked rendering keys off. Do NOT re-derive it from `status`
   * in the client: the server owns the rule, and everything below arrives null while it is false.
   */
  isReleased: boolean;
  /** Looser than `isReleased`: the folder is withheld from a credit reader before approval, but an
   *  internal caller gets it whatever the status — including a cancelled appraisal, whose files
   *  they can already see on the Documents tab. Cannot be derived from `isReleased`. */
  documentsReleased: boolean;

  appraisalValue: number | null;
  forcedSaleValue: number | null;
  insuranceValue: number | null;
  valuationDate: string | null;
  /** Committee CODE (SUB_COMMITTEE / COMMITTEE / ...) — resolve it through `committeeNames.ts`. */
  approvedByCommittee: string | null;

  /** Null once nothing is pending — the work is finished or cancelled, so there is nobody to chase. */
  currentHolder: BriefHolder | null;

  /** Null when the appraisal has never been tabled — including one approved off the meeting path. */
  meeting: BriefMeeting | null;

  /** Null for an appraisal done in-house. */
  externalCompany: BriefExternalCompany | null;

  /** The appraisal department's admins — the same desk for every appraisal. */
  appraisalAdmins: BriefContact[];

  /** Set only for a block appraisal; `assets` is empty in that case. */
  project: BriefProject | null;

  assets: BriefAsset[];
  documents: BriefDocument[];
}

export const appraisalBriefKey = (id: string | undefined) => ['appraisal-brief', id] as const;

export function useGetAppraisalBrief(appraisalId: string | undefined) {
  return useQuery({
    queryKey: appraisalBriefKey(appraisalId),
    enabled: !!appraisalId,
    queryFn: async (): Promise<AppraisalBrief> => {
      const { data } = await axios.get<AppraisalBrief>(`/appraisals/${appraisalId}/brief`);
      return data;
    },
  });
}
