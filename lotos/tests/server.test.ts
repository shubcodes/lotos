import { describe, it, expect } from 'vitest';
import { createServerOptions } from '../src/server/capabilities.js';
import { deriveSessionContext } from '../src/server/session.js';
import type { RequestInfo } from '@modelcontextprotocol/sdk/types.js';

describe('server capabilities', () => {
  it('enables strict capability negotiation with core features', () => {
    const options = createServerOptions({ instructions: 'Test server' });
    expect(options.enforceStrictCapabilities).toBe(true);
    expect(options.capabilities?.logging).toBeDefined();
    expect(options.capabilities?.resources?.listChanged).toBe(true);
    expect(options.capabilities?.tools?.listChanged).toBe(true);
    expect(options.instructions).toBe('Test server');
  });
});

describe('session context', () => {
  it('derives user id and roots from headers', () => {
    const requestInfo: RequestInfo = {
      headers: {
        'x-lotos-user-id': '11111111-2222-3333-4444-555555555555',
        'x-lotos-roots': 'lot://11111111-2222-3333-4444-555555555555/main'
      }
    };

    const session = deriveSessionContext({ requestInfo, clientCapabilities: { roots: {} } });
    expect(session.userId).toBe('11111111-2222-3333-4444-555555555555');
    expect(session.roots).toEqual(['lot://11111111-2222-3333-4444-555555555555/main']);
  });
});
