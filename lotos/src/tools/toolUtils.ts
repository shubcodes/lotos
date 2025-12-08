import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { PermissionDeniedError, toMcpError } from '../utils/errors.js';

export function ensureLotOwnership(requestUserId: string, sessionUserId: string): void {
  if (requestUserId !== sessionUserId) {
    throw new PermissionDeniedError('Cannot access lots owned by another user.');
  }
}

export function formatToolResponse<T>(structuredContent: T) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(structuredContent, null, 2)
      }
    ],
    structuredContent
  };
}

export function toolError(error: unknown) {
  if (error instanceof McpError) {
    return { content: [{ type: 'text' as const, text: error.message }], isError: true as const };
  }
  const mcpError = toMcpError(error);
  return { content: [{ type: 'text' as const, text: mcpError.message }], isError: true as const };
}
