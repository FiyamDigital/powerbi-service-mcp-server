import { z } from "zod";
import { pbiToolsService } from "../../services/pbiTools.js";
import { themeService } from "../../services/theme.js";

// Define schemas outside of the tool objects
const decompileSchema = z.object({
  filePath: z.string(),
  outDir: z.string().optional(),
  modelOnly: z.boolean().optional(),
});

const recompileSchema = z.object({
  projectDir: z.string(),
  outPath: z.string().optional(),
  format: z.enum(["PBIX", "PBIT"]),
});

const applyThemeSchema = z.object({
  projectDir: z.string(),
  theme: z.union([z.string(), z.record(z.any())]),
  strategy: z.enum(["replace", "merge"]).optional(),
});

const extractThemeSchema = z.object({
  reportFilePath: z.string(),
});

const emptySchema = z.object({}).strict();

export const pbixTools = [
  {
    name: "decompilePbix",
    description: "Decompile PBIX/PBIT to a project directory",
    inputSchema: decompileSchema,
    handler: async (input: z.infer<typeof decompileSchema>) => {
      const result = await pbiToolsService.extract(input);
      return { success: true, projectDir: result };
    },
  },
  {
    name: "recompilePbix",
    description: "Recompile project to PBIX/PBIT",
    inputSchema: recompileSchema,
    handler: async (input: z.infer<typeof recompileSchema>) => {
      const out = await pbiToolsService.compile(input);
      return { success: true, outFile: out };
    },
  },
  {
    name: "applyThemeToProject",
    description: "Apply theme JSON to PBIX project",
    inputSchema: applyThemeSchema,
    handler: async (input: z.infer<typeof applyThemeSchema>) => {
      return await themeService.applyTheme(input);
    },
  },
  {
    name: "extractThemeFromReport",
    description: "Extract theme JSON from PBIX/PBIT",
    inputSchema: extractThemeSchema,
    handler: async (input: z.infer<typeof extractThemeSchema>) => {
      const theme = await themeService.extractTheme(input.reportFilePath);
      return { success: true, theme };
    },
  },
  {
    name: "checkPbiTools",
    description: "Check if pbi-tools is installed",
    inputSchema: emptySchema,
    handler: async () => {
      const available = await pbiToolsService.checkAvailability();
      const info = available ? await pbiToolsService.getInfo() : null;

      return { success: available, available, info };
    },
  },
];
