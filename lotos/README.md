# LotOS

LotOS is an MCP server that provisions isolated sandbox "lots" with per-user filesystems and ephemeral runtimes, designed to interoperate with Claude Desktop, Cursor, and any Model Context Protocol client.

## Features (per PRD)
- Persistent lots per external user ID
- Streamable HTTP interface with Fastify transport
- Tools for managing lots, filesystem access, and Python execution
- Resource templates that expose lot metadata and file contents
- Advanced flows leveraging MCP roots, sampling, and elicitation

## Project Layout
```
lotos/
  src/
    server/
    tools/
    resources/
    infra/
    utils/
  tests/
  package.json
  tsconfig.json
```

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and adjust credentials (Postgres, storage, Kubernetes).
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Execute tests:
   ```bash
   npm test
   ```

## Scripts
- `npm run dev`: Start MCP server via `tsx`
- `npm run build`: Compile TypeScript into `dist/`
- `npm run start`: Run compiled server
- `npm run test`: Execute Vitest suite
- `npm run migrate`: Apply database schema/migrations (implemented later)

## Specification Alignment
The implementation follows the "LotOS – Multi-Lot MCP Sandbox Server" PRD. Each subsystem (server, tools, resources, infra) corresponds to the sections outlined in the spec, and the remaining milestones (DB integration, Kubernetes runtime, sampling, elicitation, hardening) are tracked in the project to-do list.
