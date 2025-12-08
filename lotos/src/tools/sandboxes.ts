import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestInfo } from '@modelcontextprotocol/sdk/types.js';
import { deriveSessionContext, assertLotInSessionRoots } from '../server/session.js';
import { CreateLotInputSchema, LotUriSchema } from '../utils/validate.js';
import { lotUri } from '../utils/uri.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { lotDirectory } from './storagePaths.js';
import { ensureLotOwnership, formatToolResponse, toolError } from './toolUtils.js';
import { saveLotRecord, listLots as listStoredLots, getLotRecord, deleteLotRecord, type LotRecord } from './lotRegistry.js';

type ToolExtra = { requestInfo?: RequestInfo };

const LotMetadataSchema = z.object({
  id: z.string(),
  lotId: z.string(),
  uri: z.string(),
  title: z.string().optional(),
  kind: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

type LotMetadata = z.infer<typeof LotMetadataSchema>;

const DeleteLotInputSchema = z.object({
  lotUri: LotUriSchema
});

type CreateLotArgs = z.infer<typeof CreateLotInputSchema>;
type DeleteLotArgs = z.infer<typeof DeleteLotInputSchema>;

export function registerSandboxTools(server: McpServer): void {
  server.registerTool(
    'sandboxes.create_lot',
    {
      title: 'Create a new lot',
      description: 'Creates a persistent sandbox lot for the current user.',
      inputSchema: CreateLotInputSchema,
      outputSchema: z.object({ lot: LotMetadataSchema })
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as CreateLotArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        const lotId = args.id ?? generateLotId();
        ensureLotIdAvailable(session.userId, lotId);
        const record = createLotRecord(session.userId, {
          lotId,
          title: args.title,
          kind: args.kind
        });
        await ensureLotFilesystem(session.userId, lotId);
        const metadata = toMetadata(session.userId, record);
        return formatToolResponse({ lot: metadata });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'sandboxes.list_lots',
    {
      title: 'List lots',
      description: 'Lists all lots that belong to the current user.',
      outputSchema: z.object({ lots: z.array(LotMetadataSchema) })
    },
    async (_rawArgs: unknown, extra: ToolExtra) => {
      try {
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        const records = listStoredLots(session.userId);
        const lots = records
          .map(record => toMetadata(session.userId, record))
          .filter(metadata => (session.roots ? session.roots.includes(metadata.uri) : true));
        return formatToolResponse({ lots });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'sandboxes.delete_lot',
    {
      title: 'Delete lot',
      description: 'Deletes a lot and its filesystem contents.',
      inputSchema: DeleteLotInputSchema,
      outputSchema: z.object({ success: z.boolean() })
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as DeleteLotArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        const lotInfo = args.lotUri;
        ensureLotOwnership(lotInfo.userId, session.userId);
        const lot = requireLot(session.userId, lotInfo.lotId);
        const uri = lotUri(session.userId, lot.lotId);
        assertLotInSessionRoots(uri, session);
        removeLot(session.userId, lot.lotId);
        await removeLotFilesystem(session.userId, lot.lotId);
        return formatToolResponse({ success: true });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}

function ensureLotIdAvailable(userId: string, lotId: string): void {
  if (getLotRecord(userId, lotId)) {
    throw new ConflictError(`Lot '${lotId}' already exists.`);
  }
}

function createLotRecord(userId: string, input: { lotId: string; title?: string; kind?: string }): LotRecord {
  const now = new Date().toISOString();
  const record: LotRecord = {
    userId,
    lotId: input.lotId,
    title: input.title,
    kind: input.kind,
    createdAt: now,
    updatedAt: now
  };
  saveLotRecord(record);
  return record;
}

function requireLot(userId: string, lotId: string): LotRecord {
  const lot = getLotRecord(userId, lotId);
  if (!lot) {
    throw new NotFoundError(`Lot '${lotId}' not found.`);
  }
  return lot;
}

function removeLot(userId: string, lotId: string): void {
  const deleted = deleteLotRecord(userId, lotId);
  if (!deleted) {
    throw new NotFoundError(`Lot '${lotId}' not found.`);
  }
}

async function ensureLotFilesystem(userId: string, lotId: string): Promise<void> {
  const dir = lotDirectory(userId, lotId);
  await fs.mkdir(dir, { recursive: true });
}

async function removeLotFilesystem(userId: string, lotId: string): Promise<void> {
  const dir = lotDirectory(userId, lotId);
  await fs.rm(dir, { recursive: true, force: true });
}

function toMetadata(userId: string, record: LotRecord): LotMetadata {
  const uri = lotUri(userId, record.lotId);
  return {
    id: record.lotId,
    lotId: record.lotId,
    uri,
    title: record.title,
    kind: record.kind,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function generateLotId(): string {
  return `lot-${randomUUID().slice(0, 8)}`;
}
