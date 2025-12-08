import fs from 'node:fs/promises';
import path from 'node:path';
import mime from 'mime';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestInfo } from '@modelcontextprotocol/sdk/types.js';
import { deriveSessionContext, assertLotInSessionRoots } from '../server/session.js';
import { FsListInputSchema, FsReadInputSchema, FsWriteInputSchema, FsDeleteInputSchema, FileUriSchema } from '../utils/validate.js';
import { fileUri, lotUri } from '../utils/uri.js';
import { PermissionDeniedError, NotFoundError } from '../utils/errors.js';
import { z } from 'zod';
import { resolveLotPath, sanitizeRelativePath } from './pathUtils.js';
import { ensureLotOwnership, formatToolResponse, toolError } from './toolUtils.js';

const FsListOutputSchema = z.object({
  entries: z.array(
    z.object({
      uri: z.string(),
      name: z.string(),
      isDir: z.boolean(),
      size: z.number().optional(),
      mimeType: z.string().optional(),
      modifiedAt: z.string().optional()
    })
  )
});

const FsReadOutputSchema = z.object({
  mimeType: z.string(),
  data: z.string()
});

const FsWriteOutputSchema = z.object({ success: z.boolean() });
const FsDeleteOutputSchema = z.object({ success: z.boolean() });
const FsMkdirInputSchema = z.object({ uri: FileUriSchema });

type FsListArgs = z.infer<typeof FsListInputSchema>;
type FsReadArgs = z.infer<typeof FsReadInputSchema>;
type FsWriteArgs = z.infer<typeof FsWriteInputSchema>;
type FsDeleteArgs = z.infer<typeof FsDeleteInputSchema>;
type FsMkdirArgs = z.infer<typeof FsMkdirInputSchema>;
type ToolExtra = { requestInfo?: RequestInfo };

export function registerFilesystemTools(server: McpServer): void {
  server.registerTool(
    'fs.list',
    {
      title: 'List files in a lot',
      inputSchema: FsListInputSchema,
      outputSchema: FsListOutputSchema
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as FsListArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        ensureLotOwnership(args.lotUri.userId, session.userId);
        const uri = lotUri(args.lotUri.userId, args.lotUri.lotId);
        assertLotInSessionRoots(uri, session);
        const relativePath = sanitizeRelativePath(args.path);
        const absolutePath = resolveLotPath(args.lotUri.userId, args.lotUri.lotId, relativePath);
        await fs.access(absolutePath).catch(() => { throw new NotFoundError('Path not found.'); });
        const dirEntries = await fs.readdir(absolutePath, { withFileTypes: true });
        const entries = await Promise.all(
          dirEntries.map(async entry => {
            const entryPath = path.join(absolutePath, entry.name);
            const stats = await fs.stat(entryPath);
            const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            return {
              uri: entry.isDirectory()
                ? `${fileUri(args.lotUri.userId, args.lotUri.lotId, entryRelativePath)}/`
                : fileUri(args.lotUri.userId, args.lotUri.lotId, entryRelativePath),
              name: entry.name,
              isDir: entry.isDirectory(),
              size: entry.isDirectory() ? undefined : stats.size,
              mimeType: entry.isDirectory() ? 'inode/directory' : mime.getType(entry.name) ?? 'application/octet-stream',
              modifiedAt: stats.mtime.toISOString()
            };
          })
        );
        return formatToolResponse({ entries });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'fs.read',
    {
      title: 'Read a file within a lot',
      inputSchema: FsReadInputSchema,
      outputSchema: FsReadOutputSchema
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as FsReadArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        ensureLotOwnership(args.uri.userId, session.userId);
        const lotUriValue = lotUri(args.uri.userId, args.uri.lotId);
        assertLotInSessionRoots(lotUriValue, session);
        const absolutePath = resolveLotPath(args.uri.userId, args.uri.lotId, args.uri.path);
        const buffer = await fs.readFile(absolutePath);
        const mimeType = mime.getType(absolutePath) ?? 'application/octet-stream';
        const data = args.asBase64 ? buffer.toString('base64') : buffer.toString('utf-8');
        return formatToolResponse({ mimeType, data });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'fs.write',
    {
      title: 'Write to a file within a lot',
      inputSchema: FsWriteInputSchema,
      outputSchema: FsWriteOutputSchema
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as FsWriteArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        ensureLotOwnership(args.uri.userId, session.userId);
        const lotUriValue = lotUri(args.uri.userId, args.uri.lotId);
        assertLotInSessionRoots(lotUriValue, session);
        const absolutePath = resolveLotPath(args.uri.userId, args.uri.lotId, args.uri.path);
        const dir = path.dirname(absolutePath);
        await fs.mkdir(dir, { recursive: true });
        if (!args.overwrite) {
          const exists = await fileExists(absolutePath);
          if (exists) {
            throw new PermissionDeniedError('File exists. Set overwrite=true to replace it.');
          }
        }
        await fs.writeFile(absolutePath, args.data, 'utf-8');
        return formatToolResponse({ success: true });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'fs.delete',
    {
      title: 'Delete a file or directory',
      inputSchema: FsDeleteInputSchema,
      outputSchema: FsDeleteOutputSchema
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as FsDeleteArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        ensureLotOwnership(args.uri.userId, session.userId);
        const lotUriValue = lotUri(args.uri.userId, args.uri.lotId);
        assertLotInSessionRoots(lotUriValue, session);
        const absolutePath = resolveLotPath(args.uri.userId, args.uri.lotId, args.uri.path);
        const stats = await fs.stat(absolutePath).catch(() => {
          throw new NotFoundError('Path not found.');
        });
        if (stats.isDirectory() && !args.recursive) {
          const contents = await fs.readdir(absolutePath);
          if (contents.length) {
            throw new PermissionDeniedError('Directory is not empty. Set recursive=true to delete it.');
          }
        }
        await fs.rm(absolutePath, { recursive: args.recursive ?? false, force: false });
        return formatToolResponse({ success: true });
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    'fs.mkdir',
    {
      title: 'Create a directory within a lot',
      inputSchema: FsMkdirInputSchema,
      outputSchema: FsWriteOutputSchema
    },
    async (rawArgs, extra: ToolExtra) => {
      try {
        const args = rawArgs as FsMkdirArgs;
        const session = deriveSessionContext({ requestInfo: extra?.requestInfo, clientCapabilities: server.server.getClientCapabilities() });
        ensureLotOwnership(args.uri.userId, session.userId);
        const lotUriValue = lotUri(args.uri.userId, args.uri.lotId);
        assertLotInSessionRoots(lotUriValue, session);
        const absolutePath = resolveLotPath(args.uri.userId, args.uri.lotId, args.uri.path);
        await fs.mkdir(absolutePath, { recursive: true });
        return formatToolResponse({ success: true });
      } catch (error) {
        return toolError(error);
      }
    }
  );
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
