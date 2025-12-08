import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { sanitizeRelativePath, resolveLotPath } from '../src/tools/pathUtils.js';
import { lotDirectory } from '../src/tools/storagePaths.js';
import { PermissionDeniedError } from '../src/utils/errors.js';

describe('path utilities', () => {
  it('normalizes relative paths safely', () => {
    expect(sanitizeRelativePath('a/b/../c')).toBe('a/c');
    expect(() => sanitizeRelativePath('../secret')).toThrow(PermissionDeniedError);
  });

  it('resolves lot paths under the data root', () => {
    const expectedRoot = lotDirectory('user', 'lot');
    const resolved = resolveLotPath('user', 'lot', 'notes.txt');
    expect(resolved).toBe(path.join(expectedRoot, 'notes.txt'));
  });
});
