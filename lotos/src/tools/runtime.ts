import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestInfo } from '@modelcontextprotocol/sdk/types.js';
import { deriveSessionContext, assertLotInSessionRoots } from '../server/session.js';
import { RuntimeExecInputSchema } from '../utils/validate.js';
import { lotUri } from '../utils/uri.js';
import { resolveLotPath } from './pathUtils.js';
import { ensureLotOwnership, formatToolResponse, toolError } from './toolUtils.js';
import { PermissionDeniedError } from '../utils/errors.js';
import { z } from 'zod';

const RuntimeExecOutputSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  durationMs: z.number()
});

type RuntimeExecArgs = z.infer<typeof RuntimeExecInputSchema>;
type ToolExtra = { requestInfo?: RequestInfo };

const PYTHON_BIN = process.env.LOTOS_PYTHON_BIN ?? 'python3';
const EXEC_TIMEOUT_MS = Number(process.env.RUNTIME_TIMEOUT_MS ?? '60000');

export function registerRuntimeTools(server: McpServer): void {
  server.registerTool(
    'runtime.exec',
    {
      title: 'Execute code inside a lot runtime',
      description: 'Runs Python code using a local child process (development stub).',
      inputSchema: RuntimeExecInputSchema,
      outputSchema: RuntimeExecOutputSchema
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as RuntimeExecArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        ensureLotOwnership(args.lotUri.userId, session.userId);
        const lotUriValue = lotUri(args.lotUri.userId, args.lotUri.lotId);
        assertLotInSessionRoots(lotUriValue, session);
        const cwd = resolveLotPath(args.lotUri.userId, args.lotUri.lotId, args.cwd ?? '.');
        const result = await executeLocalPython(args.code, cwd);
        return formatToolResponse(result);
      } catch (error) {
        return toolError(error);
      }
    }
  );
}

export async function executeLocalPython(code: string, cwd: string) {
  const controller = new AbortController();
  const child = spawn(PYTHON_BIN, ['-c', code], {
    cwd,
    env: {
      ...process.env,
      LOTOS_RUNTIME: 'local'
    },
    signal: controller.signal
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout?.on('data', chunk => stdoutChunks.push(Buffer.from(chunk)));
  child.stderr?.on('data', chunk => stderrChunks.push(Buffer.from(chunk)));

  let timedOut = false;
  const start = performance.now();
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, EXEC_TIMEOUT_MS);

  const [exitCode] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];
  clearTimeout(timeout);

  if (timedOut) {
    throw new PermissionDeniedError('Execution timed out.');
  }

  return {
    stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
    stderr: Buffer.concat(stderrChunks).toString('utf-8'),
    exitCode: exitCode ?? -1,
    durationMs: Math.round(performance.now() - start)
  };
}
