import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors, { type FastifyCorsOptions } from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface HttpServerConfig {
  port?: number;
  host?: string;
  enableJsonResponse?: boolean;
  allowedOrigins?: string[];
  allowedHosts?: string[];
  cors?: boolean | FastifyCorsOptions;
  enableSessions?: boolean;
}

export async function startHttpServer(mcpServer: McpServer, config: HttpServerConfig = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info'
    }
  });

  const enableCors = config.cors ?? true;
  if (enableCors) {
    await fastify.register(cors, typeof enableCors === 'object' ? enableCors : { origin: true });
  }

  fastify.get('/healthz', async () => ({ status: 'ok' }));

  const enableSessions = config.enableSessions ?? false;
  const handleMcp = createMcpHandler(mcpServer, { ...config, enableSessions }, enableCors);
  fastify.route({
    method: ['POST', 'GET'],
    url: '/mcp',
    handler: handleMcp
  });

  const port = config.port ?? Number(process.env.PORT ?? 4000);
  const host = config.host ?? process.env.HOST ?? '0.0.0.0';
  await fastify.listen({ port, host });
  fastify.log.info({ port, host }, 'LotOS MCP server listening');
  return fastify;
}

function createMcpHandler(
  mcpServer: McpServer,
  config: HttpServerConfig,
  corsEnabled: boolean | FastifyCorsOptions
) {
  return async (request: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    reply.hijack();
    applyCorsHeaders(request, reply, corsEnabled);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: config.enableSessions ? () => randomUUID() : undefined,
      enableJsonResponse: config.enableJsonResponse ?? true,
      allowedHosts: config.allowedHosts,
      allowedOrigins: config.allowedOrigins,
      enableDnsRebindingProtection: Boolean(config.allowedHosts?.length || config.allowedOrigins?.length)
    });

    transport.onerror = error => {
      request.log.error({ err: error }, 'Transport error');
    };

    transport.onclose = () => {
      request.log.debug('Transport closed');
    };

    try {
      await mcpServer.connect(transport);
      const body = request.method === 'POST' ? request.body : undefined;
      await transport.handleRequest(request.raw, reply.raw, body);
    } catch (error) {
      request.log.error({ err: error }, 'Unhandled MCP error');
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { 'content-type': 'application/json' });
        reply.raw.end(JSON.stringify({ error: 'Internal MCP server error' }));
      } else {
        reply.raw.end();
      }
    }
  };
}

function applyCorsHeaders(
  request: FastifyRequest,
  reply: FastifyReply,
  corsEnabled: boolean | FastifyCorsOptions
) {
  if (!corsEnabled) {
    return;
  }
  const originHeader = request.headers.origin;
  if (!originHeader) {
    return;
  }
  reply.raw.setHeader('Access-Control-Allow-Origin', originHeader);
  reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
  reply.raw.setHeader('Vary', 'Origin');
}
