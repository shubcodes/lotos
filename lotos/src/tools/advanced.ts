import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const AutoRefactorInputSchema = z.object({
  lotUri: z.string(),
  targetFiles: z.array(z.string()).optional(),
  goal: z.string().optional()
});

const SummarizeInputSchema = z.object({
  lotUri: z.string(),
  path: z.string().optional()
});

export function registerAdvancedTools(server: McpServer): void {
  server.registerTool(
    'advanced.auto_refactor',
    {
      title: 'Auto refactor (sampling placeholder)',
      description: 'Suggests refactors by using sampling providers (not yet implemented).',
      inputSchema: AutoRefactorInputSchema
    },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: 'auto_refactor is not available yet. Sampling support will be added in a future milestone.'
          }
        ],
        isError: true
      };
    }
  );

  server.registerTool(
    'advanced.summarize',
    {
      title: 'Summarize lot contents (sampling placeholder)',
      description: 'Summarizes code or documents using future sampling integrations.',
      inputSchema: SummarizeInputSchema
    },
    async () => {
      return {
        content: [
          {
            type: 'text',
            text: 'summarize is not available yet. Sampling support will be added in a future milestone.'
          }
        ],
        isError: true
      };
    }
  );
}
