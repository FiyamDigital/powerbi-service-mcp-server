import { z } from "zod";
import { powerbiClient } from "../../services/powerbiClient.js";

const workspaceIdSchema = z.object({ workspaceId: z.string() });

const createWorkspaceSchema = z.object({
  name: z.string(),
});

const listReportsSchema = z.object({
  workspaceId: z.string().optional(),
});

const cloneReportSchema = z.object({
  workspaceId: z.string(),
  reportId: z.string(),
  name: z.string(),
  targetWorkspaceId: z.string().optional(),
});

const refreshDatasetSchema = z.object({
  workspaceId: z.string(),
  datasetId: z.string(),
  notifyOption: z.string().optional(),
});

const updateDatasetParamsSchema = z.object({
  workspaceId: z.string(),
  datasetId: z.string(),
  parameters: z.array(
    z.object({
      name: z.string(),
      newValue: z.string(),
    })
  ),
});

export const powerbiTools = [
  {
    name: "listWorkspaces",
    description: "List all workspaces",
    inputSchema: z.object({}).strict(),
    handler: async () => {
      return await powerbiClient.listWorkspaces();
    },
  },
  {
    name: "getWorkspace",
    description: "Get workspace details",
    inputSchema: workspaceIdSchema,
    handler: async (input: z.infer<typeof workspaceIdSchema>) => {
      return await powerbiClient.getWorkspace(input.workspaceId);
    },
  },
  {
    name: "createWorkspace",
    description: "Create a new workspace",
    inputSchema: createWorkspaceSchema,
    handler: async (input: z.infer<typeof createWorkspaceSchema>) => {
      return await powerbiClient.createWorkspace(input.name);
    },
  },
  {
    name: "listReports",
    description: "List reports",
    inputSchema: listReportsSchema,
    handler: async (input: z.infer<typeof listReportsSchema>) => {
      return await powerbiClient.listReports(input.workspaceId);
    },
  },
  {
    name: "cloneReport",
    description: "Clone a report",
    inputSchema: cloneReportSchema,
    handler: async (input: z.infer<typeof cloneReportSchema>) => {
      return await powerbiClient.cloneReport(
        input.workspaceId,
        input.reportId,
        input.name,
        input.targetWorkspaceId
      );
    },
  },
  {
    name: "refreshDataset",
    description: "Refresh a dataset",
    inputSchema: refreshDatasetSchema,
    handler: async (input: z.infer<typeof refreshDatasetSchema>) => {
      return await powerbiClient.refreshDataset(
        input.workspaceId,
        input.datasetId,
        input.notifyOption
      );
    },
  },
  {
    name: "updateDatasetParameters",
    description: "Update dataset parameters",
    inputSchema: updateDatasetParamsSchema,
    handler: async (input: z.infer<typeof updateDatasetParamsSchema>) => {
      return await powerbiClient.updateDatasetParameters(
        input.workspaceId,
        input.datasetId,
        input.parameters
      );
    },
  },
];
