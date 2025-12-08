import fs from 'node:fs/promises';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestInfo } from '@modelcontextprotocol/sdk/types.js';
import mime from 'mime';
import { deriveSessionContext, assertLotInSessionRoots } from '../server/session.js';
import { parseFileUri } from '../utils/uri.js';
import { ensureLotOwnership } from '../tools/toolUtils.js';
import { resolveLotPath } from '../tools/pathUtils.js';

const FileResourceMetadata = {
  title: 'Lot filesystem entries',
  description: 'Reads individual files exposed via lot:// URIs.'
};

type ResourceExtra = { requestInfo?: RequestInfo };

export function registerFileResources(server: McpServer): void {
  const template = new ResourceTemplate('lot://{userId}/{lotId}/fs/{+path}', {
    list: async () => ({ resources: [] })
  });

  server.registerResource('lot-file', template, FileResourceMetadata, async (uri, _variables, extra: ResourceExtra) => {
    const fileInfo = parseFileUri(uri.href);
    const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
    ensureLotOwnership(fileInfo.userId, session.userId);
    const lotUriValue = `lot://${fileInfo.userId}/${fileInfo.lotId}`;
    assertLotInSessionRoots(lotUriValue, session);
    const absolutePath = resolveLotPath(fileInfo.userId, fileInfo.lotId, fileInfo.path);
    const buffer = await fs.readFile(absolutePath);
    const mimeType = mime.getType(absolutePath) ?? 'application/octet-stream';
    const content = toResourceContent(uri.href, buffer, mimeType);
    return { contents: [content] };
  });
}

function toResourceContent(uri: string, buffer: Buffer, mimeType: string) {
  const text = buffer.toString('utf-8');
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json';
  if (isText) {
    return {
      uri,
      mimeType,
      text
    };
  }
  return {
    uri,
    mimeType,
    blob: buffer.toString('base64')
  };
}
