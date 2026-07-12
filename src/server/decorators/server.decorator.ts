import { getServer, registerServer, getOrCreateServerRegistration, matchUriTemplate } from "../utils/serverRegistry.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { UseServerOptions } from "../types/index.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CompleteRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { NOTIFICATION_META } from "./notification.decorator.js";
import { TOOL_META } from "./tool.decorator.js";
import { PROMPT_META } from "./prompt.decorator.js";
import { RESOURCE_META, RESOURCE_TEMPLATE_META } from "./resource.decorator.js";
import { SUBSCRIBE_META, UNSUBSCRIBE_META } from "./subscribe.decorator.js";
import { COMPLETION_META } from "./completion.decorator.js";

/**
 * @description
 * This decorator is used to register a server instance.
 * @returns {ClassDecorator} A class decorator that registers the server instance.
 */
export function RegisterServer(): ClassDecorator {
  return function (target: any) {
    const originalConstructor = target;

    const newConstructor: any = function (...args: any[]) {
      let serverInfo = args[0];
      const instance = new originalConstructor(...args);
      console.log(`[Server] Registering server "${JSON.stringify(serverInfo)}"`);

      // Relaxed check to support both SDK v1 Server and SDK v2 McpServer
      if (instance && (typeof (instance as any).connect === "function")) {
        registerServer(serverInfo, instance);
      }

      return instance;
    };

    newConstructor.prototype = originalConstructor.prototype;
    return newConstructor;
  };
}

// Modular: Register request handlers grouped by method string + actionName
export function registerRequestHandlers(target: any, instance: any, server: any) {
  const pendingHandlers = target.prototype._pendingHandlers || [];
  const actionsMap = target.prototype._actionsMap || {};

  const methodGroups = new Map<string, {
    schema: any;
    handlers: Record<string, Function>;
  }>();

  for (const { schema, methodName } of pendingHandlers) {
    const handlerFn = instance[methodName].bind(instance);
    const actionName = actionsMap[methodName];

    const methodKey = typeof schema === "string"
      ? schema
      : (schema && schema.shape && schema.shape.method && schema.shape.method.value)
        ? schema.shape.method.value
        : String(schema);

    if (!methodGroups.has(methodKey)) {
      methodGroups.set(methodKey, {
        schema: null,
        handlers: {}
      });
    }

    const group = methodGroups.get(methodKey)!;

    if (typeof schema !== "string") {
      if (!group.schema) {
        group.schema = schema;
      }
    }

    if (actionName) {
      group.handlers[actionName] = handlerFn;
      console.log(`[Server] ✅ Registered action "${actionName}" for method "${methodKey}" -> ${String(methodName)}`);
    } else {
      group.handlers["*"] = handlerFn;
      console.log(`[Server] ✅ Registered fallback for method "${methodKey}" -> ${String(methodName)}`);
    }
  }

  // Final dispatcher setup per method
  for (const [methodKey, group] of methodGroups.entries()) {
    let finalSchema = group.schema;
    if (!finalSchema) {
      finalSchema = z.object({
        method: z.literal(methodKey),
        params: z.any().optional(),
      });
    }

    const dispatcher = async (request: any, extra: any) => {
      const action = request?.params?.name;
      const handler = group.handlers[action] || group.handlers["*"];
      if (!handler) {
        throw new Error(`No handler for method "${methodKey}" / action "${action}".`);
      }
      return handler(request, extra);
    };

    server.setRequestHandler(finalSchema, dispatcher);
    console.log(`[Server] ✅ Bound dispatcher for method "${methodKey}"`);
  }
}

// Modular: Register notification handlers
export function registerNotificationHandlers(target: any, instance: any, server: any) {
  const pendingNotifications = target.prototype[NOTIFICATION_META] || [];

  for (const { method, methodName } of pendingNotifications) {
    const handlerFn = instance[methodName].bind(instance);

    // Normalize notification method if string is passed
    let normalizedSchema = method;
    if (typeof method === "string") {
      normalizedSchema = z.object({
        method: z.literal(method),
        params: z.any().optional(),
      });
    }

    server.setNotificationHandler(normalizedSchema, handlerFn);
    console.log(`[Server] ✅ Registered notification "${typeof method === "string" ? method : method.shape.method.value}" -> ${String(methodName)}`);
  }
}

/**
 * @description
 * This decorator is used to inject a server instance into a class.
 * It fetches the server instance from the registry and injects it into the class.
 * @param {UseServerOptions} options - Options for the decorator.
 * @returns {ClassDecorator} A class decorator that injects the server instance.
 */
export function UseServer(options: UseServerOptions): ClassDecorator {
  return function (target: any) {
    const originalConstructor = target;

    function newConstructor(...args: any[]) {
      const instance = new originalConstructor(...args);

      if (!options.name) {
        throw new Error("Server name is required in @UseServer options.");
      }

      const server: any = getServer(options);
      if (!server) {
        throw new Error(`Server with name "${options.name}" not found.`);
      }

      const isMcpServer = typeof (server as any).registerTool === "function" || typeof (server as any).tool === "function";
      const underlyingServer = server.server || server;
      instance.server = server;

      // 1. Register low-level Request and Notification handlers
      registerRequestHandlers(target, instance, underlyingServer);
      registerNotificationHandlers(target, instance, underlyingServer);

      // 2. Fetch/create server registration for decorators
      const reg = getOrCreateServerRegistration(underlyingServer);

      // 3. Register Tools
      const pendingTools = target.prototype[TOOL_META] || [];
      for (const { options: toolOpts, methodName } of pendingTools) {
        const handlerFn = instance[methodName].bind(instance);
        if (isMcpServer) {
          const regTool = (server as any).registerTool || (server as any).tool;
          regTool.call(server, toolOpts.name, {
            description: toolOpts.description,
            inputSchema: toolOpts.inputSchema
          }, (args: any, extra: any) => handlerFn(args, extra?.mcpReq, extra));
          console.log(`[Server] Registered Tool Decorator "${toolOpts.name}" natively on McpServer`);
        } else {
          reg.tools.set(toolOpts.name, { options: toolOpts, handler: handlerFn });
          console.log(`[Server] Registered Tool Decorator "${toolOpts.name}" -> ${String(methodName)}`);
        }
      }

      // 4. Register Prompts
      const pendingPrompts = target.prototype[PROMPT_META] || [];
      for (const { options: promptOpts, methodName } of pendingPrompts) {
        const handlerFn = instance[methodName].bind(instance);
        if (isMcpServer) {
          const regPrompt = (server as any).registerPrompt || (server as any).prompt;
          regPrompt.call(server, promptOpts.name, {
            description: promptOpts.description,
            arguments: promptOpts.arguments
          }, (args: any, extra: any) => handlerFn(args, extra?.mcpReq, extra));
          console.log(`[Server] Registered Prompt Decorator "${promptOpts.name}" natively on McpServer`);
        } else {
          reg.prompts.set(promptOpts.name, { options: promptOpts, handler: handlerFn });
          console.log(`[Server] Registered Prompt Decorator "${promptOpts.name}" -> ${String(methodName)}`);
        }
      }

      // 5. Register Resources
      const pendingResources = target.prototype[RESOURCE_META] || [];
      for (const { options: resOpts, methodName } of pendingResources) {
        const handlerFn = instance[methodName].bind(instance);
        if (isMcpServer) {
          const regRes = (server as any).registerResource || (server as any).resource;
          regRes.call(server, resOpts.name, resOpts.uri, {
            description: resOpts.description,
            mimeType: resOpts.mimeType
          }, (uri: any, extra: any) => handlerFn(uri.href || String(uri), extra?.mcpReq, extra));
          console.log(`[Server] Registered Resource Decorator "${resOpts.uri}" natively on McpServer`);
        } else {
          reg.resources.set(resOpts.uri, { options: resOpts, handler: handlerFn });
          console.log(`[Server] Registered Resource Decorator "${resOpts.uri}" -> ${String(methodName)}`);
        }
      }

      // 6. Register Resource Templates
      const pendingTemplates = target.prototype[RESOURCE_TEMPLATE_META] || [];
      for (const { options: tempOpts, methodName } of pendingTemplates) {
        const handlerFn = instance[methodName].bind(instance);
        if (isMcpServer) {
          const regRes = (server as any).registerResource || (server as any).resource;
          regRes.call(server, tempOpts.name, tempOpts.uriTemplate, {
            description: tempOpts.description,
            mimeType: tempOpts.mimeType
          }, (uri: any, extra: any) => {
            const uriStr = uri.href || String(uri);
            const params = matchUriTemplate(tempOpts.uriTemplate, uriStr) || {};
            return handlerFn(params, uriStr, extra?.mcpReq, extra);
          });
          console.log(`[Server] Registered Resource Template Decorator "${tempOpts.uriTemplate}" natively on McpServer`);
        } else {
          reg.resourceTemplates.set(tempOpts.uriTemplate, { options: tempOpts, handler: handlerFn });
          console.log(`[Server] Registered Resource Template Decorator "${tempOpts.uriTemplate}" -> ${String(methodName)}`);
        }
      }

      // 7. Register Subscribe/Unsubscribe
      if (target.prototype[SUBSCRIBE_META]) {
        reg.subscribeHandler = instance[target.prototype[SUBSCRIBE_META]].bind(instance);
        console.log(`[Server] Registered Subscribe Decorator -> ${String(target.prototype[SUBSCRIBE_META])}`);
      }
      if (target.prototype[UNSUBSCRIBE_META]) {
        reg.unsubscribeHandler = instance[target.prototype[UNSUBSCRIBE_META]].bind(instance);
        console.log(`[Server] Registered Unsubscribe Decorator -> ${String(target.prototype[UNSUBSCRIBE_META])}`);
      }

      // 8. Register Completions
      const pendingCompletions = target.prototype[COMPLETION_META] || [];
      for (const { ref, methodName } of pendingCompletions) {
        const handlerFn = instance[methodName].bind(instance);
        reg.completionHandlers.push({ ref, handler: handlerFn });
        console.log(`[Server] Registered Completion Decorator for "${ref.type}:${ref.name}" -> ${String(methodName)}`);
      }

      // 9. Auto-register capabilities dynamically (For Server v1 only)
      if (!isMcpServer) {
        const caps: any = {};
        if (reg.tools.size > 0) caps.tools = {};
        if (reg.prompts.size > 0) caps.prompts = {};
        if (reg.resources.size > 0 || reg.resourceTemplates.size > 0) caps.resources = {};
        if (reg.completionHandlers.length > 0) caps.completions = {};

        if (Object.keys(caps).length > 0) {
          underlyingServer.registerCapabilities(caps);
        }
      }

      // 10. Bind Aggregated Dispatchers
      bindAggregatedDispatchers(underlyingServer, reg);

      return instance;
    }

    newConstructor.prototype = originalConstructor.prototype;
    return newConstructor as any;
  };
}

/**
 * Binds aggregated handlers to the server for core schemas.
 */
function bindAggregatedDispatchers(server: any, reg: any) {
  // --- Tools Dispatchers ---
  if (reg.tools.size > 0) {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(reg.tools.values()).map((t: any) => {
        let inputSchema = { type: "object", properties: {} };
        if (t.options.inputSchema) {
          if (t.options.inputSchema._def || t.options.inputSchema._zod) {
            inputSchema = zodToJsonSchema(t.options.inputSchema) as any;
          } else {
            inputSchema = t.options.inputSchema;
          }
        }
        return {
          name: t.options.name,
          description: t.options.description,
          inputSchema
        };
      });
      return { tools };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request: any, extra: any) => {
      const toolName = request.params.name;
      const tool = reg.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool "${toolName}" not found.`);
      }
      return tool.handler(request.params.arguments || {}, request, extra);
    });
  }

  // --- Prompts Dispatchers ---
  if (reg.prompts.size > 0) {
    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = Array.from(reg.prompts.values()).map((p: any) => ({
        name: p.options.name,
        description: p.options.description,
        arguments: p.options.arguments
      }));
      return { prompts };
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request: any, extra: any) => {
      const promptName = request.params.name;
      const prompt = reg.prompts.get(promptName);
      if (!prompt) {
        throw new Error(`Prompt "${promptName}" not found.`);
      }
      return prompt.handler(request.params.arguments || {}, request, extra);
    });
  }

  // --- Resources & Templates Dispatchers ---
  if (reg.resources.size > 0 || reg.resourceTemplates.size > 0) {
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = Array.from(reg.resources.values()).map((r: any) => ({
        uri: r.options.uri,
        name: r.options.name,
        description: r.options.description,
        mimeType: r.options.mimeType
      }));
      return { resources };
    });

    server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      const resourceTemplates = Array.from(reg.resourceTemplates.values()).map((rt: any) => ({
        uriTemplate: rt.options.uriTemplate,
        name: rt.options.name,
        description: rt.options.description,
        mimeType: rt.options.mimeType
      }));
      return { resourceTemplates };
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request: any, extra: any) => {
      const uri = request.params.uri;
      const resource = reg.resources.get(uri);
      if (resource) {
        return resource.handler(uri, request, extra);
      }

      for (const [uriTemplate, template] of reg.resourceTemplates.entries()) {
        const params = matchUriTemplate(uriTemplate, uri);
        if (params) {
          return template.handler(params, uri, request, extra);
        }
      }

      throw new Error(`Resource "${uri}" not found.`);
    });
  }

  // --- Subscriptions Dispatchers ---
  server.setRequestHandler(SubscribeRequestSchema, async (request: any, extra: any) => {
    const { uri } = request.params;
    const sessionId = extra.sessionId || "default";

    if (!reg.subscribers.has(uri)) {
      reg.subscribers.set(uri, new Set());
    }
    reg.subscribers.get(uri)!.add(sessionId);

    if (reg.subscribeHandler) {
      const res = await reg.subscribeHandler(uri, request, extra);
      return res !== undefined ? res : {};
    }
    return {};
  });

  server.setRequestHandler(UnsubscribeRequestSchema, async (request: any, extra: any) => {
    const { uri } = request.params;
    const sessionId = extra.sessionId || "default";

    if (reg.subscribers.has(uri)) {
      reg.subscribers.get(uri)!.delete(sessionId);
    }

    if (reg.unsubscribeHandler) {
      const res = await reg.unsubscribeHandler(uri, request, extra);
      return res !== undefined ? res : {};
    }
    return {};
  });

  // --- Completion Dispatchers ---
  if (reg.completionHandlers.length > 0) {
    server.setRequestHandler(CompleteRequestSchema, async (request: any, extra: any) => {
      const { ref, argument } = request.params as any;
      const normalizedType = ref.type === "ref/prompt" ? "prompt" : ref.type === "ref/resource" ? "resource" : ref.type;
      const refName = ref.type === "ref/prompt" ? ref.name : ref.type === "ref/resource" ? ref.uri : "";

      for (const item of reg.completionHandlers) {
        if (item.ref.type === normalizedType && item.ref.name === refName) {
          return item.handler(
            {
              argument: argument.name,
              value: argument.value
            },
            request,
            extra
          );
        }
      }
      return { completion: { values: [] } };
    });
  }
}
