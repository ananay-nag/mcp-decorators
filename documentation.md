# 📖 MCP (Model Context Protocol) Decorators Complete Documentation

Welcome to the comprehensive guide for `@ananay-nag/mcp-decorators`. This library provides a clean, declarative, class-based API for building Model Context Protocol (MCP) servers and clients using TypeScript native decorators. 

By leveraging decorators, you can eliminate boilerplate, improve code organization, and dynamically register tools, prompts, resources, completions, and custom request/notification handlers.

---

## Table of Contents

1. [Architecture & Design Philosophy](#1-architecture--design-philosophy)
2. [Installation & Setup](#2-installation--setup)
3. [Server-Side API Reference](#3-server-side-api-reference)
   - [Class Decorators](#class-decorators)
   - [Method Decorators (Capabilities)](#method-decorators-capabilities)
   - [Advanced Server Routing](#advanced-server-routing)
   - [Server Utility Functions](#server-utility-functions)
4. [Server Serving & Deployment Types](#4-server-serving--deployment-types)
   - [Stdio serving](#stdio-serving)
   - [HTTP / SSE serving](#http--sse-serving)
   - [Express Integration](#express-integration)
   - [Hono Integration](#hono-integration)
   - [Fastify Integration](#fastify-integration)
   - [Web-Standard Runtimes (Deno, Bun, Workers)](#web-standard-runtimes-deno-bun-workers)
5. [Client-Side API Reference](#5-client-side-api-reference)
   - [Class Decorators](#client-class-decorators)
   - [Call Wrapper Decorators](#call-wrapper-decorators)
   - [Client Message Handlers](#client-message-handlers)
   - [Client Utility Functions](#client-utility-functions)
6. [Advanced Client Patterns](#6-advanced-client-patterns)
   - [Sessions, State & Scaling](#sessions-state--scaling)
   - [Authorization, OAuth & Machine Auth](#authorization-oauth--machine-auth)
   - [Middleware & Caching](#middleware--caching)
7. [Full Server & Client Implementation Walkthrough](#7-full-server--client-implementation-walkthrough)
8. [Upgrade Guide & Legacy Clients](#8-upgrade-guide--legacy-clients)

---

## 1. Architecture & Design Philosophy

The Model Context Protocol (MCP) typically requires setting single request dispatchers (e.g. `server.setRequestHandler`). In standard applications, this leads to monolithic handler functions or custom routing wrappers. 

`@ananay-nag/mcp-decorators` introduces a metadata reflection registry:
* **Decoupled Handlers:** Write separate, highly cohesive classes for different domains (e.g., `DbHandlers`, `FileHandlers`, `UserHandlers`).
* **Auto-Aggregation:** When you instantiate these handler classes, the registry aggregates all annotated tools, prompts, resources, and custom endpoints, generating unified dispatchers automatically before connecting.
* **Auto-Capability Detection:** The library dynamically evaluates capability scopes (e.g. `tools`, `prompts`, `resources`) based on registered decorators and calls `registerCapabilities()` on your server instance.

---

## 2. Installation & Setup

### Install Package
```bash
npm install @ananay-nag/mcp-decorators
```

### TypeScript Configuration
Ensure that you have enabled decorator support in your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "moduleResolution": "NodeNext",
    "target": "ES2022"
  }
}
```

---

## 3. Server-Side API Reference

### Class Decorators

#### `@RegisterServer()`
* **Target:** Class extending `Server` (from `@modelcontextprotocol/sdk/server/index.js`)
* **Description:** Automatically registers the server instance in the global registry under its specified name and version upon construction.
```typescript
import { Server, ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { RegisterServer } from "@ananay-nag/mcp-decorators";
import { Implementation } from "@modelcontextprotocol/sdk/types.js";

@RegisterServer()
export class MyMCPServer extends Server {
  constructor(serverInfo: Implementation, options?: ServerOptions) {
    super(serverInfo, options);
  }
}
```

#### `@UseServer(options)`
* **Target:** Any handler/service class
* **Parameters:** `options: { name: string; version?: string }`
* **Description:** Injects the registered server instance into the class prototype as `this.server` and automatically binds all decorated handlers on class instantiation.
```typescript
import { UseServer } from "@ananay-nag/mcp-decorators";

@UseServer({ name: "my-mcp-server", version: "2.0.1" })
export class DbHandlers {
  server: any; // Automatically injected server instance
}
```

---

### Method Decorators (Capabilities)

#### `@Tool(options)`
* **Target:** Method
* **Parameters:** `options: { name: string; description: string; inputSchema?: any }`
* **Description:** Exposes a method as an MCP Tool. Automatically compiles standard JSON Schemas or Zod schemas to register inputs.
```typescript
import { Tool } from "@ananay-nag/mcp-decorators";
import { z } from "zod";

@Tool({
  name: "add_numbers",
  description: "Add two numbers together",
  inputSchema: z.object({
    a: z.number(),
    b: z.number()
  })
})
async add(args: { a: number; b: number }) {
  return {
    content: [{ type: "text", text: String(args.a + args.b) }]
  };
}
```

#### `@Prompt(options)`
* **Target:** Method
* **Parameters:** `options: { name: string; description?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }`
* **Description:** Exposes a prompt template to the client.
```typescript
import { Prompt } from "@ananay-nag/mcp-decorators";

@Prompt({
  name: "code_review",
  description: "Review a code snippet",
  arguments: [{ name: "code", description: "Source code", required: true }]
})
async review(args: { code: string }) {
  return {
    messages: [
      { role: "user", content: { type: "text", text: `Review this code:\n\n${args.code}` } }
    ]
  };
}
```

#### `@Resource(options)`
* **Target:** Method
* **Parameters:** `options: { uri: string; name: string; description?: string; mimeType?: string }`
* **Description:** Exposes a static resource URI to clients.
```typescript
import { Resource } from "@ananay-nag/mcp-decorators";

@Resource({
  uri: "file://config/default",
  name: "Default Configurations"
})
async getConfig() {
  return {
    contents: [{ uri: "file://config/default", text: "mode=development\nport=8080" }]
  };
}
```

#### `@ResourceTemplate(options)`
* **Target:** Method
* **Parameters:** `options: { uriTemplate: string; name: string; description?: string; mimeType?: string }`
* **Description:** Exposes dynamic resource templates. Variables inside `{}` are automatically parsed and injected into the method arguments.
```typescript
import { ResourceTemplate } from "@ananay-nag/mcp-decorators";

@ResourceTemplate({
  uriTemplate: "db://tables/{tableName}/schema",
  name: "Table Schema"
})
async getTableSchema(params: { tableName: string }) {
  return {
    contents: [{ uri: `db://tables/${params.tableName}/schema`, text: `Schema for table ${params.tableName}` }]
  };
}
```

#### `@Subscribe()` & `@Unsubscribe()`
* **Target:** Methods
* **Description:** Invoked when clients subscribe or unsubscribe to resource updates.
```typescript
import { Subscribe, Unsubscribe } from "@ananay-nag/mcp-decorators";

@Subscribe()
async onSub(uri: string) {
  console.log(`Subscribed: ${uri}`);
}

@Unsubscribe()
async onUnsub(uri: string) {
  console.log(`Unsubscribed: ${uri}`);
}
```

#### `@Completion(ref)`
* **Target:** Method
* **Parameters:** `ref: { type: "prompt" | "resource"; name: string }`
* **Description:** Exposes autocomplete options for specific prompt arguments or resource templates.
```typescript
import { Completion } from "@ananay-nag/mcp-decorators";

@Completion({ type: "prompt", name: "code_review" })
async autocompleteReview(args: { argument: string; value: string }) {
  return {
    completion: {
      values: ["javascript", "typescript", "python"]
    }
  };
}
```

---

### Advanced Server Routing

#### `@RequestHandler(schema)` & `@NotificationHandler(schema)`
* **Target:** Method
* **Parameters:** `schema: string | ZodSchema`
* **Description:** Define custom low-level JSON-RPC endpoints. String arguments act as literal method names, while schemas validate the entire request structure.
```typescript
import { RequestHandler, NotificationHandler } from "@ananay-nag/mcp-decorators";
import { z } from "zod";

@RequestHandler("custom/ping")
async handlePing(request: any) {
  return { message: "pong" };
}

@NotificationHandler("custom/alert")
async handleAlert(notification: any) {
  console.log("Client alert received:", notification.params);
}
```

#### `@ActionHandler(actionName)`
* **Target:** Method
* **Parameters:** `actionName: string`
* **Description:** Used in combination with `@RequestHandler` to route sub-actions (e.g., when routing specific request structures matching a particular action name inside a generic endpoint).
```typescript
import { RequestHandler, ActionHandler } from "@ananay-nag/mcp-decorators";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export class AdminHandlers {
  @RequestHandler(CallToolRequestSchema)
  @ActionHandler("reboot")
  async handleReboot() {
    return { content: [{ type: "text", text: "Rebooting..." }] };
  }
}
```

---

### Server Utility Functions

#### `notifyResourceUpdated(server, uri)`
* Pushes a change notification to all clients currently subscribed to the given resource URI.

#### `sendProgress(server, progressToken, progress, total?, message?)`
* Sends a real-time progress update for long-running processes matching the request's progress token.
```typescript
import { Tool, sendProgress } from "@ananay-nag/mcp-decorators";

@Tool({ name: "build_project", description: "Build code" })
async buildProject(args: any, request: any) {
  const token = request._meta?.progressToken;
  if (token) {
    await sendProgress(this.server, token, 50, 100, "Compiling files...");
  }
  return { content: [{ type: "text", text: "Build completed!" }] };
}
```

#### `sendLoggingMessage(server, level, data, logger?)`
* Transmits structured logs directly to connected clients over the protocol.
```typescript
import { sendLoggingMessage } from "@ananay-nag/mcp-decorators";

await sendLoggingMessage(this.server, "info", { status: "Online" }, "SystemLogger");
```

#### `elicitInput(server, params, options?)`
* Prompts clients/hosts dynamically for input or forms mid-request execution.
```typescript
import { elicitInput } from "@ananay-nag/mcp-decorators";

const input = await elicitInput(this.server, {
  mode: "form",
  message: "Confirm deletion?",
  requestedSchema: {
    type: "object",
    properties: { confirm: { type: "boolean" } },
    required: ["confirm"]
  }
});
```

#### `getServer(options)`
* Programmatically retrieves a registered server instance from the registry.

### Support for MCP SDK v2 (`McpServer` & `Client`)

`@ananay-nag/mcp-decorators` fully supports the modern Model Context Protocol TypeScript SDK v2 (`@modelcontextprotocol/server` and `@modelcontextprotocol/client` split packages).

#### Multi-Version Interoperability
- **Class Registration:** The `@RegisterServer()` and `@RegisterClient()` class decorators automatically detect whether they are decorating a legacy v1 class or a modern v2 class (by duck-typing standard lifecycle and connection APIs), registering them in the registry seamlessly.
- **Natively Bound Capabilities:** When `@UseServer` is applied to a v2 `McpServer`, it automatically maps `@Tool`, `@Prompt`, `@Resource`, and `@ResourceTemplate` method decorators directly onto the server using `server.registerTool`, `server.registerPrompt`, and `server.registerResource` APIs rather than overwriting low-level JSON-RPC callbacks. This keeps capability registration unified and type-safe.
- **Callback Parameter Translation:** Decorated method handlers are adapted so they can receive arguments using the v1 pattern `(args, request, extra)` or the v2 pattern natively.

#### Example: Legacy Routing & v2 Integrations
You can seamlessly build decorators that run side-by-side with v2 routing logic (like `isLegacyRequest` or `createMcpHandler` Express servers):

```typescript
import { McpServer } from "@modelcontextprotocol/server";
import { RegisterServer, UseServer, Tool } from "@ananay-nag/mcp-decorators";
import * as z from "zod/v4";

@RegisterServer()
export class LegacyRoutingServer extends McpServer {}

@UseServer({ name: "legacy-routing-example" })
export class GreetHandlers {
  @Tool({
    name: "greet",
    description: "Greets the caller",
    inputSchema: z.object({ name: z.string() })
  })
  async greet(args: { name: string }, request: any, extra: any) {
    // Both extra.mcpReq and legacy request context are supported
    const era = extra?.mcpReq ? "modern" : "legacy";
    return {
      content: [{ type: "text", text: `Hello, ${args.name}! (era=${era})` }]
    };
  }
}
```

---

## 4. Server Serving & Deployment Types

### Stdio serving
Ideal for local integrations (CLIs, local IDE plugins). It communicates directly over standard output/input streams.
```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MyMCPServer } from "./server.js";

const server = new MyMCPServer({ name: "stdio-server", version: "2.0.1" });
await server.connect(new StdioServerTransport());
```

### HTTP / SSE serving
Recommended for remote/cloud servers. It establishes Server-Sent Events for server-to-client notifications, alongside HTTP POST for client requests.

### Express Integration
```typescript
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { MyMCPServer } from "./server.js";

const app = express();
const server = new MyMCPServer({ name: "express-server", version: "2.0.1" });

let transport: SSEServerTransport | null = null;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handleMessage(req, res);
  } else {
    res.status(400).send("No active SSE connection");
  }
});

app.listen(3000, () => console.log("Express MCP Server running on port 3000"));
```

### Hono Integration
```typescript
import { Hono } from "hono";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { MyMCPServer } from "./server.js";

const app = new Hono();
const server = new MyMCPServer({ name: "hono-server", version: "2.0.1" });
let transport: SSEServerTransport | null = null;

app.get("/sse", async (c) => {
  transport = new SSEServerTransport("/messages", c.res);
  await server.connect(transport);
  return c.res;
});

app.post("/messages", async (c) => {
  if (transport) {
    await transport.handleMessage(c.req.raw, c.res);
  } else {
    return c.text("No active SSE session", 400);
  }
});
```

### Fastify Integration
```typescript
import Fastify from "fastify";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { MyMCPServer } from "./server.js";

const fastify = Fastify();
const server = new MyMCPServer({ name: "fastify-server", version: "2.0.1" });
let transport: SSEServerTransport | null = null;

fastify.get("/sse", async (request, reply) => {
  transport = new SSEServerTransport("/messages", reply.raw);
  await server.connect(transport);
});

fastify.post("/messages", async (request, reply) => {
  if (transport) {
    await transport.handleMessage(request.raw, reply.raw);
  } else {
    reply.status(400).send("No active session");
  }
});

fastify.listen({ port: 3000 });
```

### Web-Standard Runtimes (Deno, Bun, Workers)
Because `@modelcontextprotocol/sdk` compiles to standard ESM, you can serve it in Deno, Bun, or Cloudflare Workers. Simply configure your bundler/runtime to resolve `@modelcontextprotocol/sdk` dependencies, and run standard Web-standard fetch list listeners connected to `SSEServerTransport` instances.

### MCP SDK v2 Serving (Stateless Fetch/HTTP)
With the Model Context Protocol TS SDK v2, remote servers migrate to a stateless, standard Fetch request-response architecture via `createMcpHandler` from `@modelcontextprotocol/server`.

#### Express (v2)
Requires standard adapter translation or the `@modelcontextprotocol/express` wrapper:
```typescript
import express from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { MyMcpServer } from "./server.js";

const app = createMcpExpressApp();
const mcpHandler = createMcpHandler(() => new MyMcpServer({ name: "express-server", version: "2.0.1" }));

app.all("/mcp/*", async (req, res) => {
  const webReq = new Request(`${req.protocol}://${req.get("host")}${req.originalUrl}`, {
    method: req.method,
    headers: req.headers as any,
    body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined
  });
  const webRes = await mcpHandler.fetch(webReq);
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  res.send(await webRes.text());
});

app.listen(3000, () => console.log("Express MCP Server running on port 3000"));
```

#### Hono (v2)
Hono integrates with Web-Standard Requests out of the box:
```typescript
import { Hono } from "hono";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { MyMcpServer } from "./server.js";

const app = new Hono();
const mcpHandler = createMcpHandler(() => new MyMcpServer({ name: "hono-server", version: "2.0.1" }));

app.all("/mcp/*", async (c) => {
  return mcpHandler.fetch(c.req.raw);
});

export default app;
```

#### Fastify (v2)
Translate Fastify requests to standard web requests:
```typescript
import Fastify from "fastify";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { MyMcpServer } from "./server.js";

const fastify = Fastify();
const mcpHandler = createMcpHandler(() => new MyMcpServer({ name: "fastify-server", version: "2.0.1" }));

fastify.all("/mcp/*", async (request, reply) => {
  const url = `${request.protocol}://${request.hostname}${request.url}`;
  const webReq = new Request(url, {
    method: request.method,
    headers: request.headers as any,
    body: request.body ? JSON.stringify(request.body) : undefined
  });
  const webRes = await mcpHandler.fetch(webReq);
  
  reply.status(webRes.status);
  webRes.headers.forEach((value, key) => reply.header(key, value));
  return webRes.text();
});

fastify.listen({ port: 3000 });
```

#### Web-Standard Runtimes (v2 - Cloudflare Workers, Bun, Deno)
Deploy directly to edge runtimes natively:
```typescript
import { createMcpHandler } from "@modelcontextprotocol/server";
import { MyMcpServer } from "./server.js";

const mcpHandler = createMcpHandler(() => new MyMcpServer({ name: "edge-server", version: "2.0.1" }));

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/mcp")) {
      return mcpHandler.fetch(request);
    }
    return new Response("Not Found", { status: 404 });
  }
};
```

---

## 5. Client-Side API Reference

### Client Class Decorators

#### `@RegisterClient()`
* **Target:** Class extending `Client` (from `@modelcontextprotocol/sdk/client/index.js`)
* **Description:** Registers the client instance in the global client registry upon construction.
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { RegisterClient } from "@ananay-nag/mcp-decorators";

@RegisterClient()
export class MyMCPClient extends Client {}
```

#### `@UseClient(options)`
* **Target:** Client controller/service class
* **Parameters:** `options: { name: string; version?: string }`
* **Description:** Injects the registered client instance into the class prototype as `this.client` and binds all method wrapper calls.
```typescript
import { UseClient } from "@ananay-nag/mcp-decorators";

@UseClient({ name: "my-mcp-client" })
export class ClientController {
  client: any; // Injected automatically
}
```

---

### Call Wrapper Decorators

By decorating methods in a `@UseClient` class, invoking them locally will automatically route JSON-RPC requests to the connected server.

* **Argument Forwarding:** If you declare an empty method, args passed are forwarded directly.
* **Pre-processing arguments:** Any return value from the local method body is forwarded to the server. If `undefined` is returned, original arguments are forwarded.

| Decorator | JSON-RPC Method | Description |
| :--- | :--- | :--- |
| **`@CallTool(name?)`** | `tools/call` | Calls a server tool. |
| **`@ListTools()`** | `tools/list` | Lists all available tools. |
| **`@GetPrompt(name?)`** | `prompts/get` | Retrieves a specific prompt template. |
| **`@ListPrompts()`** | `prompts/list` | Lists all server prompts. |
| **`@ReadResource(uri?)`** | `resources/read` | Reads a resource URI. |
| **`@ListResources()`** | `resources/list` | Lists server resources. |
| **`@ListResourceTemplates()`**| `resources/templates/list` | Lists server resource templates. |
| **`@SubscribeResource(uri?)`**| `resources/subscribe` | Subscribes to resource updates. |
| **`@UnsubscribeResource(uri?)`**| `resources/unsubscribe` | Unsubscribes from updates. |
| **`@CompletePromptOrResource()`**| `completion/complete` | Retrieves autocomplete values. |
| **`@SetLoggingLevel(level?)`**| `logging/setLevel` | Sets server logging level. |
| **`@PingServer()`** | `ping` | Sends a ping. |

```typescript
@UseClient({ name: "my-client" })
export class SystemService {
  client: any;

  @CallTool("add_numbers")
  async add(a: number, b: number): Promise<any> {} // Automatically calls tools/call
}
```

---

### Client Message Handlers

Clients can register low-level notification and request endpoints to listen for server-pushed notifications (like logging messages or resource updates) or incoming requests (like elicitation requests).

```typescript
import { UseClient, NotificationHandler, RequestHandler } from "@ananay-nag/mcp-decorators";

@UseClient({ name: "my-client" })
export class ClientListener {
  client: any;

  @NotificationHandler("notifications/resources/updated")
  async onResourceUpdate(params: { uri: string }) {
    console.log(`Resource changed: ${params.uri}`);
  }

  @RequestHandler("elicitation/create")
  async handleElicit(req: any) {
    // Render UI form to user
    return { status: "accepted", content: { confirm: true } };
  }
}
```

#### `getClient(options)`
* Programmatically retrieves a registered client instance from the registry.

---

## 6. Advanced Client Patterns

### Sessions, State & Scaling
When deploying MCP in multi-client systems (like web interfaces with distinct user logins), sessions must be isolated.
* **SSE Transports:** In SSE mode, each client connection maintains a unique `sessionId`.
* **Registry Contexts:** `mcp-decorators` retains request metadata using unique session contexts inside the `extra` object, preventing crossover of state.

### Authorization, OAuth & Machine Auth
Securing MCP connections is essential when exposing tools over public endpoints:
* **OAuth 2.1:** Remote clients should request authorization tokens from identity providers, passing bearer tokens via HTTP headers when connecting to SSE endpoints.
* **Machine-to-Machine (M2M):** Background agents can utilize Client Credentials assertion assertions to establish direct authentication channels.

### Middleware & Caching
* **Intercepting Requests:** You can write request preprocessors directly inside the body of decorated methods on the client side:
  ```typescript
  @CallTool("fetch_data")
  async callFetch(args: any) {
    // Custom Client Middleware logic
    if (args.key === "blocked") throw new Error("Blocked key!");
    return args; // Continue dispatching
  }
  ```
* **Caching Layer:** Implement simple caches by checking inside the method before delegating:
  ```typescript
  private cache = new Map();

  @ReadResource()
  async getResource(uri: string) {
    if (this.cache.has(uri)) {
      return this.cache.get(uri); // Skip server call
    }
  }
  ```

---

## 7. Full Server & Client Implementation Walkthrough

### 1. Server Code (`server.ts`)
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { RegisterServer, UseServer, Tool, Resource } from "@ananay-nag/mcp-decorators";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

@RegisterServer()
export class CalculatorServer extends Server {}

@UseServer({ name: "calc-server" })
export class CalcHandlers {
  server: any;

  @Tool({
    name: "multiply",
    description: "Multiply two values",
    inputSchema: z.object({
      x: z.number(),
      y: z.number()
    })
  })
  async multiply(args: { x: number; y: number }) {
    return { content: [{ type: "text", text: String(args.x * args.y) }] };
  }

  @Resource({
    uri: "info://help",
    name: "Help System"
  })
  async getHelp() {
    return { contents: [{ uri: "info://help", text: "Use multiply tool to calculate products." }] };
  }
}

async function start() {
  const server = new CalculatorServer({ name: "calc-server", version: "2.0.1" }, { capabilities: {} });
  new CalcHandlers();
  await server.connect(new StdioServerTransport());
}
start().catch(console.error);
```

### 2. Client Code (`client.ts`)
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { RegisterClient, UseClient, CallTool, ReadResource } from "@ananay-nag/mcp-decorators";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

@RegisterClient()
export class AppClient extends Client {}

@UseClient({ name: "calc-client" })
export class AppController {
  client: any;

  @CallTool("multiply")
  async multiply(args: { x: number; y: number }): Promise<any> {}

  @ReadResource("info://help")
  async readHelp(): Promise<any> {}
}

async function startClient() {
  const client = new AppClient({ name: "calc-client", version: "2.0.1" }, { capabilities: {} });
  const transport = new StdioClientTransport({ command: "node", args: ["server.js"] });
  await client.connect(transport);

  const controller = new AppController();
  const res = await controller.multiply({ x: 5, y: 10 });
  console.log("Result:", res.content[0].text);
}
startClient().catch(console.error);
```

---

## 8. Upgrade Guide & Legacy Clients

* **Roots (Sunset):** Client-side roots are deprecated in modern protocol configurations. Prefer explicitly sharing filepaths/URIs over tools instead of exposing system-wide directories.
* **Sampling (Sunset):** Standard model sampling calls should be replaced with direct OpenAI, Gemini, or Anthropic REST client SDK instances inside your server tool actions.
* **Compatibility:** All components remain backwards-compatible with standard JSON-RPC 2.0 clients, ensuring older MCP runtimes can query resources and trigger actions successfully.
