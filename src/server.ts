import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './utils/env.js';
import { logger } from './utils/logger.js';

import { pbiRoutes } from './api/routes/pbi.js';
import { pbixRoutes } from './api/routes/pbix.js';

import type { ZodError } from 'zod';
import { AppError } from './utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createHTTPServer(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
  });

  // --- CORS ---
  const corsOrigins = (env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : ['*']).map(o => o.trim());

  await fastify.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  // --- Multipart for PBIX uploads ---
  await fastify.register(multipart, {
    limits: {
      fileSize: 500 * 1024 * 1024,
    },
  });

  // --- Swagger / OpenAPI ---
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Power BI MCP Server API',
        description: 'HTTP API for Power BI REST operations and PBIX/PBIR conversion',
        version: '1.0.0',
        contact: { name: 'API Support' },
        license: { name: 'MIT' },
      },
      servers: [
        { url: `http://localhost:${env.PORT}`, description: 'Development server' },
      ],
      tags: [
        { name: 'Power BI', description: 'Power BI REST API operations' },
        { name: 'PBIX Tools', description: 'PBIX/PBIR conversion and manipulation' },
        { name: 'Health', description: 'Health check endpoints' },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });

  // --- Static files ---
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/public/',
  });

  // --- Request logging ---
  fastify.addHook('onRequest', async (request) => {
    logger.info('Incoming request', {
      method: request.method,
      url: request.url,
      reqId: request.id,
    });
  });

  // --- API Key Auth ---
  fastify.addHook('onRequest', async (request, reply) => {
    if (
      request.url.startsWith('/docs') ||
      request.url.startsWith('/health') ||
      request.url === '/openapi.json'
    ) {
      return;
    }

    const apiKey = request.headers['x-api-key'];

    if (!apiKey || apiKey !== env.API_KEY) {
      logger.warn('Unauthorized request', {
        reqId: request.id,
        url: request.url,
      });

      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
      });
    }
  });

  // --- Error Handler ---
  fastify.setErrorHandler((error, request, reply) => {
    logger.error('Request error', {
      error,
      reqId: request.id,
      url: request.url,
    });

    // Zod validation errors
    if (error.name === 'ZodError') {
      const zodError = error as unknown as ZodError; // FIXED
      return reply.code(400).send({
        error: 'Validation Error',
        details: zodError.errors,
      });
    }

    // App errors
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
      });
    }

    // Generic error
    const statusCode = error.statusCode || 500;

    return reply.code(statusCode).send({
      error: 'Internal Server Error',
      message: error.message,
    });
  });

  // --- Health check ---
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
    handler: async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  });

  // --- Deep health ---
  fastify.get('/health/deep', {
    schema: {
      description: 'Deep health check including Power BI connectivity',
      tags: ['Health'],
    },
    handler: async () => {
      const health: Record<string, unknown> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };

      try {
        const { powerbiClient } = await import('./services/powerbiClient.js');
        await powerbiClient.listWorkspaces();
        health.powerbi = 'connected';
      } catch (error) {
        health.powerbi = 'error';
        health.powerbiError = error instanceof Error ? error.message : String(error);
        health.status = 'degraded';
      }

      try {
        const { pbiToolsService } = await import('./services/pbiTools.js');
        const available = await pbiToolsService.checkAvailability();
        health.pbiTools = available ? 'available' : 'not available';
      } catch (error) {
        health.pbiTools = 'error';
        health.pbiToolsError = error instanceof Error ? error.message : String(error);
      }

      return health;
    },
  });

  // --- Routes ---
  await fastify.register(pbiRoutes, { prefix: '/api/pbi' });
  await fastify.register(pbixRoutes, { prefix: '/api/pbix' });

  // --- 404 ---
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method}:${request.url} not found`,
    });
  });

  logger.info('HTTP server initialized', { port: env.PORT });

  return fastify;
}
