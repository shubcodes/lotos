import type { ClientCapabilities, RequestInfo } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export const SESSION_USER_HEADER = 'x-lotos-user-id';
export const SESSION_ROOTS_HEADER = 'x-lotos-roots';

type HeaderValue = string | string[] | undefined;

export interface SessionContext {
  userId: string;
  roots: string[] | null;
  samplingSupported: boolean;
  elicitationSupported: boolean;
}

export function deriveSessionContext({
  requestInfo,
  clientCapabilities
}: {
  requestInfo?: RequestInfo;
  clientCapabilities?: ClientCapabilities;
}): SessionContext {
  const headers = requestInfo?.headers ?? {};
  const userId = normalizeHeaderValue(headers[SESSION_USER_HEADER]) ?? 'localhost';
  const rootsHeader = normalizeHeaderValue(headers[SESSION_ROOTS_HEADER]);
  const roots = rootsHeader ? parseRoots(rootsHeader) : null;

  return {
    userId,
    roots,
    samplingSupported: Boolean(clientCapabilities?.sampling),
    elicitationSupported: Boolean(clientCapabilities?.elicitation)
  };
}

export function assertLotInSessionRoots(lotUri: string, context: SessionContext): void {
  if (!context.roots) {
    return;
  }
  if (!context.roots.includes(lotUri)) {
    throw new McpError(ErrorCode.InvalidParams, `Lot ${lotUri} is not included in the active session roots.`);
  }
}

function normalizeHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseRoots(value: string): string[] {
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);
}
