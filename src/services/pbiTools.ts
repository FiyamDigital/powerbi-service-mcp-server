import { spawn } from 'child_process';
import path from 'path';
import { env } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { PBIToolsError } from '../utils/errors.js';
import { ensureDir, fileExists, getTempDir } from '../utils/fsx.js';

export interface ExtractOptions {
  filePath: string;
  outDir?: string;
  modelOnly?: boolean;
}

export interface CompileOptions {
  projectDir: string;
  outPath?: string;
  format?: 'PBIX' | 'PBIT';
}

export class PBIToolsService {
  private pbiToolsPath: string;

  constructor() {
    this.pbiToolsPath = env.PBI_TOOLS_PATH;
  }

  /**
   * Check if pbi-tools is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      await this.execute(['info']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract PBIX/PBIT to project folder
   */
  async extract(options: ExtractOptions): Promise<string> {
    const { filePath, outDir, modelOnly } = options;

    // Validate input file
    if (!(await fileExists(filePath))) {
      throw new PBIToolsError(`File not found: ${filePath}`);
    }

    // Generate output directory
    const outputDir = outDir || getTempDir('extract');
    await ensureDir(outputDir);

    logger.info('Extracting PBIX with pbi-tools', { filePath, outputDir });

    const args = ['extract', filePath, '-extractFolder', outputDir];
    if (modelOnly) {
      args.push('-modelOnly');
    }

    try {
      await this.execute(args);
      logger.info('Extraction completed', { outputDir });
      return outputDir;
    } catch (error) {
      throw new PBIToolsError('Failed to extract PBIX', error);
    }
  }

  /**
   * Compile project folder to PBIX/PBIT
   */
  async compile(options: CompileOptions): Promise<string> {
    const { projectDir, outPath, format = 'PBIX' } = options;

    // Validate project directory
    if (!(await fileExists(projectDir))) {
      throw new PBIToolsError(`Project directory not found: ${projectDir}`);
    }

    // Generate output path
    const outputPath = outPath || path.join(getTempDir('compile'), `output.${format.toLowerCase()}`);
    await ensureDir(path.dirname(outputPath));

    logger.info('Compiling project with pbi-tools', { projectDir, outputPath, format });

    const args = ['compile', projectDir, '-outPath', outputPath, '-format', format];

    try {
      await this.execute(args);

      // Check if output file was created
      if (!(await fileExists(outputPath))) {
        throw new PBIToolsError('Output file was not created');
      }

      logger.info('Compilation completed', { outputPath });
      return outputPath;
    } catch (error) {
      throw new PBIToolsError('Failed to compile project', error);
    }
  }

  /**
   * Get pbi-tools info
   */
  async getInfo(): Promise<string> {
    try {
      return await this.execute(['info']);
    } catch (error) {
      throw new PBIToolsError('Failed to get pbi-tools info', error);
    }
  }

  /**
   * Execute pbi-tools command
   */
  private execute(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      logger.debug('Executing pbi-tools', { command: this.pbiToolsPath, args });

      const child = spawn(this.pbiToolsPath, args, {
        shell: true,
        env: process.env,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        logger.debug('pbi-tools stdout', { text: text.trim() });
      });

      child.stderr?.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        logger.debug('pbi-tools stderr', { text: text.trim() });
      });

      child.on('error', (error) => {
        logger.error('pbi-tools process error', { error });
        reject(new PBIToolsError(`Failed to spawn pbi-tools: ${error.message}`));
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const errorMsg = stderr || stdout || `Process exited with code ${code}`;
          logger.error('pbi-tools failed', { code, stderr, stdout });
          reject(new PBIToolsError(errorMsg));
        }
      });
    });
  }
}

export const pbiToolsService = new PBIToolsService();
