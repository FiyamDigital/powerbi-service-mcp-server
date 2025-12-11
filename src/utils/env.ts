import dotenv from 'dotenv';
dotenv.config();

export const env = {
  CLIENT_ID: process.env.CLIENT_ID || '',
  CLIENT_SECRET: process.env.CLIENT_SECRET || '',
  TENANT_ID: process.env.TENANT_ID || '',
  API_KEY: process.env.API_KEY || '',
  PORT: process.env.PORT || '3000',
  PBI_SCOPE: 'https://analysis.windows.net/powerbi/api/.default',
  PBI_AUTH_MODE: process.env.PBI_AUTH_MODE || 'sp',

  // missing keys added:
  CORS_ORIGINS: process.env.CORS_ORIGINS || '*',
  PBI_TOOLS_PATH: process.env.PBI_TOOLS_PATH || 'pbi-tools',
};

export function validateEnv() {
  if (!env.CLIENT_ID) throw new Error('Missing CLIENT_ID');
  if (!env.TENANT_ID) throw new Error('Missing TENANT_ID');
}
