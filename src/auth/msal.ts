import {
  ConfidentialClientApplication,
  PublicClientApplication,
  type AuthenticationResult,
} from '@azure/msal-node';

import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { AuthenticationError } from '../utils/errors.js';

export interface TokenCache {
  accessToken: string;
  expiresOn: Date;
}

let tokenCache: TokenCache | null = null;

/**
 * Get Access Token (cached)
 */
export async function getAccessToken(): Promise<string> {
  // Use cache if token is still valid (>5 minutes remaining)
  if (
    tokenCache &&
    tokenCache.expiresOn > new Date(Date.now() + 5 * 60 * 1000)
  ) {
    logger.debug('Using cached access token');
    return tokenCache.accessToken;
  }

  logger.info('Acquiring new access token', { mode: env.PBI_AUTH_MODE });

  let result: AuthenticationResult | null = null;

  if (env.PBI_AUTH_MODE === 'sp') {
    result = await acquireTokenServicePrincipal();
  } else if (env.PBI_AUTH_MODE === 'device') {
    result = await acquireTokenDeviceCode();
  } else {
    throw new AuthenticationError(`Invalid auth mode: ${env.PBI_AUTH_MODE}`);
  }

  if (!result?.accessToken) {
    throw new AuthenticationError('Failed to acquire access token');
  }

  tokenCache = {
    accessToken: result.accessToken,
    expiresOn: result.expiresOn || new Date(Date.now() + 3600 * 1000),
  };

  logger.info('Access token acquired successfully');
  return result.accessToken;
}

/**
 * Authenticate using Service Principal (Client Secret)
 */
async function acquireTokenServicePrincipal(): Promise<AuthenticationResult | null> {
  if (!env.CLIENT_SECRET) {
    throw new AuthenticationError(
      'CLIENT_SECRET is required for service principal authentication'
    );
  }

  const msalConfig = {
    auth: {
      clientId: env.CLIENT_ID,
      authority: `https://login.microsoftonline.com/${env.TENANT_ID}`,
      clientSecret: env.CLIENT_SECRET,
    },
  };

  const cca = new ConfidentialClientApplication(msalConfig);

  try {
    return await cca.acquireTokenByClientCredential({
      scopes: [env.PBI_SCOPE],
    });
  } catch (error) {
    logger.error('Service principal authentication failed', { error });
    throw new AuthenticationError('Service principal authentication failed');
  }
}

/**
 * Authenticate using Device Code Flow
 */
async function acquireTokenDeviceCode(): Promise<AuthenticationResult | null> {
  const msalConfig = {
    auth: {
      clientId: env.CLIENT_ID,
      authority: `https://login.microsoftonline.com/${env.TENANT_ID}`,
    },
  };

  const pca = new PublicClientApplication(msalConfig);

  try {
    const result = await pca.acquireTokenByDeviceCode({
      scopes: [env.PBI_SCOPE],
      deviceCodeCallback: (response) => {
        logger.info('Device Code Authentication Required');
        logger.info(`Open: ${response.verificationUri}`);
        logger.info(`Enter Code: ${response.userCode}`);

        console.log('\n' + '='.repeat(60));
        console.log('      DEVICE CODE AUTHENTICATION');
        console.log('='.repeat(60));
        console.log(`1. Visit: ${response.verificationUri}`);
        console.log(`2. Enter Code: ${response.userCode}`);
        console.log('='.repeat(60) + '\n');
      },
    });

    return result;
  } catch (error) {
    logger.error('Device code authentication failed', { error });
    throw new AuthenticationError('Device code authentication failed');
  }
}

/**
 * Clear cached token
 */
export function clearTokenCache(): void {
  tokenCache = null;
  logger.debug('Token cache cleared');
}
