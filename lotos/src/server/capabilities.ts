import type { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import type { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js';

export interface CapabilityConfig {
  instructions?: string;
}

const BASE_CAPABILITIES: ServerCapabilities = {
  logging: {},
  tools: { listChanged: true },
  resources: { listChanged: true },
  prompts: { listChanged: true }
};

export function createServerOptions(config: CapabilityConfig = {}): ServerOptions {
  return {
    capabilities: BASE_CAPABILITIES,
    instructions: config.instructions,
    enforceStrictCapabilities: true
  };
}
