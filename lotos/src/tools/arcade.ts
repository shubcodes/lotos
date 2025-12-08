import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

// Import UrlElicitationRequiredError - it's exported from the SDK types
// We'll need to create it locally or import from the built SDK
class UrlElicitationRequiredError extends Error {
  constructor(
    public elicitations: Array<{ mode: 'url'; message: string; url: string; elicitationId: string }>,
    message: string = `URL elicitation${elicitations.length > 1 ? 's' : ''} required`
  ) {
    super(message);
    this.name = 'UrlElicitationRequiredError';
  }
}

const ReadEmailsInputSchema = z.object({
  user_id: z.string().describe('User identifier (email address)'),
  n_emails: z.number().int().min(1).max(50).default(10).optional().describe('Number of emails to retrieve'),
  api_key: z.string().optional().describe('Arcade.dev API key (or set ARCADE_API_KEY env var)')
});

const SearchEmailsInputSchema = z.object({
  user_id: z.string().describe('User identifier (email address)'),
  query: z.string().describe('Gmail search query (e.g., "is:unread", "from:example@gmail.com")'),
  max_results: z.number().int().min(1).max(50).default(10).optional(),
  api_key: z.string().optional().describe('Arcade.dev API key (or set ARCADE_API_KEY env var)')
});

// Simple in-memory store for authorization state (in production, use a database)
const authStore = new Map<string, { userId: string; authorized: boolean; authorizedAt?: Date }>();

// Simple in-memory store for elicitation state
const elicitationStore = new Map<string, { sessionId: string; userId: string; action: string }>();

export function registerArcadeTools(server: McpServer): void {
  server.registerTool(
    'arcade.read_emails',
    {
      title: 'Read Gmail emails via Arcade.dev',
      description: 'Read recent emails from Gmail using Arcade.dev. Requires authorization on first use.',
      inputSchema: ReadEmailsInputSchema
    },
    async (args, extra) => {
      const { user_id, n_emails = 10, api_key } = ReadEmailsInputSchema.parse(args);
      const sessionId = extra?.sessionId || 'default-session';

      let arcadeApiKey = api_key || process.env.ARCADE_API_KEY;
      if (!arcadeApiKey) {
        // Use MCP form elicitation to get the API key
        try {
          const elicitationResult = await server.server.elicitInput({
            message: 'Arcade.dev API key is required to read your emails. Please provide your API key from arcade.dev.',
            requestedSchema: {
              type: 'object',
              properties: {
                api_key: {
                  type: 'string',
                  title: 'Arcade.dev API Key',
                  description: 'Your API key from arcade.dev dashboard',
                  minLength: 1
                }
              },
              required: ['api_key']
            }
          });

          if (elicitationResult.action === 'accept' && elicitationResult.content) {
            arcadeApiKey = (elicitationResult.content as any).api_key;
          } else {
            return {
              content: [{
                type: 'text',
                text: 'API key is required. Operation cancelled.'
              }],
              isError: true
            };
          }
        } catch (elicitationError) {
          return {
            content: [{
              type: 'text',
              text: `Failed to elicit API key: ${elicitationError instanceof Error ? elicitationError.message : String(elicitationError)}`
            }],
            isError: true
          };
        }
      }

      try {
        // Check if user is already authorized
        const authKey = `${sessionId}:${user_id}`;
        const authState = authStore.get(authKey);
        const isAuthorized = authState?.authorized === true;
        
        if (!isAuthorized) {
          // Generate elicitation ID
          const elicitationId = randomUUID();
          
          // Create authorization URL - this would be Arcade.dev's OAuth URL
          // In production, you'd construct this properly with redirect_uri, state, etc.
          const authUrl = `https://api.arcade.dev/auth/start?user_id=${encodeURIComponent(user_id)}&redirect_uri=${encodeURIComponent('http://localhost:4000/arcade/callback')}&elicitation_id=${elicitationId}`;
          
          // Store elicitation state
          elicitationStore.set(elicitationId, {
            sessionId,
            userId: user_id,
            action: 'read_emails'
          });
          
          // Trigger URL elicitation via MCP
          throw new UrlElicitationRequiredError([
            {
              mode: 'url',
              message: `To read your Gmail emails, please authorize Arcade.dev to access your Gmail account. Click the link below to authorize, then return here.`,
              url: authUrl,
              elicitationId
            }
          ]);
        }
        
        // If authorized, execute the tool using Arcade.dev API
        // Note: This is a simplified example - in production you'd use the arcadepy SDK
        if (!arcadeApiKey) {
          return {
            content: [{ type: 'text', text: 'API key is required' }],
            isError: true
          };
        }
        const emails = await executeReadEmails(arcadeApiKey, user_id, n_emails);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: emails.length,
              emails: emails.map((email: any) => ({
                id: email.id,
                subject: email.subject,
                from: email.from,
                date: email.date,
                snippet: email.snippet
              }))
            }, null, 2)
          }]
        };
        
      } catch (error) {
        if (error instanceof UrlElicitationRequiredError) {
          throw error; // Re-throw elicitation errors so MCP client handles them
        }
        
        return {
          content: [{
            type: 'text',
            text: `Error reading emails: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  server.registerTool(
    'arcade.search_emails',
    {
      title: 'Search Gmail emails via Arcade.dev',
      description: 'Search emails using Gmail query syntax. Requires authorization on first use.',
      inputSchema: SearchEmailsInputSchema
    },
    async (args, extra) => {
      const { user_id, query, max_results = 10, api_key } = SearchEmailsInputSchema.parse(args);
      const sessionId = extra?.sessionId || 'default-session';

      let arcadeApiKey = api_key || process.env.ARCADE_API_KEY;
      if (!arcadeApiKey) {
        // Use MCP form elicitation to get the API key
        try {
          const elicitationResult = await server.server.elicitInput({
            message: 'Arcade.dev API key is required to search your emails. Please provide your API key from arcade.dev.',
            requestedSchema: {
              type: 'object',
              properties: {
                api_key: {
                  type: 'string',
                  title: 'Arcade.dev API Key',
                  description: 'Your API key from arcade.dev dashboard',
                  minLength: 1
                }
              },
              required: ['api_key']
            }
          });

          if (elicitationResult.action === 'accept' && elicitationResult.content) {
            arcadeApiKey = (elicitationResult.content as any).api_key;
          } else {
            return {
              content: [{
                type: 'text',
                text: 'API key is required. Operation cancelled.'
              }],
              isError: true
            };
          }
        } catch (elicitationError) {
          return {
            content: [{
              type: 'text',
              text: `Failed to elicit API key: ${elicitationError instanceof Error ? elicitationError.message : String(elicitationError)}`
            }],
            isError: true
          };
        }
      }

      try {
        const authKey = `${sessionId}:${user_id}`;
        const authState = authStore.get(authKey);
        const isAuthorized = authState?.authorized === true;
        
        if (!isAuthorized) {
          const elicitationId = randomUUID();
          const authUrl = `https://api.arcade.dev/auth/start?user_id=${encodeURIComponent(user_id)}&redirect_uri=${encodeURIComponent('http://localhost:4000/arcade/callback')}&elicitation_id=${elicitationId}`;
          
          elicitationStore.set(elicitationId, {
            sessionId,
            userId: user_id,
            action: 'search_emails'
          });
          
          throw new UrlElicitationRequiredError([
            {
              mode: 'url',
              message: `To search your Gmail emails, please authorize Arcade.dev to access your Gmail account. Click the link below to authorize, then return here.`,
              url: authUrl,
              elicitationId
            }
          ]);
        }
        
        if (!arcadeApiKey) {
          return {
            content: [{ type: 'text', text: 'API key is required' }],
            isError: true
          };
        }
        const emails = await executeSearchEmails(arcadeApiKey, user_id, query, max_results);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              query,
              count: emails.length,
              emails: emails.map((email: any) => ({
                id: email.id,
                subject: email.subject,
                from: email.from,
                date: email.date
              }))
            }, null, 2)
          }]
        };
        
      } catch (error) {
        if (error instanceof UrlElicitationRequiredError) {
          throw error;
        }
        
        return {
          content: [{
            type: 'text',
            text: `Error searching emails: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}

// Helper function to mark authorization as complete
// This would be called from an OAuth callback handler
export function markArcadeAuthorized(elicitationId: string): void {
  const state = elicitationStore.get(elicitationId);
  if (state) {
    const authKey = `${state.sessionId}:${state.userId}`;
    authStore.set(authKey, {
      userId: state.userId,
      authorized: true,
      authorizedAt: new Date()
    });
    elicitationStore.delete(elicitationId);
  }
}

// Helper functions to execute Arcade.dev API calls
async function executeReadEmails(
  apiKey: string,
  userId: string,
  nEmails: number
): Promise<any[]> {
  // In production, use arcadepy SDK or make proper HTTP requests
  // This is a placeholder that shows the structure
  try {
    const response = await fetch('https://api.arcade.dev/tools/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'Gmail.ListEmails',
        parameters: { n_emails: nEmails },
        user_id: userId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Arcade API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    // For demo purposes, return mock data if API fails
    console.error('Arcade API error:', error);
    return [];
  }
}

async function executeSearchEmails(
  apiKey: string,
  userId: string,
  query: string,
  maxResults: number
): Promise<any[]> {
  try {
    const response = await fetch('https://api.arcade.dev/tools/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'Gmail.SearchEmails',
        parameters: { query, max_results: maxResults },
        user_id: userId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Arcade API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Arcade API error:', error);
    return [];
  }
}

