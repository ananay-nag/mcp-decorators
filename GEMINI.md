# Gemini Context & Instructions: `@ananay-nag/mcp-decorators`

This file provides system context, engineering guidelines, and behavioral directives for Gemini agents operating within the `@ananay-nag/mcp-decorators` codebase.

---

## 1. Repository Context

- **Package**: `@ananay-nag/mcp-decorators`
- **Repository**: [https://github.com/ananay-nag/mcp-decorators](https://github.com/ananay-nag/mcp-decorators)
- **Role**: TypeScript decorator framework for building declarative Model Context Protocol (MCP) servers and clients.
- **Core Abstraction**: Connects developer-defined classes and methods to the Model Context Protocol using TypeScript decorators (`@RegisterServer`, `@UseServer`, `@Tool`, `@Prompt`, `@Resource`, `@RegisterClient`, `@UseClient`, etc.).

---

## 2. Key Architectural Guidelines for Gemini

### 2.1. Strict `McpServer` Protocol Migration
- In `@modelcontextprotocol/sdk` `>= 1.32.0`, the low-level `Server` class is **deprecated**.
- All new server classes must extend or instantiate `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`.
- Legacy `Server` usage triggers runtime deprecation warnings and will be completely removed in the next major version (`v3.0.0`).
- When writing server registrations, prefer:
  ```typescript
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { RegisterServer } from "@ananay-nag/mcp-decorators";

  @RegisterServer()
  export class MyMCPServer extends McpServer {}
  ```
- Use `server.registerTool`, `server.registerPrompt`, and `server.registerResource` as the primary integration targets for `McpServer`.

### 2.2. Supported Transports
- **Stdio**: `StdioServerTransport` (`@modelcontextprotocol/sdk/server/stdio.js`) for local CLIs and sub-processes.
- **Streamable HTTP**: `StreamableHttpServerTransport` (`@modelcontextprotocol/sdk/server/streamableHttp.js`) for modern remote HTTP servers. (Note: legacy SSE transport is deprecated in the MCP specification).

### 2.3. Schema Validation
- All schemas use `zod` (`^4.5.4`).
- `@Tool` accepts either `z.ZodObject` or raw shape definitions `Record<string, z.ZodTypeAny>`.
- `@Prompt` accepts either `arguments` (array of `PromptArgument`) or `argsSchema` (Zod shape).

---

## 3. Engineering Workflows

### 3.1. Verification Commands
Always verify changes with the project's build and test pipeline:
```bash
# 1. Type check without emitting
npx tsc --noEmit

# 2. Run unit tests
npm test

# 3. Build dual-target distributions (ESM & CJS)
npm run build
```

### 3.2. Import Requirements
- TypeScript files are compiled under `"moduleResolution": "Node16"`.
- Every local import must explicitly state the `.js` extension:
  ```typescript
  import { getServer } from "../utils/serverRegistry.js";
  ```
- Unused imports must never be left in source files, as TypeScript will flag warnings or errors.

---

## 4. Decorator Lifecycle Summary

1. **Registration Phase (`@RegisterServer` / `@RegisterClient`)**:
   - The decorated class wraps the constructor.
   - Upon instantiation (`new MyServer(info)`), the instance is saved into the global registry (`serverRegistry.ts` / `clientRegistry.ts`) keyed by `{ name, version }`.
   - Emits deprecation warnings if an outdated `Server` instance is detected.

2. **Binding Phase (`@UseServer` / `@UseClient`)**:
   - Injects the registered instance into `this.server` or `this.client`.
   - Iterates through metadata symbols on the class prototype (`TOOL_META`, `PROMPT_META`, `RESOURCE_META`, etc.).
   - Attaches handlers natively to `McpServer` (`registerTool`, `registerPrompt`, `registerResource`) or binds aggregated dispatchers for low-level server instances.
