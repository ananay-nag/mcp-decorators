# 🚀 MCP (Model Context Protocol) Decorators

![MCP Decorators Banner](banner.svg)

<p align="center">
  <a href="https://www.npmjs.com/package/@ananay-nag/mcp-decorators">
    <img src="https://img.shields.io/npm/v/@ananay-nag/mcp-decorators.svg?color=cb3837&style=flat-square" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@ananay-nag/mcp-decorators">
    <img src="https://img.shields.io/node/v/@ananay-nag/mcp-decorators.svg?color=339933&style=flat-square" alt="node compatibility" />
  </a>
  <a href="https://github.com/ananay-nag/mcp-decorators/actions/workflows/test.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/ananay-nag/mcp-decorators/test.yml.svg?style=flat-square" alt="build status" />
  </a>
  <a href="https://github.com/ananay-nag/mcp-decorators/issues">
    <img src="https://img.shields.io/github/issues/ananay-nag/mcp-decorators.svg?color=2ea44f&style=flat-square" alt="github issues" />
  </a>
  <a href="https://github.com/ananay-nag/mcp-decorators/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ananay-nag/mcp-decorators.svg?color=6f42c1&style=flat-square" alt="license" />
  </a>
  <a href="https://mcp-decorators-doc.vercel.app/">
    <img src="https://img.shields.io/badge/Documentation-mcp--decorators-0969da.svg?style=flat-square" alt="Documentation" />
  </a>
</p>

A powerful, TypeScript-native decorator library to simplify and supercharge your Model Context Protocol (MCP) server and client development.

`@ananay-nag/mcp-decorators` enables clean, declarative class-based structures, completely removing repetitive boilerplate for request handling, client calls, resource serving, notifications, autocompletions, and capabilities registration.

### [MCP Decorators - Documentation](https://mcp-decorators-doc.vercel.app/)

---

## Table of Contents
1. [Installation & Configuration](#installation--configuration)
2. [Server-Side Decorators](#server-side-decorators)
   - [Core Class Decorators](#core-class-decorators)
   - [MCP Capabilities Decorators](#mcp-capabilities-decorators)
   - [Advanced Server Routing](#advanced-server-routing)
3. [Full Server Example](#full-server-example)
4. [Client-Side Decorators](#client-side-decorators)
   - [Core Client Decorators](#core-client-decorators)
   - [Client Call Wrapper Decorators](#client-call-wrapper-decorators)
   - [Client Request/Notification Handlers](#client-requestnotification-handlers)
5. [Full Client Example](#full-client-example)
6. [Utilities](#utilities)
7. [Testing](#testing)
8. [Under the Hood & Advantages](#under-the-hood--advantages)

---

## Installation & Configuration

Install the package via npm:

```bash
npm install @ananay-nag/mcp-decorators
```

Ensure that you have enabled decorator support in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Server-Side Decorators

Server-side decorators automate capability aggregation, map request dispatchers, manage client subscriptions, and route incoming requests and notifications.

### Core Class Decorators

#### 1. `@RegisterServer()`
* **Target**: Class extending `Server` (from `@modelcontextprotocol/sdk/server/index.js`)
* **Description**: Automatically registers the instantiated server in the global registry using the name and version passed to the class constructor.
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

#### 2. `@UseServer(options)`
* **Target**: Any handler/service class
* **Parameters**: `options: { name: string; version?: string }`
* **Description**: Injects the registered server instance into the class prototype as `this.server` and automatically binds all decorated handlers on class instantiation.
```typescript
import { UseServer } from "@ananay-nag/mcp-decorators";

@UseServer({ name: "my-mcp-server", version: "2.0.0" })
export class DbHandlers {
  server: any; // Injected server instance
}
```

---

### MCP Capabilities Decorators

#### 3. `@Tool(options)`
* **Target**: Method
* **Parameters**: `options: { name: string; description: string; inputSchema?: any }`
* **Description**: Registers a method as an MCP Tool. Validates inputs automatically using the `inputSchema` (supports standard schemas or **Zod** schemas).
```typescript
import { Tool } from "@ananay-nag/mcp-decorators";
import { z } from "zod";

@Tool({
  name: "query_database",
  description: "Run a read-only SQL query against the database",
  inputSchema: z.object({
    sql: z.string(),
  })
})
async query(args: { sql: string }) {
  // Method body receives the arguments object directly
  return {
    content: [{ type: "text", text: `Results for: ${args.sql}` }]
  };
}
```

#### 4. `@Prompt(options)`
* **Target**: Method
* **Parameters**: `options: { name: string; description?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }`
* **Description**: Exposes a prompt template to clients.
```typescript
import { Prompt } from "@ananay-nag/mcp-decorators";

@Prompt({
  name: "explain_code",
  description: "Explain the provided code snippet",
  arguments: [{ name: "code", description: "Source code to explain", required: true }]
})
async explainCode(args: { code: string }) {
  return {
    messages: [
      { role: "user", content: { type: "text", text: `Please explain this code:\n\n${args.code}` } }
    ]
  };
}
```

#### 5. `@Resource(options)` & `@ResourceTemplate(options)`
* **Target**: Method
* **Parameters**:
  - `@Resource`: `options: { uri: string; name: string; description?: string; mimeType?: string }`
  - `@ResourceTemplate`: `options: { uriTemplate: string; name: string; description?: string; mimeType?: string }`
* **Description**: Expose static text/binary files or dynamic URI templates.
```typescript
import { Resource, ResourceTemplate } from "@ananay-nag/mcp-decorators";

// Exposes a static resource
@Resource({
  uri: "mysql://schema/tables",
  name: "Tables list schema"
})
async getTables() {
  return { contents: [{ uri: "mysql://schema/tables", text: "['users', 'orders']" }] };
}

// Exposes dynamic URIs matching a template (e.g. mysql://users/schema)
@ResourceTemplate({
  uriTemplate: "mysql://{tableName}/schema",
  name: "Dynamic Table Schema"
})
async getTableSchema(params: { tableName: string }) {
  // 'tableName' is automatically parsed from the requested URI and injected
  return {
    contents: [{ uri: `mysql://${params.tableName}/schema`, text: `Schema for ${params.tableName}` }]
  };
}
```

#### 6. `@Subscribe()` & `@Unsubscribe()`
* **Target**: Methods
* **Description**: Triggered when a client subscribes/unsubscribes to resource URI updates.
```typescript
import { Subscribe, Unsubscribe } from "@ananay-nag/mcp-decorators";

@Subscribe()
async onSubscribe(uri: string) {
  console.log(`Client subscribed to resource updates on: ${uri}`);
}

@Unsubscribe()
async onUnsubscribe(uri: string) {
  console.log(`Client unsubscribed from: ${uri}`);
}
```

#### 7. `@Completion(ref)`
* **Target**: Method
* **Parameters**: `ref: { type: "prompt" | "resource"; name: string }`
* **Description**: Registers auto-completion handler for a prompt argument or a resource template parameter.
```typescript
import { Completion } from "@ananay-nag/mcp-decorators";

@Completion({ type: "prompt", name: "explain_code" })
async autocompleteCodePrompt(args: { argument: string; value: string }) {
  return {
    completion: {
      values: ["typescript", "javascript", "python"]
    }
  };
}
```

---

### Advanced Server Routing

#### 8. `@RequestHandler(schema)` & `@NotificationHandler(schema)`
* **Target**: Method
* **Parameters**: `schema: string | ZodSchema`
* **Description**: Low-level request and notification catch-alls. If a string is provided, it matches the JSON-RPC method name exactly.
```typescript
import { RequestHandler, NotificationHandler } from "@ananay-nag/mcp-decorators";

@NotificationHandler("notifications/initialized")
async onClientInit(params: any) {
  console.log("Client initialization completed!");
}
```

#### 9. `@ActionHandler(actionName)`
* **Target**: Method
* **Parameters**: `actionName: string`
* **Description**: Used **in conjunction** with `@RequestHandler`. It maps specific sub-actions (like different tool calls or custom action names where `request.params.name === actionName`) under a single request schema to different handler methods.
```typescript
import { RequestHandler, ActionHandler } from "@ananay-nag/mcp-decorators";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export class RawHandlers {
  // Routes tool calls for "ping" tool
  @RequestHandler(CallToolRequestSchema)
  @ActionHandler("ping")
  async handlePing(request: any) {
    return { content: [{ type: "text", text: "pong" }] };
  }

  // Routes tool calls for "query" tool
  @RequestHandler(CallToolRequestSchema)
  @ActionHandler("query")
  async handleQuery(request: any) {
    return { content: [{ type: "text", text: "executing query..." }] };
  }
}
```

---

## Full Server Example

### `server.ts`
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

### `dbHandlers.ts`
```typescript
import { UseServer, Tool, Resource, ResourceTemplate } from "@ananay-nag/mcp-decorators";
import { z } from "zod";

@UseServer({ name: "my-database-mcp", version: "2.0.0" })
export class DbHandlers {
  server: any; // Injected instance

  @Tool({
    name: "fetch_users",
    description: "Fetch list of active users",
    inputSchema: z.object({
      limit: z.number().default(10)
    })
  })
  async fetchUsers(args: { limit: number }) {
    return {
      content: [{ type: "text", text: `Fetched ${args.limit} users.` }]
    };
  }

  @Resource({
    uri: "mysql://tables/list",
    name: "MySQL Tables",
    description: "List of tables in MySQL database"
  })
  async listTables() {
    return {
      contents: [{ uri: "mysql://tables/list", text: JSON.stringify(["users", "orders", "payments"]) }]
    };
  }

  @ResourceTemplate({
    uriTemplate: "mysql://{tableName}/schema",
    name: "Table Schema Details"
  })
  async getTableSchema(params: { tableName: string }) {
    return {
      contents: [{ uri: `mysql://${params.tableName}/schema`, text: `Fields details for ${params.tableName}` }]
    };
  }
}
```

### `index.ts`
```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MyMCPServer } from "./server.js";
import { DbHandlers } from "./dbHandlers.js";

async function main() {
  // 1. Create registered server instance
  const server = new MyMCPServer(
    { name: "my-database-mcp", version: "2.0.0" },
    { capabilities: {} }
  );

  // 2. Instantiate handlers (binds decorators dynamically BEFORE connecting)
  new DbHandlers();

  // 3. Setup stdio transport and connect
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("🚀 MCP Server running on Stdio!");
}

main().catch(console.error);
```

---

## Client-Side Decorators

Client decorators allow you to inject an active client instance, auto-wrap local methods into server-side JSON-RPC requests, and register local message/notification handlers.

### Core Client Decorators

#### 1. `@RegisterClient()`
* **Target**: Class extending `Client` (from `@modelcontextprotocol/sdk/client/index.js`)
* **Description**: Registers the client instance in the global client registry upon construction.
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { RegisterClient } from "@ananay-nag/mcp-decorators";

@RegisterClient()
export class MyMCPClient extends Client {}
```

#### 2. `@UseClient(options)`
* **Target**: Client service/controller class
* **Parameters**: `options: { name: string; version?: string }`
* **Description**: Injects the registered client instance as `this.client` and binds all method capability wrappers.
```typescript
import { UseClient } from "@ananay-nag/mcp-decorators";

@UseClient({ name: "my-mcp-client" })
export class MyService {
  client: any; // Injected
}
```

---

### Client Call Wrapper Decorators

By decorating a method in a `@UseClient` class, calling that method locally automatically triggers a request to the server. 

* **Pre-processing arguments**: If you write code in the body of the decorated method, it runs **before** the request is dispatched. Whatever you return will be sent to the server. If you return nothing (`undefined`), the original arguments passed to the method are forwarded.
* **Empty Methods**: You can declare them with empty bodies (e.g. `async myMethod(args): Promise<any> {}`), and they will forward the arguments directly to the server.

| Decorator | JSON-RPC Method | Description |
| :--- | :--- | :--- |
| **`@CallTool(name?)`** | `tools/call` | Calls a server tool. Uses method name if name is omitted. |
| **`@ListTools()`** | `tools/list` | Lists all available tools on the server. |
| **`@GetPrompt(name?)`** | `prompts/get` | Retrieves a specific prompt template. |
| **`@ListPrompts()`** | `prompts/list` | Lists prompts available on the server. |
| **`@ReadResource(uri?)`** | `resources/read` | Reads a resource. Direct URI parameter is supported. |
| **`@ListResources()`** | `resources/list` | Lists resources available on the server. |
| **`@ListResourceTemplates()`**| `resources/templates/list` | Lists dynamic resource templates. |
| **`@SubscribeResource(uri?)`**| `resources/subscribe` | Subscribes to resource updates. |
| **`@UnsubscribeResource(uri?)`**| `resources/unsubscribe` | Unsubscribes from resource updates. |
| **`@CompletePromptOrResource()`**| `completion/complete` | Retrieves auto-completion values. |
| **`@SetLoggingLevel(level?)`**| `logging/setLevel` | Sets server logging level. |
| **`@PingServer()`** | `ping` | Pings the server. |

---

### Client Request/Notification Handlers

Client classes decorated with `@UseClient` can also listen to requests and notifications sent from the server using:
* `@RequestHandler(schema)`
* `@NotificationHandler(schema)`

For instance, you can handle resource update notifications pushed by the server.

```typescript
import { UseClient, NotificationHandler } from "@ananay-nag/mcp-decorators";

@UseClient({ name: "my-mcp-client" })
export class LogController {
  client: any;

  // Handle resource updates pushed by the server
  @NotificationHandler("notifications/resources/updated")
  async onResourceUpdate(params: { uri: string }) {
    console.log(`⚠️ Server notified update for: ${params.uri}`);
  }
}
```

---

## Full Client Example

### `client.ts`
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { RegisterClient } from "@ananay-nag/mcp-decorators";

@RegisterClient()
export class MyMCPClient extends Client {}
```

### `service.ts`
```typescript
import { UseClient, CallTool, ListTools, ReadResource, NotificationHandler } from "@ananay-nag/mcp-decorators";

@UseClient({ name: "my-mcp-client", version: "2.0.0" })
export class ClientController {
  client: any; // Injected instance

  // 1. Calling a tool named "fetch_users"
  @CallTool("fetch_users")
  async fetchUsers(args: { limit: number }): Promise<any> {}

  // 2. List tools on the server
  @ListTools()
  async getToolsList(): Promise<any> {}

  // 3. Read a resource (Preprocesses parameter into URI schema)
  @ReadResource()
  async loadTableSchema(tableName: string) {
    return `mysql://${tableName}/schema`; // Returns final argument sent to server
  }

  // 4. Handle notifications pushed from server
  @NotificationHandler("notifications/resources/updated")
  onResourceUpdated(params: { uri: string }) {
    console.log(`Resource changed on server: ${params.uri}`);
  }
}
```

### `index.ts`
```typescript
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MyMCPClient } from "./client.js";
import { ClientController } from "./service.js";

async function runClient() {
  const client = new MyMCPClient(
    { name: "my-mcp-client", version: "2.0.0" },
    { capabilities: {} }
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: ["path/to/server/index.js"]
  });

  await client.connect(transport);

  // Initialize service to bind decorators
  const controller = new ClientController();

  // Test tool call
  const users = await controller.fetchUsers({ limit: 5 });
  console.log("Users output:", users);

  // Test resource read
  const schema = await controller.loadTableSchema("users");
  console.log("Schema output:", schema);
}

runClient().catch(console.error);
```

---

## Utilities

#### 1. `notifyResourceUpdated(server, uri)`
Triggers a push notification to all clients subscribed to the specified resource URI.
```typescript
import { notifyResourceUpdated } from "@ananay-nag/mcp-decorators";

// Pushes notification to clients subscribed to 'mysql://users/schema'
await notifyResourceUpdated(this.server, "mysql://users/schema");
```

#### 2. `sendProgress(server, progressToken, progress, total?, message?)`
Send real-time progress updates back to the client during long-running tasks.
```typescript
import { sendProgress } from "@ananay-nag/mcp-decorators";

// Inside a Tool handler method:
const token = request._meta?.progressToken;
if (token) {
  await sendProgress(this.server, token, 1, 5, "Processing part 1...");
}
```

#### 3. `sendLoggingMessage(server, level, data, logger?)`
Transmits standard log notifications to the client over MCP.
```typescript
import { sendLoggingMessage } from "@ananay-nag/mcp-decorators";

await sendLoggingMessage(this.server, "info", { query: "SELECT * FROM users" }, "DatabaseLogger");
```

#### 4. `elicitInput(server, params, options?)`
Prompts the client/user for dynamic input or form submission mid-request.
```typescript
import { elicitInput } from "@ananay-nag/mcp-decorators";

const response = await elicitInput(this.server, {
  mode: "form",
  message: "Confirm table drop?",
  requestedSchema: {
    type: "object",
    properties: { confirm: { type: "boolean" } },
    required: ["confirm"]
  }
});
```

#### 5. `getServer(options)`
Fetch a registered server instance programmatically.
```typescript
import { getServer } from "@ananay-nag/mcp-decorators";

const server = getServer({ name: "my-database-mcp", version: "2.0.0" });
```

#### 6. `getClient(options)`
Fetch a registered client instance programmatically.
```typescript
import { getClient } from "@ananay-nag/mcp-decorators";

const client = getClient({ name: "my-mcp-client", version: "2.0.0" });
```

---

## Testing

This library uses **Jest** and **ts-jest** for clean, isolated decorator verification.

### Running the Test Suite

```bash
# Run all test cases
npm run test

# Run tests with coverage reporting (excludes uncovered line numbers column)
npm run test:coverage
```

### Test Coverage Summary

<details>
<summary>📊 Click to view full coverage report</summary>

<!-- START_COVERAGE -->
| File | % Stmts | % Branch | % Funcs | % Lines |
| :--- | :--- | :--- | :--- | :--- |
| All files | 70.12 | 52.12 | 61.36 | 70.47 |
| client/decorators | 77.08 | 52.17 | 68 | 77.65 |
| client.decorator.ts | 74.71 | 52.38 | 61.9 | 75.29 |
| notification.decorator.ts | 100 | 50 | 100 | 100 |
| requestHandler.decorator.ts | 100 | 50 | 100 | 100 |
| client/utils | 70 | 62.5 | 75 | 68.42 |
| clientRegistry.ts | 70 | 62.5 | 75 | 68.42 |
| server/decorators | 72.8 | 53.15 | 62.5 | 73.25 |
| action.decorator.ts | 100 | 100 | 100 | 100 |
| completion.decorator.ts | 100 | 50 | 100 | 100 |
| notification.decorator.ts | 100 | 50 | 100 | 100 |
| prompt.decorator.ts | 100 | 50 | 100 | 100 |
| requestHandler.decorator.ts | 100 | 100 | 100 | 100 |
| resource.decorator.ts | 100 | 50 | 100 | 100 |
| server.decorator.ts | 66.99 | 52.29 | 35.71 | 67.33 |
| subscribe.decorator.ts | 100 | 100 | 100 | 100 |
| tool.decorator.ts | 100 | 50 | 100 | 100 |
| server/utils | 42.85 | 40 | 36.36 | 42.55 |
| serverRegistry.ts | 42.85 | 40 | 36.36 | 42.55 |
<!-- END_COVERAGE -->

</details>

---

## Under the Hood & Advantages

* **No Overhead Handler Overwrites**: In the standard MCP SDK, setting a request handler replaces the previous registration. `mcp-decorators` aggregates all class-level decorators (e.g. tools, prompts, resources, completions) and maps them internally inside single dispatchers. This allows you to split logic across multiple handler classes safely without breaking capabilities.
* **Zod Validation Integration**: Automatically processes typescript parameter typing or schema validations using Zod validator patterns on Tool inputSchemas.
* **Auto-Capability Detection**: Evaluates registered decorators at instantiation and registers corresponding server capabilities (`tools`, `prompts`, `resources`) dynamically so you don't have to manually configure them in options.
* **Smart URI Parameter Extraction**: Parses template URIs (e.g., `mysql://{tableName}/schema`) and extracts named path parameters (e.g. `tableName: "users"`) to inject directly as parameters to your resource templates method.
* **Dual CJS & ESM Compatibility**: Fully compiled for both exports setups to prevent TypeScript resolution errors in legacy standard node projects.