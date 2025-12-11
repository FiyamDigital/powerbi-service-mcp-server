import { validateEnv } from './utils/env.js';
import { logger } from './utils/logger.js';
import { MCPServer } from './mcp/server.js';
import { createHTTPServer } from './server.js';

async function main() {
  try {
    validateEnv();

    const args = process.argv.slice(2);
    const modeArg = args.find((arg) => arg.startsWith('--mode='));
    const mode = modeArg ? modeArg.split('=')[1] : 'mcp';

    logger.info('Starting powerbi-mcp-server', { mode });

    if (mode === 'api') {
      const server = await createHTTPServer();
      await server.listen({
        port: Number(process.env.PORT) || 3000,
        host: '0.0.0.0',
      });
    } else {
      const mcp = new MCPServer();
      await mcp.start();
    }
  } catch (error) {
    logger.error('Startup failed', { error });
    process.exit(1);
  }
}

main();
