import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string(),
});

export const cloneReportSchema = z.object({
  workspaceId: z.string(),
  reportId: z.string(),
  name: z.string(),
  targetWorkspaceId: z.string().optional(),
});

export const refreshDatasetSchema = z.object({
  workspaceId: z.string(),
  datasetId: z.string(),
  notifyOption: z.string().optional(),
});

export const updateDatasetParametersSchema = z.object({
  workspaceId: z.string(),
  datasetId: z.string(),
  parameters: z.array(
    z.object({
      name: z.string(),
      newValue: z.string(),
    })
  ),
});

// unused schema placeholders removed to avoid TS errors
