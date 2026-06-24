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
  schoolAcademicModel: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/school-academic-model`
} as const;
