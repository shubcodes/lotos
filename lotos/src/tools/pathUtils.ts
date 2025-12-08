import path from 'node:path';
import { PermissionDeniedError } from '../utils/errors.js';
import { lotDirectory } from './storagePaths.js';

export function sanitizeRelativePath(input?: string): string {
  if (!input || input === '.' || input === './') {
    return '';
  }
  const normalized = path.posix.normalize(input);
  if (normalized.startsWith('..')) {
    throw new PermissionDeniedError('Path traversal is not allowed.');
  }
  return normalized === '.' ? '' : normalized.replace(/^\.\//, '');
}

export function resolveLotPath(userId: string, lotId: string, relativePath: string): string {
  const sanitized = sanitizeRelativePath(relativePath);
  const base = lotDirectory(userId, lotId);
  return sanitized ? path.join(base, sanitized) : base;
}
