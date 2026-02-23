import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type { AssignAppraisalRequestType, AssignAppraisalResponseType } from '@shared/schemas/v1';
import type {
  AddToQuotationRequest,
  CreateQuotationRequest,
  CurrentAssignment,
  ExternalCompany,
  InternalStaff,
  Quotation,
} from '../types/administration';

// Mock data for development
const mockStaffList: InternalStaff[] = [
  {
    id: 'staff-001',
    employeeId: 'EMP001',
    name: 'Somchai Prasert',
    email: 'somchai.prasert@lhbank.co.th',
    department: 'Appraisal Department',
    avatar: null,
    currentWorkload: 3,
  },
  {
    id: 'staff-002',
    employeeId: 'EMP002',
    name: 'Nattaya Srisawat',
    email: 'nattaya.srisawat@lhbank.co.th',
    department: 'Appraisal Department',
    avatar: null,
    currentWorkload: 5,
  },
  {
    id: 'staff-003',
    employeeId: 'EMP003',
    name: 'Wichai Kongpan',
    email: 'wichai.kongpan@lhbank.co.th',
    department: 'Appraisal Department',
    avatar: null,
    currentWorkload: 2,
  },
  {
    id: 'staff-004',
    employeeId: 'EMP004',
    name: 'Pranee Thongchai',
    email: 'pranee.thongchai@lhbank.co.th',
    department: 'Senior Appraisal',
    avatar: null,
    currentWorkload: 4,
  },
  {
    id: 'staff-005',
    employeeId: 'EMP005',
    name: 'Kittisak Wongprasert',
    email: 'kittisak.wongprasert@lhbank.co.th',
    department: 'Appraisal Department',
    avatar: null,
    currentWorkload: 1,
  },
];

const mockCompanyList: ExternalCompany[] = [
  {
    id: 'company-001',
    companyName: 'Thai Appraisal Co., Ltd.',
    registrationNo: 'TAC-001',
    contactPerson: 'Sompong Chaiyasit',
    contactPhone: '02-123-4567',
    contactEmail: 'contact@thaiappraisal.co.th',
    rating: 4.5,
    activeAssignments: 12,
  },
  {
    id: 'company-002',
    companyName: 'Bangkok Property Valuers',
    registrationNo: 'BPV-002',
    contactPerson: 'Naree Wongsawat',
    contactPhone: '02-234-5678',
    contactEmail: 'info@bkkvaluers.co.th',
    rating: 4.8,
    activeAssignments: 8,
  },
  {
    id: 'company-003',
    companyName: 'Siam Valuation Group',
    registrationNo: 'SVG-003',
    contactPerson: 'Prasit Chaimongkol',
    contactPhone: '02-345-6789',
    contactEmail: 'service@siamvaluation.co.th',
    rating: 4.2,
    activeAssignments: 15,
  },
  {
    id: 'company-004',
    companyName: 'Premium Asset Appraisal',
    registrationNo: 'PAA-004',
    contactPerson: 'Kannika Suthep',
    contactPhone: '02-456-7890',
    contactEmail: 'premium@assetappraisal.co.th',
    rating: 4.6,
    activeAssignments: 6,
  },
  {
    id: 'company-005',
    companyName: 'Metro Property Services',
    registrationNo: 'MPS-005',
    contactPerson: 'Thaworn Petcharat',
    contactPhone: '02-567-8901',
    contactEmail: 'metro@propertyservices.co.th',
    rating: 4.0,
    activeAssignments: 20,
  },
];

/**
 * Get a user by ID
 * GET /users/{userId}
 */
export const useGetUserById = (userId: string | null) => {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: async (): Promise<InternalStaff> => {
      // TODO: Replace with real API call
      // const { data } = await axios.get(`/users/${userId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return mockStaffList.find(s => s.id === userId) ?? {
        id: userId!,
        employeeId: '-',
        name: 'Unknown Staff',
        email: '-',
        department: '-',
        avatar: null,
        currentWorkload: 0,
      };
    },
    enabled: !!userId,
  });
};

/**
 * Get a company by ID
 * GET /companies/{companyId}
 */
export const useGetCompanyById = (companyId: string | null) => {
  return useQuery({
    queryKey: ['companies', companyId],
    queryFn: async (): Promise<ExternalCompany> => {
      // TODO: Replace with real API call
      // const { data } = await axios.get(`/companies/${companyId}`);
      // return data;

      await new Promise(resolve => setTimeout(resolve, 200));
      return mockCompanyList.find(c => c.id === companyId) ?? {
        id: companyId!,
        companyName: 'Unknown Company',
        registrationNo: '-',
        contactPerson: '-',
        contactPhone: '-',
        contactEmail: '-',
        rating: 0,
        activeAssignments: 0,
      };
    },
    enabled: !!companyId,
  });
};

/**
 * Get current assignment for an appraisal
 * GET /appraisals/{appraisalId}/assignments
 */
export const useGetAssignment = (appraisalId: string) => {
  return useQuery({
    queryKey: ['appraisal', appraisalId, 'assignments'],
    queryFn: async (): Promise<CurrentAssignment[]> => {
      const { data } = await axios.get(`/appraisals/${appraisalId}/assignments`);
      return data.assignments ?? [];
    },
    enabled: !!appraisalId,
  });
};

/**
 * Create new assignment
 * POST /appraisals/{appraisalId}/assignments
 */
export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: AssignAppraisalRequestType & { appraisalId: string },
    ): Promise<AssignAppraisalResponseType> => {
      const { appraisalId, ...body } = request;
      const { data } = await axios.post(`/appraisals/${appraisalId}/assignments`, body);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['appraisal', variables.appraisalId, 'assignments'],
      });
    },
  });
};

/**
 * Search internal staff
 * GET /staff/search?q={query}
 */
export const useSearchStaff = (searchQuery: string, enabled = true) => {
  return useQuery({
    queryKey: ['staff', 'search', searchQuery],
    queryFn: async (): Promise<InternalStaff[]> => {
      // TODO: Replace with real API call
      // const { data } = await axios.get('/staff/search', {
      //   params: { q: searchQuery },
      // });

      // Mock: Filter from mock list
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!searchQuery.trim()) return mockStaffList;

      const query = searchQuery.toLowerCase();
      return mockStaffList.filter(
        staff =>
          staff.name.toLowerCase().includes(query) ||
          staff.email.toLowerCase().includes(query) ||
          staff.employeeId.toLowerCase().includes(query) ||
          staff.department.toLowerCase().includes(query),
      );
    },
    enabled: enabled && searchQuery.length >= 0,
  });
};

/**
 * Search external companies
 * GET /companies/search?q={query}
 */
export const useSearchCompanies = (searchQuery: string, enabled = true) => {
  return useQuery({
    queryKey: ['companies', 'search', searchQuery],
    queryFn: async (): Promise<ExternalCompany[]> => {
      // TODO: Replace with real API call
      // const { data } = await axios.get('/companies/search', {
      //   params: { q: searchQuery },
      // });

      // Mock: Filter from mock list
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!searchQuery.trim()) return mockCompanyList;

      const query = searchQuery.toLowerCase();
      return mockCompanyList.filter(
        company =>
          company.companyName.toLowerCase().includes(query) ||
          company.registrationNo.toLowerCase().includes(query) ||
          company.contactPerson.toLowerCase().includes(query),
      );
    },
    enabled: enabled && searchQuery.length >= 0,
  });
};

/**
 * Get quotations that include this appraisal
 * GET /quotations?AppraisalId={appraisalId}
 */
export const useGetAppraisalQuotations = (appraisalId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['quotations', { appraisalId }],
    queryFn: async (): Promise<Quotation[]> => {
      const { data } = await axios.get('/quotations', {
        params: { AppraisalId: appraisalId, PageNumber: 0, PageSize: 100 },
      });
      const result = data.quotations ?? data;
      return result.items ?? [];
    },
    enabled: enabled && !!appraisalId,
  });
};

/**
 * Get pending quotations (status = 'Pending') for adding appraisals
 * GET /quotations?Status=Pending
 */
export const useGetPendingQuotations = (_companyId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['quotations', 'pending'],
    queryFn: async (): Promise<Quotation[]> => {
      const { data } = await axios.get('/quotations', {
        params: { Status: 'Pending', PageNumber: 0, PageSize: 100 },
      });
      const result = data.quotations ?? data;
      return result.items ?? [];
    },
    enabled,
  });
};

/**
 * Create a new quotation
 * POST /quotations
 */
export const useCreateQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateQuotationRequest): Promise<{ id: string }> => {
      const { data } = await axios.post('/quotations', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};

/**
 * Add appraisal to existing quotation
 * POST /quotations/{quotationId}/appraisals
 */
export const useAddToQuotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_request: AddToQuotationRequest): Promise<{ success: boolean }> => {
      // TODO: Replace with real API call
      // const { data } = await axios.post(
      //   `/quotations/${request.quotationId}/appraisals`,
      //   { appraisalId: request.appraisalId }
      // );

      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
};
