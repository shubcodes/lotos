import path from 'node:path';

const DEFAULT_DATA_ROOT = path.resolve(process.cwd(), '.lots');

export const LOT_FILESYSTEM_ROOT = process.env.LOTOS_DATA_ROOT ? path.resolve(process.env.LOTOS_DATA_ROOT) : DEFAULT_DATA_ROOT;

export function lotDirectory(userId: string, lotId: string): string {
  return path.join(LOT_FILESYSTEM_ROOT, userId, lotId);
}
