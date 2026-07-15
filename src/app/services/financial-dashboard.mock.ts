import { FinancialDashboard } from './financial-dashboard.models';

/** Mock isolé — aligné sur FinancialDashboardDto. */
export function createFinancialDashboardMock(): FinancialDashboard {
  return {
    summary: {
      expectedAmount: 8450000,
      collectedAmount: 5882500,
      remainingAmount: 2567500,
      recoveryRate: 69.61,
      totalStudents: 124,
      totalClasses: 12,
      todayCollectedAmount: 450000,
      todayPaymentCount: 18
    },
    revenueEvolution: [
      { period: '2026-07', collectedAmount: 220000 },
      { period: '2026-08', collectedAmount: 380000 },
      { period: '2026-09', collectedAmount: 920000 },
      { period: '2026-10', collectedAmount: 780000 },
      { period: '2026-11', collectedAmount: 650000 },
      { period: '2026-12', collectedAmount: 510000 },
      { period: '2027-01', collectedAmount: 690000 },
      { period: '2027-02', collectedAmount: 540000 },
      { period: '2027-03', collectedAmount: 470000 },
      { period: '2027-04', collectedAmount: 390000 },
      { period: '2027-05', collectedAmount: 280000 },
      { period: '2027-06', collectedAmount: 152500 }
    ],
    revenueByCategory: [
      {
        categoryId: 'cat-1',
        categoryCode: 'MIN',
        categoryName: 'Frais scolaires',
        collectedAmount: 3200000,
        percentage: 54.4
      },
      {
        categoryId: 'cat-2',
        categoryCode: 'INS',
        categoryName: "Frais d'inscription",
        collectedAmount: 1500000,
        percentage: 25.5
      },
      {
        categoryId: 'cat-3',
        categoryCode: 'AUT',
        categoryName: 'Autres frais',
        collectedAmount: 1182500,
        percentage: 20.1
      }
    ],
    classPerformance: [
      {
        classroomId: 'cls-1',
        classroomName: '6ème Primaire A',
        studentCount: 28,
        expectedAmount: 980000,
        collectedAmount: 857500,
        remainingAmount: 122500,
        recoveryRate: 87.5
      },
      {
        classroomId: 'cls-2',
        classroomName: '5ème Primaire B',
        studentCount: 25,
        expectedAmount: 875000,
        collectedAmount: 700000,
        remainingAmount: 175000,
        recoveryRate: 80
      },
      {
        classroomId: 'cls-3',
        classroomName: '4ème Primaire A',
        studentCount: 30,
        expectedAmount: 1050000,
        collectedAmount: 787500,
        remainingAmount: 262500,
        recoveryRate: 75
      },
      {
        classroomId: 'cls-4',
        classroomName: '3ème Secondaire A',
        studentCount: 22,
        expectedAmount: 1100000,
        collectedAmount: 770000,
        remainingAmount: 330000,
        recoveryRate: 70
      },
      {
        classroomId: 'cls-5',
        classroomName: '2ème Secondaire B',
        studentCount: 19,
        expectedAmount: 950000,
        collectedAmount: 617500,
        remainingAmount: 332500,
        recoveryRate: 65
      }
    ],
    revenueByPaymentMethod: [
      { paymentMethod: 'CASH', collectedAmount: 2647125, percentage: 45 },
      { paymentMethod: 'MOBILE_MONEY', collectedAmount: 2058875, percentage: 35 },
      { paymentMethod: 'BANK', collectedAmount: 1176500, percentage: 20 }
    ],
    arrearsSummary: {
      unpaidStudentCount: 46,
      remainingAmount: 2567500,
      remainingPercentage: 30.39,
      recoveryRate: 69.61
    },
    recentPayments: [
      {
        paymentId: 'pay-1',
        receiptNumber: 'REC-2026-000154',
        paymentDate: new Date().toISOString(),
        studentId: 'stu-1',
        studentNumber: 'STD-000124',
        studentFullName: 'KAPINGA KALOMBO Junior',
        classroomId: 'cls-1',
        classroomName: '6ème Primaire A',
        amount: 250000,
        currencyCode: 'CDF',
        paymentMethod: 'MOBILE_MONEY'
      },
      {
        paymentId: 'pay-2',
        receiptNumber: 'REC-2026-000153',
        paymentDate: new Date(Date.now() - 3600000).toISOString(),
        studentId: 'stu-2',
        studentNumber: 'STD-000089',
        studentFullName: 'MUKENDI NZUZI Grâce',
        classroomId: 'cls-2',
        classroomName: '5ème Primaire B',
        amount: 150000,
        currencyCode: 'CDF',
        paymentMethod: 'CASH'
      },
      {
        paymentId: 'pay-3',
        receiptNumber: 'REC-2026-000152',
        paymentDate: new Date(Date.now() - 86400000).toISOString(),
        studentId: 'stu-3',
        studentNumber: 'STD-000201',
        studentFullName: 'ILUNGA KASONGO Patrick',
        classroomId: 'cls-3',
        classroomName: '4ème Primaire A',
        amount: 200000,
        currencyCode: 'CDF',
        paymentMethod: 'BANK'
      },
      {
        paymentId: 'pay-4',
        receiptNumber: 'REC-2026-000151',
        paymentDate: new Date(Date.now() - 90000000).toISOString(),
        studentId: 'stu-4',
        studentNumber: 'STD-000056',
        studentFullName: 'KABANGE MUTEBA Léa',
        classroomId: 'cls-4',
        classroomName: '3ème Secondaire A',
        amount: 175000,
        currencyCode: 'CDF',
        paymentMethod: 'MOBILE_MONEY'
      },
      {
        paymentId: 'pay-5',
        receiptNumber: 'REC-2026-000150',
        paymentDate: new Date(Date.now() - 172800000).toISOString(),
        studentId: 'stu-5',
        studentNumber: 'STD-000312',
        studentFullName: 'TSHISEKEDI MULUMBA David',
        classroomId: 'cls-5',
        classroomName: '2ème Secondaire B',
        amount: 125000,
        currencyCode: 'CDF',
        paymentMethod: 'CASH'
      }
    ],
    quickSummary: {
      configuredFeesCount: 7,
      configuredInstallmentsCount: 18,
      averageExpectedPerStudent: 68145.16,
      averageCollectedPerStudent: 47439.52
    }
  };
}
