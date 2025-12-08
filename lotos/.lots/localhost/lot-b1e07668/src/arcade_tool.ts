// This is a TypeScript file that would be added to the LotOS server
// It demonstrates how to integrate Arcade.dev with MCP elicitation

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { UrlElicitationRequiredError } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';

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
      const sessionId = extra?.sessionId;
      
      if (!sessionId) {
        return {
          content: [{ type: 'text', text: 'Session ID required' }],
          isError: true
        };
      }

      const arcadeApiKey = api_key || process.env.ARCADE_API_KEY;
      if (!arcadeApiKey) {
        return {
          content: [{
            type: 'text',
            text: 'Arcade.dev API key required. Set ARCADE_API_KEY environment variable or pass api_key parameter.'
          }],
          isError: true
        };
      }

      try {
        // In a real implementation, you would:
        // 1. Check if user is already authorized
        // 2. If not, trigger URL elicitation
        // 3. If authorized, make the API call
        
        // For demonstration, we'll simulate checking authorization
        // In production, you'd check against your auth store
        const isAuthorized = await checkArcadeAuthorization(user_id, sessionId);
        
        if (!isAuthorized) {
          // Generate elicitation ID
          const elicitationId = randomUUID();
          
          // Create authorization URL (this would be Arcade.dev's OAuth URL)
          const authUrl = `https://api.arcade.dev/auth/start?user_id=${encodeURIComponent(user_id)}&redirect_uri=${encodeURIComponent('http://localhost:4000/arcade/callback')}`;
          
          // Store elicitation state (in production, use a proper store)
          await storeElicitationState(elicitationId, sessionId, user_id, 'read_emails');
          
          // Trigger URL elicitation
          throw new UrlElicitationRequiredError([
            {
              mode: 'url',
              message: `To read your Gmail emails, please authorize Arcade.dev to access your Gmail account. Click the link below to authorize.`,
              url: authUrl,
              elicitationId
            }
          ]);
        }
        
        // If authorized, execute the tool
        const emails = await executeReadEmails(arcadeApiKey, user_id, n_emails);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: emails.length,
              emails: emails.map(email => ({
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
          throw error; // Re-throw elicitation errors
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
      const sessionId = extra?.sessionId;
      
      if (!sessionId) {
        return {
          content: [{ type: 'text', text: 'Session ID required' }],
          isError: true
        };
      }

      const arcadeApiKey = api_key || process.env.ARCADE_API_KEY;
      if (!arcadeApiKey) {
        return {
          content: [{
            type: 'text',
            text: 'Arcade.dev API key required. Set ARCADE_API_KEY environment variable or pass api_key parameter.'
          }],
          isError: true
        };
      }

      try {
        const isAuthorized = await checkArcadeAuthorization(user_id, sessionId);
        
        if (!isAuthorized) {
          const elicitationId = randomUUID();
          const authUrl = `https://api.arcade.dev/auth/start?user_id=${encodeURIComponent(user_id)}&redirect_uri=${encodeURIComponent('http://localhost:4000/arcade/callback')}`;
          
          await storeElicitationState(elicitationId, sessionId, user_id, 'search_emails');
          
          throw new UrlElicitationRequiredError([
            {
              mode: 'url',
              message: `To search your Gmail emails, please authorize Arcade.dev to access your Gmail account. Click the link below to authorize.`,
              url: authUrl,
              elicitationId
            }
          ]);
        }
        
        const emails = await executeSearchEmails(arcadeApiKey, user_id, query, max_results);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              query,
              count: emails.length,
              emails: emails.map(email => ({
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

// Helper functions (would be implemented properly in production)

async function checkArcadeAuthorization(userId: string, sessionId: string): Promise<boolean> {
  // In production, check against your auth store/database
  // For now, return false to trigger authorization
  return false;
}

async function storeElicitationState(
  elicitationId: string,
  sessionId: string,
  userId: string,
  action: string
): Promise<void> {
  // In production, store this in a database or cache
  // This allows you to resume the action after authorization
  console.log(`Storing elicitation: ${elicitationId} for user ${userId}, action: ${action}`);
}

async function executeReadEmails(
  apiKey: string,
  userId: string,
  nEmails: number
): Promise<any[]> {
  // In production, use arcadepy or make HTTP requests to Arcade.dev API
  // This is a placeholder
  const fetch = (await import('node-fetch')).default;
  
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
    throw new Error(`Arcade API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result || [];
}

async function executeSearchEmails(
  apiKey: string,
  userId: string,
  query: string,
  maxResults: number
): Promise<any[]> {
  // Similar to executeReadEmails but for search
  const fetch = (await import('node-fetch')).default;
  
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
    throw new Error(`Arcade API error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result || [];
}
