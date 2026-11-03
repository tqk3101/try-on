import { apiClient } from './apiClient.js';

export function fetchHealth(options) {
  return apiClient.get('/health', options);
}
