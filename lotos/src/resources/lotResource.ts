import fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestInfo } from '@modelcontextprotocol/sdk/types.js';
import { deriveSessionContext, assertLotInSessionRoots } from '../server/session.js';
import { listLots as listStoredLots, getLotRecord } from '../tools/lotRegistry.js';
import { lotUri, parseLotUri } from '../utils/uri.js';
import { lotDirectory } from '../tools/storagePaths.js';
import { ensureLotOwnership } from '../tools/toolUtils.js';
import { NotFoundError } from '../utils/errors.js';

const LotResourceMetadata = {
  title: 'Lot metadata',
  description: 'Summaries of lot metadata and root filesystem entries.'
};

type ResourceExtra = { requestInfo?: RequestInfo };

type LotSummary = {
  lot: {
    userId: string;
    lotId: string;
    title?: string;
    kind?: string;
    createdAt: string;
    updatedAt: string;
  };
  files: Array<{
    name: string;
    isDir: boolean;
    size?: number;
    modifiedAt?: string;
  }>;
};

export function registerLotResources(server: McpServer): void {
  const template = new ResourceTemplate('lot://{userId}/{lotId}', {
    list: async extra => {
      const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
      const lots = listStoredLots(session.userId)
        .map(record => toLotMetadata(session.userId, record))
        .filter(metadata => (session.roots ? session.roots.includes(metadata.uri) : true));
      return {
        resources: lots.map(lot => ({
          uri: lot.uri,
          name: lot.title ?? lot.lotId,
          description: lot.kind,
          mimeType: 'application/json'
        }))
      };
    }
  });

  server.registerResource('lot-summary', template, LotResourceMetadata, async (uri, _variables, extra: ResourceExtra) => {
    const { userId, lotId } = parseLotUri(uri.href);
    const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
    ensureLotOwnership(userId, session.userId);
    const lot = getLotRecord(userId, lotId);
    if (!lot) {
      throw new NotFoundError(`Lot '${lotId}' not found.`);
    }
    const lotUriValue = lotUri(userId, lotId);
    assertLotInSessionRoots(lotUriValue, session);
    const summary = await buildLotSummary(lot);
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(summary, null, 2)
        }
      ]
    };
  });
}

async function buildLotSummary(lot: { userId: string; lotId: string; title?: string; kind?: string; createdAt: string; updatedAt: string }): Promise<LotSummary> {
  const directory = lotDirectory(lot.userId, lot.lotId);
  const entries = await fs
    .readdir(directory, { withFileTypes: true })
    .then(items => Promise.all(items.map(entry => describeEntry(directory, entry))))
    .catch(() => []);

  return {
    lot: {
      userId: lot.userId,
      lotId: lot.lotId,
      title: lot.title,
      kind: lot.kind,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt
    },
    files: entries
  };
}

async function describeEntry(root: string, entry: Dirent): Promise<LotSummary['files'][number]> {
  const fullPath = path.join(root, entry.name);
  const stats = await fs.stat(fullPath).catch(() => undefined);
  return {
    name: entry.name,
    isDir: entry.isDirectory(),
    size: stats && !entry.isDirectory() ? stats.size : undefined,
    modifiedAt: stats ? stats.mtime.toISOString() : undefined
  };
}

function toLotMetadata(userId: string, record: { lotId: string; title?: string; kind?: string; createdAt: string; updatedAt: string }) {
  return {
    uri: lotUri(userId, record.lotId),
    lotId: record.lotId,
    title: record.title,
    kind: record.kind,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}
