import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from '../utils/logger.js';
import { powerbiTools } from './tools/powerbi.js';
import { pbixTools } from './tools/pbix.js';

export class MCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'powerbi-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // list tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const all = [...powerbiTools, ...pbixTools];

      return {
        tools: all.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };
    });

    // execute tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = [...powerbiTools, ...pbixTools].find((t) => t.name === name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);

      try {
        const result = await tool.handler((args || {}) as any);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Tool execution failed', { name, error });

        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Server started via stdio');
  }
}
