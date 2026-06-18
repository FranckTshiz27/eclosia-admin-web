export const API_CONFIG = {
  gatewayBaseUrl: 'http://localhost:8001',
  services: {
    organization: 'api-organization'
  }
} as const;

export const API_ENDPOINTS = {
  group: `${API_CONFIG.gatewayBaseUrl}/${API_CONFIG.services.organization}/group`
} as const;
