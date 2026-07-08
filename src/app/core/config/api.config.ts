export const API_CONFIG = {
  gatewayBaseUrl: 'http://localhost:8001',
  services: {
    organization: 'api-organization'
  }
} as const;

export const API_ENDPOINTS = {
  group: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/group`,
  country: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/country`,
  state: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/state`,
  city: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/city`,
  commune: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/commune`,
  schoolTypes: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/reference-data/school-types`,
  school: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/school`,
  academicModel: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/academic-model`,
  academicCycle: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/academic-cycle`,
  academicLevel: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/academic-level`,
  academicSection: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/academic-section`,
  academicOption: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/academic-option`,
  schoolAcademicModel: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/school-academic-model`,
  academicYear: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/academic-year`,
  schoolAcademicYear: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/school-academic-year`,
  schoolClass: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/school-class`,
  classroom: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/classroom`,
  classroomDesignation: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/classroom-designation`,
  studentCategory: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/student-category`,
  feeCategory: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/fee-category`,
  paymentInstallment: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/payment-installment`,
  academicFee: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/academic-fee`,
  payment: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/payment`,
  currency: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/currency`,
  schoolCurrency: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/school-currency`,
  currencyRate: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/currency-rate`,
  guardian: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/guardian`,
  enrollment: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/enrollment`,
  enrollmentReport: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/enrollment-report`,
  paymentReceiptReport: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/report/payment-receipt`,
  paymentJournalReport: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/report/payment-journal`,
  paymentRecoveryReport: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/report/payment-recovery/dashboard`
} as const;
