import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { getAccessToken } from '../auth/msal.js';
import { logger } from '../utils/logger.js';
import { PowerBIError } from '../utils/errors.js';

const POWERBI_API_BASE = 'https://api.powerbi.com/v1.0/myorg';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class PowerBIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: POWERBI_API_BASE,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(async (config) => {
      const token = await getAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Response interceptor for logging and retry handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config, response } = error;
        const originalRequest = config as AxiosRequestConfig & { _retry?: number };

        logger.error('Power BI API error', {
          method: config?.method,
          url: config?.url,
          status: response?.status,
          data: response?.data,
        });

        if (response && (response.status === 429 || response.status >= 500)) {
          const retryCount = originalRequest._retry || 0;
          if (retryCount < MAX_RETRIES) {
            originalRequest._retry = retryCount + 1;
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            logger.warn(`Retrying request (${retryCount + 1}/${MAX_RETRIES}) after ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.client(originalRequest);
          }
        }

        throw error;
      }
    );
  }

  async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        throw new PowerBIError(
          error.response.data?.error?.message || error.message,
          error.response.status,
          error.response.data
        );
      }
      throw error;
    }
  }

  // --- Workspaces ---
  async listWorkspaces() {
    return this.request({ method: 'GET', url: '/groups' });
  }

  async getWorkspace(workspaceId: string) {
    return this.request({ method: 'GET', url: `/groups/${workspaceId}` });
  }

  async createWorkspace(name: string) {
    return this.request({ method: 'POST', url: '/groups', data: { name } });
  }

  // --- Reports ---
  async listReports(workspaceId?: string) {
    const url = workspaceId ? `/groups/${workspaceId}/reports` : '/reports';
    return this.request({ method: 'GET', url });
  }

  async getReport(workspaceId: string, reportId: string) {
    return this.request({ method: 'GET', url: `/groups/${workspaceId}/reports/${reportId}` });
  }

  async cloneReport(workspaceId: string, reportId: string, name: string, targetWorkspaceId?: string) {
    return this.request({
      method: 'POST',
      url: `/groups/${workspaceId}/reports/${reportId}/Clone`,
      data: { name, targetWorkspaceId },
    });
  }

  async deleteReport(workspaceId: string, reportId: string) {
    return this.request({
      method: 'DELETE',
      url: `/groups/${workspaceId}/reports/${reportId}`,
    });
  }

  // --- Datasets ---
  async listDatasets(workspaceId?: string) {
    const url = workspaceId ? `/groups/${workspaceId}/datasets` : '/datasets';
    return this.request({ method: 'GET', url });
  }

  async getDataset(workspaceId: string, datasetId: string) {
    return this.request({ method: 'GET', url: `/groups/${workspaceId}/datasets/${datasetId}` });
  }

  async refreshDataset(workspaceId: string, datasetId: string, notifyOption?: string) {
    return this.request({
      method: 'POST',
      url: `/groups/${workspaceId}/datasets/${datasetId}/refreshes`,
      data: { notifyOption },
    });
  }

  async getRefreshHistory(workspaceId: string, datasetId: string, top?: number) {
    const params = top ? { $top: top } : {};
    return this.request({
      method: 'GET',
      url: `/groups/${workspaceId}/datasets/${datasetId}/refreshes`,
      params,
    });
  }

  async updateDatasetParameters(
    workspaceId: string,
    datasetId: string,
    parameters: Array<{ name: string; newValue: string }>
  ) {
    return this.request({
      method: 'POST',
      url: `/groups/${workspaceId}/datasets/${datasetId}/Default.UpdateParameters`,
      data: { updateDetails: parameters },
    });
  }

  // --- Import PBIX / PBIR ---
  async importFile(
    workspaceId: string,
    file: Buffer,
    fileName: string,
    nameConflict: 'Abort' | 'Overwrite' | 'GenerateUniqueName' = 'GenerateUniqueName'
  ) {
    const formData = new FormData();
    formData.append('file', file, fileName);

    return this.request({
      method: 'POST',
      url: `/groups/${workspaceId}/imports`,
      params: { datasetDisplayName: fileName, nameConflict },
      data: formData,
      headers: formData.getHeaders(),
    });
  }

  // --- Capacity ---
  async assignWorkspaceToCapacity(workspaceId: string, capacityId: string) {
    return this.request({
      method: 'POST',
      url: `/groups/${workspaceId}/AssignToCapacity`,
      data: { capacityId },
    });
  }
}

export const powerbiClient = new PowerBIClient();
