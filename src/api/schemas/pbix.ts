import { z } from 'zod';

export const decompileSchema = z.object({
  filePath: z.string(),
  outDir: z.string().optional(),
  modelOnly: z.boolean().optional(),
});

export const recompileSchema = z.object({
  projectDir: z.string(),
  outPath: z.string().optional(),
  format: z.enum(['PBIX', 'PBIT']).optional(),
});

export const applyThemeSchema = z.object({
  projectDir: z.string(),
  theme: z.union([z.record(z.unknown()), z.string()]),
  strategy: z.enum(['merge', 'replace']).optional(),
});

export const extractThemeSchema = z.object({
  reportFilePath: z.string(),
});
