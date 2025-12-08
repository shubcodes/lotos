import { z } from 'zod';
import { InvalidUriError } from './errors.js';

export interface LotUriParts {
  userId: string;
  lotId: string;
}

export interface LotFileUriParts extends LotUriParts {
  path: string;
}

const UserIdSchema = z
  .string()
  .min(1, 'User ID is required.')
  .refine(
    value => {
      if (value === 'localhost') {
        return true;
      }
      return z.string().uuid().safeParse(value).success;
    },
    { message: 'User ID must be a UUID or localhost.' }
  );
const LotIdSchema = z
  .string()
  .min(1, 'Lot ID is required.')
  .max(128, 'Lot ID is too long.')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Lot ID may contain letters, numbers, dot, dash, and underscore.');

const FilePathSchema = z
  .string()
  .refine(value => !value.split('/').some(segment => segment === '..'), 'File path cannot traverse upwards.')
  .refine(value => !value.startsWith('/'), 'File path must be relative to the lot root.');

export function parseLotUri(uri: string): LotUriParts {
  const url = toLotUrl(uri);
  const lotId = firstPathSegment(url);
  if (!lotId) {
    throw new InvalidUriError(uri, 'Lot URI must include a lot identifier.');
  }
  return {
    userId: UserIdSchema.parse(url.hostname),
    lotId: LotIdSchema.parse(decodeURIComponent(lotId))
  };
}

export function parseFileUri(uri: string): LotFileUriParts {
  const url = toLotUrl(uri);
  const [lotId, fsSegment, ...rest] = url.pathname.split('/').filter(Boolean);
  if (!lotId || fsSegment !== 'fs') {
    throw new InvalidUriError(uri, "File URI must include '/fs/' segment.");
  }
  const relativePath = rest.length ? rest.map(segment => decodeURIComponent(segment)).join('/') : '';
  return {
    userId: UserIdSchema.parse(url.hostname),
    lotId: LotIdSchema.parse(decodeURIComponent(lotId)),
    path: FilePathSchema.parse(relativePath)
  };
}

export function lotUri(userId: string, lotId: string): string {
  return `lot://${encodeURIComponent(UserIdSchema.parse(userId))}/${encodeURIComponent(LotIdSchema.parse(lotId))}`;
}

export function fileUri(userId: string, lotId: string, path: string): string {
  const cleanedPath = FilePathSchema.parse(path);
  const encodedPath = cleanedPath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  const base = `${lotUri(userId, lotId)}/fs`;
  return encodedPath ? `${base}/${encodedPath}` : `${base}/`;
}

function toLotUrl(uri: string): URL {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol !== 'lot:') {
      throw new InvalidUriError(uri, 'Lot URIs must use the lot:// scheme.');
    }
    return parsed;
  } catch (error) {
    if (error instanceof InvalidUriError) {
      throw error;
    }
    throw new InvalidUriError(uri, 'Invalid lot URI.');
  }
}

function firstPathSegment(url: URL): string | undefined {
  return url.pathname.split('/').filter(Boolean)[0];
}
