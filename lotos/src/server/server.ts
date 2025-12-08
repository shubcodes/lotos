import 'dotenv/config';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import pkg from '../../package.json' with { type: 'json' };
import { createServerOptions } from './capabilities.js';
import { startHttpServer } from './httpTransport.js';
import { registerSandboxTools } from '../tools/sandboxes.js';
import { registerFilesystemTools } from '../tools/fsTools.js';
import { registerRuntimeTools } from '../tools/runtime.js';
import { registerAdvancedTools } from '../tools/advanced.js';
import { registerArcadeTools } from '../tools/arcade.js';
import { registerLotResources } from '../resources/lotResource.js';
import { registerFileResources } from '../resources/fileResource.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export async function bootstrap(): Promise<void> {
  const server = new McpServer(
    {
      name: 'lotos',
      version: pkg.version as string
    },
    createServerOptions({
      instructions: 'LotOS – Multi-Lot MCP Sandbox Server'
    })
  );

  await registerCoreModules(server);

  const fastify = await startHttpServer(server, {
    enableJsonResponse: true,
    allowedOrigins: parseCsvList(process.env.ALLOWED_ORIGINS),
    allowedHosts: parseCsvList(process.env.ALLOWED_HOSTS),
    enableSessions: parseBoolean(process.env.ENABLE_MCP_SESSIONS ?? 'false')
  });

  const shutdown = async (signal: NodeJS.Signals | 'unknown') => {
    logger.info({ signal }, 'Shutting down LotOS');
    await fastify.close();
    await server.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

async function registerCoreModules(server: McpServer): Promise<void> {
  registerSandboxTools(server);
  registerFilesystemTools(server);
  registerRuntimeTools(server);
  registerAdvancedTools(server);
  registerArcadeTools(server);
  registerLotResources(server);
  registerFileResources(server);
}

const isDirectExecution = (() => {
  if (!process.argv[1]) {
    return false;
  }
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(process.argv[1]) === thisFile;
})();

if (isDirectExecution) {
  bootstrap().catch(error => {
    logger.error({ err: error }, 'Failed to start LotOS');
    process.exit(1);
  });
}

function parseCsvList(input?: string | null): string[] | undefined {
  if (!input) {
    return undefined;
  }
  const values = input
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}
