import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { pbiToolsService } from '../../services/pbiTools.js';
import { themeService } from '../../services/theme.js';

import {
  decompileSchema,
  recompileSchema,
  applyThemeSchema,
  extractThemeSchema,
} from '../schemas/pbix.js';

export async function pbixRoutes(fastify: FastifyInstance) {
  
  fastify.post<{ Body: z.infer<typeof decompileSchema> }>('/decompile', {
    schema: {
      description: 'Decompile PBIX → Project',
      tags: ['PBIX Tools'],
      body: {
        type: 'object',
        required: ['filePath'],
        properties: {
          filePath: { type: 'string' },
          outDir: { type: 'string' },
          modelOnly: { type: 'boolean' },
        },
      },
    },
    handler: async (req) => {
      const parsed = decompileSchema.parse(req.body);
      const projectDir = await pbiToolsService.extract(parsed);
      return { success: true, projectDir };
    },
  });

  fastify.post<{ Body: z.infer<typeof recompileSchema> }>('/recompile', {
    schema: {
      description: 'Recompile project → PBIX/PBIT',
      tags: ['PBIX Tools'],
      body: {
        type: 'object',
        required: ['projectDir'],
        properties: {
          projectDir: { type: 'string' },
          outPath: { type: 'string' },
          format: { type: 'string', enum: ['PBIX', 'PBIT'] },
        },
      },
    },
    handler: async (req) => {
      const parsed = recompileSchema.parse(req.body);
      const out = await pbiToolsService.compile(parsed);
      return { success: true, outPbixPath: out };
    },
  });

  fastify.post<{ Body: z.infer<typeof applyThemeSchema> }>('/apply-theme', {
    schema: {
      description: 'Apply theme to project',
      tags: ['PBIX Tools'],
      body: {
        type: 'object',
        required: ['projectDir', 'theme'],
        properties: {
          projectDir: { type: 'string' },
          theme: { type: ['object', 'string'] },
          strategy: { type: 'string', enum: ['replace', 'merge'] },
        },
      },
    },
    handler: async (req) => {
      const parsed = applyThemeSchema.parse(req.body);
      return themeService.applyTheme(parsed);
    },
  });

  fastify.post<{ Body: z.infer<typeof extractThemeSchema> }>('/extract-theme', {
    schema: {
      description: 'Extract theme from report file',
      tags: ['PBIX Tools'],
      body: {
        type: 'object',
        required: ['reportFilePath'],
        properties: {
          reportFilePath: { type: 'string' },
        },
      },
    },
    handler: async (req) => {
      const parsed = extractThemeSchema.parse(req.body);
      const theme = await themeService.extractTheme(parsed.reportFilePath);
      return { success: true, theme };
    },
  });

  fastify.get('/check-pbitools', {
    schema: { description: 'Check pbi-tools availability', tags: ['PBIX Tools'] },
    handler: async () => {
      const available = await pbiToolsService.checkAvailability();
      if (!available) return { success: false, message: 'pbi-tools not available' };
      return { success: true, info: await pbiToolsService.getInfo() };
    },
  });
}
