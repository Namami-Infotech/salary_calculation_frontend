export type RoleType = 'ADMIN' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  role: RoleType;
  companyId: string;
  companyName?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    photoUrl?: string;
  };
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Designation {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  companyId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  age?: number;
  email: string;
  phone?: string;
  photoUrl?: string;
  address?: string;
  departmentId?: string;
  department?: Department | string;
  designationId?: string;
  designation?: Designation | string;
  managerId?: string;
  manager?: { id: string; firstName: string; lastName: string; employeeCode: string };
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  joiningDate: string;
  monthlySalary?: number;
  probationPeriodDays: number;
  employmentStatus: 'ACTIVE' | 'INACTIVE';
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    branchName?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  createdAt: string;
}

export interface PayrollLineItem {
  id?: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: number;
}

export interface PayrollRecordItem {
  id: string;
  batchId: string;
  employeeId: string;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: string;
    designation?: string;
    monthlySalary?: number;
  };
  totalDaysInMonth: number;
  paidDays: number;
  unpaidDays: number;
  basicSalary: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  lineItems?: PayrollLineItem[];
  payslip?: {
    id?: string;
    payslipNumber: string;
    generatedAt?: string;
  };
}

export interface PayrollBatch {
  id: string;
  year: number;
  month: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  status: 'DRAFT' | 'PREVIEW' | 'APPROVED' | 'PROCESSED' | 'PAID';
  processedAt?: string;
  records?: PayrollRecordItem[];
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string; employeeCode: string };
  leaveTypeId?: string;
  leaveType?: string | { name: string; code?: string; isPaid?: boolean };
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  actionComments?: string;
  createdAt: string;
}

export interface DashboardStats {
  activeCyclePeriod: string;
  kpis: {
    totalHeadcount: number;
    activeCount: number;
    inactiveCount: number;
    newThisMonth: number;
    totalMonthlyLiability: number;
    pendingLeaves: number;
    approvedLeaves: number;
    totalLeaves: number;
    processedPayrollAmount: number;
    latestBatchStatus: string;
    latestBatchPeriod: string;
  };
  payrollStats: {
    avgMonthlyExpenditure: number;
    growthPercentage: number;
    chartData: Array<{
      month: string;
      fullMonth: string;
      year: number;
      monthNum: number;
      amount: number;
      employees: number;
      status: string;
    }>;
  };
  departmentBreakdown: Array<{
    name: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  recentBatches: Array<{
    id: string;
    period: string;
    disbursed: number;
    totalGross: number;
    totalDeductions: number;
    headcount: number;
    status: string;
    date: string;
  }>;
  recentLeaves: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    leaveType: string;
    totalDays: number;
    startDate: string;
    endDate: string;
    status: string;
    createdAt: string;
  }>;
}


