# Agent Guidelines: `@ananay-nag/mcp-decorators`

This file provides context, architectural design principles, coding standards, and operational guidelines for AI coding agents (Gemini, Claude, Cursor, Copilot, Antigravity, etc.) interacting with and contributing to this repository.

---

## 1. Project Overview

`@ananay-nag/mcp-decorators` is a TypeScript library providing class and method decorators for building Model Context Protocol (MCP) servers and clients. It provides a declarative, NestJS/Spring-like programming model on top of `@modelcontextprotocol/sdk`.

### Core Purpose
Instead of manually wiring JSON-RPC request handlers, aggregating capability schemas, keeping track of URI templates, and managing client/server state, developers define clean class methods decorated with `@Tool`, `@Prompt`, `@Resource`, `@ResourceTemplate`, `@Subscribe`, `@Unsubscribe`, `@Completion`, `@CallTool`, etc.

---

## 2. Technology Stack & Key Dependencies

- **Runtime**: Node.js `>=18`
- **MCP SDK**: `@modelcontextprotocol/sdk` (`^1.32.0`)
- **Schema Validation**: `zod` (`^4.5.4`), `zod-to-json-schema` (`^3.24.1`)
- **Compilation**: TypeScript targeting `es2018` with dual output:
  - **ESM**: `./dist/esm` (`"type": "module"`)
  - **CJS**: `./dist/cjs` (`"type": "commonjs"`)
- **Testing**: Jest with `ts-jest` for native ES Module test execution.

---

## 3. Critical SDK v1.32.0+ Shift: `McpServer` vs. Deprecated `Server`

> [!IMPORTANT]
> **Deprecation Notice**: In `@modelcontextprotocol/sdk` `>= 1.32.0`, the low-level `Server` class (`@modelcontextprotocol/sdk/server/index.js`) is officially marked `@deprecated Use McpServer instead for the high-level API. Only use Server for advanced use cases.`

### Rules for AI Agents:
1. **Never import or extend `Server` in new code**: Always use `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`.
2. **`@RegisterServer()` Compatibility**:
   - `McpServer` is the first-class citizen.
   - When decorating a legacy `Server`, the library emits a runtime deprecation warning via `console.warn`.
   - Support for `Server` will be **completely removed** in the next major version (`v3.0.0`).
3. **McpServer Methods**:
   - Prefer `server.registerTool(...)` over deprecated `server.tool(...)`.
   - Prefer `server.registerPrompt(...)` over deprecated `server.prompt(...)`.
   - Prefer `server.registerResource(...)` over deprecated `server.resource(...)`.
   - Note that `McpServer` exposes its low-level protocol handler under the `server.server` property.

---

## 4. Architecture & Directory Layout

```
.
├── src/
│   ├── client/
│   │   ├── decorators/
│   │   │   ├── client.decorator.ts       # @RegisterClient, @UseClient, @CallTool, etc.
│   │   │   ├── notification.decorator.ts # @NotificationHandler
│   │   │   └── requestHandler.decorator.ts # @RequestHandler
│   │   ├── types/                        # Client metadata & option interfaces
│   │   └── utils/
│   │       └── clientRegistry.ts         # Global registry for client instances
│   ├── server/
│   │   ├── decorators/
│   │   │   ├── action.decorator.ts       # @ActionHandler (dispatched by method + action name)
│   │   │   ├── completion.decorator.ts   # @Completion (autocompletion for prompts/resources)
│   │   │   ├── notification.decorator.ts # @NotificationHandler
│   │   │   ├── prompt.decorator.ts       # @Prompt
│   │   │   ├── requestHandler.decorator.ts # @RequestHandler
│   │   │   ├── resource.decorator.ts     # @Resource, @ResourceTemplate
│   │   │   ├── server.decorator.ts       # @RegisterServer, @UseServer
│   │   │   ├── subscribe.decorator.ts    # @Subscribe, @Unsubscribe
│   │   │   └── tool.decorator.ts         # @Tool
│   │   ├── types/                        # Server metadata & option interfaces
│   │   └── utils/
│   │       └── serverRegistry.ts         # Global server registry & URI template matching
│   └── index.ts                          # Main package export
├── tests/
│   ├── client/                           # Client unit & integration tests
│   └── server/                           # Server unit & integration tests
├── scripts/
│   └── filter-coverage.js                # Clean Jest coverage formatter
├── package.json
├── tsconfig.json                         # Base TypeScript config (includes tests)
├── tsconfig.prod.json                    # ESM production build config
├── tsconfig.cjs.json                     # CJS production build config
└── jest.config.js                        # Jest ES module configuration
```

---

## 5. Developer Workflows & Commands

Before making changes, running tests, or building, agents should use the following standard commands:

| Command | Purpose |
|---|---|
| `npm run build` | Compiles both ESM (`dist/esm`) and CJS (`dist/cjs`) bundles |
| `npm test` | Executes the complete Jest test suite using experimental VM modules |
| `npm run test:coverage` | Runs Jest with coverage reporting |
| `npx tsc --noEmit` | Runs type checking across `src` and `tests` without emitting files |

Agents must ensure `npm run build` and `npx tsc --noEmit` exit with code 0 before completing tasks.

---

## 6. Coding & Style Conventions

1. **Explicit ESM Module Specifiers**: All relative imports in TypeScript source files must include the `.js` extension (e.g. `import { foo } from "./foo.js"`).
2. **Dual ESM & CommonJS**: The package exports both formats. Do not use Node-only CommonJS constructs (`__dirname`, `require`) directly in source code without compatibility wrappers.
3. **No Unused Imports**: Avoid unused imports to prevent compiler errors (`TS6133`).
4. **Metadata Symbols**: All decorators attach metadata to class prototypes using dedicated `Symbol` identifiers (e.g., `TOOL_META`, `PROMPT_META`, `NOTIFICATION_META`).
5. **Preserve Compatibility**: When introducing new features, maintain backward compatibility within the 2.x semver range while emitting clear deprecation warnings for obsoleted constructs.
