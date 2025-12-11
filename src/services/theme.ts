import { merge } from 'lodash-es';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';
import { fileExists, readJsonFile, writeJsonFile } from '../utils/fsx.js';

export interface ThemeOptions {
  projectDir: string;
  theme: Record<string, unknown> | string;
  strategy?: 'replace' | 'merge';
}

export interface ApplyThemeResult {
  ok: boolean;
  filesModified: string[];
}

export class ThemeService {
  /**
   * Apply theme to a Power BI project
   */
  async applyTheme(options: ThemeOptions): Promise<ApplyThemeResult> {
    const { projectDir, theme, strategy = 'merge' } = options;

    logger.info('Applying theme to project', { projectDir, strategy });

    // Parse theme
    const themeData = await this.parseTheme(theme);

    // Validate theme structure
    this.validateTheme(themeData);

    // Find report definition files
    const reportFiles = await this.findReportDefinitions(projectDir);

    if (reportFiles.length === 0) {
      throw new ValidationError('No report definition files found in project');
    }

    const filesModified: string[] = [];

    // Apply theme to each report file
    for (const reportFile of reportFiles) {
      try {
        await this.applyThemeToFile(reportFile, themeData, strategy);
        filesModified.push(reportFile);
        logger.info('Theme applied to file', { file: reportFile });
      } catch (error) {
        logger.error('Failed to apply theme to file', { file: reportFile, error });
        throw error;
      }
    }

    logger.info('Theme application completed', { filesModified: filesModified.length });

    return {
      ok: true,
      filesModified,
    };
  }

  /**
   * Parse theme from string or object
   */
  private async parseTheme(
    theme: Record<string, unknown> | string
  ): Promise<Record<string, unknown>> {
    if (typeof theme === 'string') {
      // Check if it's a file path
      if (await fileExists(theme)) {
        logger.debug('Loading theme from file', { path: theme });
        return await readJsonFile<Record<string, unknown>>(theme);
      }
      // Try to parse as JSON string
      try {
        return JSON.parse(theme) as Record<string, unknown>;
      } catch {
        throw new ValidationError('Invalid theme: must be valid JSON or file path');
      }
    }
    return theme;
  }

  /**
   * Validate theme structure
   */
  private validateTheme(theme: Record<string, unknown>): void {
    if (Object.keys(theme).length === 0) {
      throw new ValidationError('Theme is empty');
    }
    logger.debug('Theme validation passed', { keys: Object.keys(theme) });
  }

  /**
   * Find all report definition files in project
   */
  private async findReportDefinitions(projectDir: string): Promise<string[]> {
    const reportFiles: string[] = [];

    const searchPaths = [
      path.join(projectDir, 'Report', 'definition.pbir'),
      path.join(projectDir, 'report.json'),
      path.join(projectDir, '.pbi', 'report.json'),
    ];

    for (const searchPath of searchPaths) {
      if (await fileExists(searchPath)) {
        reportFiles.push(searchPath);
      }
    }

    try {
      const pbirs = await this.findFilesByExtension(projectDir, '.pbir');
      reportFiles.push(...pbirs);
    } catch (error) {
      logger.warn('Failed to search for .pbir files', { error });
    }

    return [...new Set(reportFiles)];
  }

  /**
   * Find files by extension recursively
   */
  private async findFilesByExtension(dir: string, extension: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    }

    await walk(dir);
    return files;
  }

  /**
   * Apply theme to a specific report file
   */
  private async applyThemeToFile(
    filePath: string,
    theme: Record<string, unknown>,
    strategy: 'replace' | 'merge'
  ): Promise<void> {
    const report = await readJsonFile<Record<string, unknown>>(filePath);

    let updatedReport: Record<string, unknown>;

    if (strategy === 'replace') {
      updatedReport = { ...report, theme: theme };
    } else {
      const existingTheme = (report.theme as Record<string, unknown>) || {};
      updatedReport = { ...report, theme: merge({}, existingTheme, theme) };
    }

    await writeJsonFile(filePath, updatedReport);
  }

  /**
   * Extract theme from a report file
   */
  async extractTheme(reportFilePath: string): Promise<Record<string, unknown>> {
    if (!(await fileExists(reportFilePath))) {
      throw new ValidationError(`Report file not found: ${reportFilePath}`);
    }

    const report = await readJsonFile<Record<string, unknown>>(reportFilePath);

    if (!report.theme) {
      logger.warn('No theme found in report file', { file: reportFilePath });
      return {};
    }

    return report.theme as Record<string, unknown>;
  }
}

export const themeService = new ThemeService();
