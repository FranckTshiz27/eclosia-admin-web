/** Contrat API : GET /finance/dashboard */

export interface FinancialDashboard {
  summary: FinancialDashboardSummary;
  revenueEvolution: RevenueEvolutionItem[];
  revenueByCategory: RevenueByCategory[];
  classPerformance: ClassPerformance[];
  revenueByPaymentMethod: RevenueByPaymentMethod[];
  arrearsSummary: ArrearsSummary;
  recentPayments: RecentPayment[];
  quickSummary: QuickSummary;
}

export interface FinancialDashboardSummary {
  expectedAmount: number;
  collectedAmount: number;
  remainingAmount: number;
  recoveryRate: number;
  totalStudents: number;
  totalClasses: number;
  todayCollectedAmount: number;
  todayPaymentCount: number;
}

export interface RevenueEvolutionItem {
  period: string;
  collectedAmount: number;
}

export interface RevenueByCategory {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  collectedAmount: number;
  percentage: number;
}

export interface ClassPerformance {
  classroomId: string;
  classroomName: string;
  studentCount: number;
  expectedAmount: number;
  collectedAmount: number;
  remainingAmount: number;
  recoveryRate: number;
}

export interface RevenueByPaymentMethod {
  paymentMethod: string;
  collectedAmount: number;
  percentage: number;
}

export interface ArrearsSummary {
  unpaidStudentCount: number;
  remainingAmount: number;
  remainingPercentage: number;
  recoveryRate: number;
}

export interface RecentPayment {
  paymentId: string;
  receiptNumber: string;
  paymentDate: string;
  studentId: string;
  studentNumber: string;
  studentFullName: string;
  classroomId: string;
  classroomName: string;
  amount: number;
  currencyCode: string;
  paymentMethod: string;
}

export interface QuickSummary {
  configuredFeesCount: number;
  configuredInstallmentsCount: number;
  averageExpectedPerStudent: number;
  averageCollectedPerStudent: number;
}
