import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { powerbiClient } from '../../services/powerbiClient.js';

import {
  createWorkspaceSchema,
  cloneReportSchema,
  refreshDatasetSchema,
  updateDatasetParametersSchema,
} from '../schemas/pbi.js';

export async function pbiRoutes(fastify: FastifyInstance) {
  
  fastify.get('/workspaces', {
    schema: {
      description: 'List all Power BI workspaces',
      tags: ['Power BI'],
      response: {
        200: {
          type: 'object',
          properties: { value: { type: 'array' } },
        },
      },
    },
    handler: async () => powerbiClient.listWorkspaces(),
  });

  fastify.get<{ Params: { workspaceId: string } }>('/workspaces/:workspaceId', {
    schema: {
      description: 'Get workspace details',
      tags: ['Power BI'],
      params: {
        type: 'object',
        properties: { workspaceId: { type: 'string' } },
      },
    },
    handler: async (req) => powerbiClient.getWorkspace(req.params.workspaceId),
  });

  fastify.post<{ Body: z.infer<typeof createWorkspaceSchema> }>('/workspaces', {
    schema: {
      description: 'Create workspace',
      tags: ['Power BI'],
      body: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
    },
    handler: async (req) => {
      const { name } = createWorkspaceSchema.parse(req.body);
      return powerbiClient.createWorkspace(name);
    },
  });

  fastify.get('/reports', {
    schema: {
      description: 'List reports',
      tags: ['Power BI'],
      querystring: { type: 'object', properties: { workspaceId: { type: 'string' } } },
    },
    handler: async (req) => {
      const { workspaceId } = req.query as { workspaceId?: string };
      return powerbiClient.listReports(workspaceId);
    },
  });

  fastify.post<{ Body: z.infer<typeof cloneReportSchema> }>('/reports/clone', {
    schema: {
      description: 'Clone report',
      tags: ['Power BI'],
      body: {
        type: 'object',
        required: ['workspaceId', 'reportId', 'name'],
        properties: {
          workspaceId: { type: 'string' },
          reportId: { type: 'string' },
          name: { type: 'string' },
          targetWorkspaceId: { type: 'string' },
        },
      },
    },
    handler: async (req) => {
      const parsed = cloneReportSchema.parse(req.body);
      return powerbiClient.cloneReport(
        parsed.workspaceId,
        parsed.reportId,
        parsed.name,
        parsed.targetWorkspaceId,
      );
    },
  });

  fastify.get('/datasets', {
    schema: {
      description: 'List datasets',
      tags: ['Power BI'],
      querystring: { type: 'object', properties: { workspaceId: { type: 'string' } } },
    },
    handler: async (req) => {
      const { workspaceId } = req.query as { workspaceId?: string };
      return powerbiClient.listDatasets(workspaceId);
    },
  });

  fastify.post<{ Body: z.infer<typeof refreshDatasetSchema> }>('/datasets/refresh', {
    schema: {
      description: 'Refresh dataset',
      tags: ['Power BI'],
      body: {
        type: 'object',
        required: ['workspaceId', 'datasetId'],
        properties: {
          workspaceId: { type: 'string' },
          datasetId: { type: 'string' },
          notifyOption: { type: 'string' },
        },
      },
    },
    handler: async (req) => {
      const parsed = refreshDatasetSchema.parse(req.body);
      return powerbiClient.refreshDataset(parsed.workspaceId, parsed.datasetId, parsed.notifyOption);
    },
  });

  fastify.post<{ Body: z.infer<typeof updateDatasetParametersSchema> }>(
    '/datasets/parameters',
    {
      schema: {
        description: 'Update dataset parameters',
        tags: ['Power BI'],
        body: {
          type: 'object',
          required: ['workspaceId', 'datasetId', 'parameters'],
          properties: {
            workspaceId: { type: 'string' },
            datasetId: { type: 'string' },
            parameters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  newValue: { type: 'string' },
                },
              },
            },
          },
        },
      },
      handler: async (req) => {
        const parsed = updateDatasetParametersSchema.parse(req.body);
        return powerbiClient.updateDatasetParameters(
          parsed.workspaceId,
          parsed.datasetId,
          parsed.parameters
        );
      },
    }
  );

  fastify.post('/import', {
    schema: {
      description: 'Import PBIX',
      tags: ['Power BI'],
      consumes: ['multipart/form-data'],
      querystring: {
        type: 'object',
        required: ['workspaceId'],
        properties: {
          workspaceId: { type: 'string' },
          nameConflict: { type: 'string' },
        },
      },
    },
    handler: async (req, reply) => {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: 'No file uploaded' });

      const buffer = await data.toBuffer();
      const { workspaceId, nameConflict } = req.query as {
        workspaceId: string;
        nameConflict?: 'Abort' | 'Overwrite' | 'GenerateUniqueName';
      };

      return powerbiClient.importFile(
        workspaceId,
        buffer,
        data.filename,
        nameConflict || 'GenerateUniqueName'
      );
    },
  });
}
