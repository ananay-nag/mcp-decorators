import { getClient, registerClient } from "../utils/clientRegistry.js";
import { UseClientOptions } from "../types/index.js";
import { z } from "zod";
import { NOTIFICATION_META } from "./notification.decorator.js";
import {
  CallToolResultSchema,
  ListToolsResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ReadResourceResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  CompleteResultSchema,
  EmptyResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Class decorator to auto-register an MCP Client instance.
 */
export function RegisterClient(): ClassDecorator {
  return function (target: any) {
    const originalConstructor = target;

    const newConstructor: any = function (...args: any[]) {
      let clientInfo = args[0];
      const instance = new originalConstructor(...args);
      console.log(`[Client] Registering client "${JSON.stringify(clientInfo)}"`);

      // Relaxed check to support both SDK v1 Client and SDK v2 Client
      if (instance && (typeof (instance as any).connect === "function")) {
        registerClient(clientInfo, instance);
      }

      return instance;
    };

    newConstructor.prototype = originalConstructor.prototype;
    return newConstructor;
  };
}

/**
 * Register low-level request handlers on the client instance.
 */
export function registerRequestHandlers(target: any, instance: any, client: any) {
  const pendingHandlers = target.prototype._pendingHandlers || [];
  for (const { schema, methodName } of pendingHandlers) {
    const handlerFn = instance[methodName].bind(instance);

    let normalizedSchema = schema;
    if (typeof schema === "string") {
      normalizedSchema = z.object({
        method: z.literal(schema),
        params: z.any().optional(),
      });
    }

    client.setRequestHandler(normalizedSchema, handlerFn);
    console.log(`[Client] ✅ Registered request handler "${typeof schema === "string" ? schema : schema.shape.method.value}" -> ${String(methodName)}`);
  }
}

/**
 * Register low-level notification handlers on the client instance.
 */
export function registerNotificationHandlers(target: any, instance: any, client: any) {
  const pendingNotifications = target.prototype[NOTIFICATION_META] || [];
  for (const { method, methodName } of pendingNotifications) {
    const handlerFn = instance[methodName].bind(instance);

    let normalizedSchema = method;
    if (typeof method === "string") {
      normalizedSchema = z.object({
        method: z.literal(method),
        params: z.any().optional(),
      });
    }

    client.setNotificationHandler(normalizedSchema, handlerFn);
    console.log(`[Client] ✅ Registered notification handler "${typeof method === "string" ? method : method.shape.method.value}" -> ${String(methodName)}`);
  }
}

/**
 * Class decorator to inject a registered client instance and bind decorators.
 */
export function UseClient(options: UseClientOptions): ClassDecorator {
  return function (target: any) {
    const originalConstructor = target;

    function newConstructor(...args: any[]) {
      const instance = new originalConstructor(...args);

      if (!options.name) {
        throw new Error("Client name is required in @UseClient options.");
      }

      const client = getClient(options);
      if (!client) {
        throw new Error(`Client with name "${options.name}" not found.`);
      }

      instance.client = client;

      registerRequestHandlers(target, instance, client);
      registerNotificationHandlers(target, instance, client);

      return instance;
    }

    newConstructor.prototype = originalConstructor.prototype;
    return newConstructor as any;
  };
}

/**
 * Helper to build client request decorators.
 */
function makeRequestDecorator(method: string, resultSchema: any, getParams?: (args: any, name?: string) => any) {
  return function (customName?: string): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
      const name = customName || String(propertyKey);
      const originalMethod = descriptor.value;

      descriptor.value = async function (this: any, args: any, options?: any) {
        if (!this.client) {
          throw new Error(`Client instance not injected. Make sure class is decorated with @UseClient.`);
        }

        let processedArgs = args;
        if (originalMethod) {
          const result = await originalMethod.apply(this, [args, options]);
          if (result !== undefined) {
            processedArgs = result;
          }
        }

        const params = getParams ? getParams(processedArgs, name) : (processedArgs || {});

        return this.client.request({
          method,
          params
        }, resultSchema, options);
      };

      return descriptor;
    };
  };
}

/**
 * Decorator to call a tool on the server.
 */
export const CallTool = makeRequestDecorator("tools/call", CallToolResultSchema, (args, name) => ({
  name,
  arguments: args
}));

/**
 * Decorator to list available tools on the server.
 */
export const ListTools = makeRequestDecorator("tools/list", ListToolsResultSchema);

/**
 * Decorator to get a prompt from the server.
 */
export const GetPrompt = makeRequestDecorator("prompts/get", GetPromptResultSchema, (args, name) => ({
  name,
  arguments: args
}));

/**
 * Decorator to list available prompts on the server.
 */
export const ListPrompts = makeRequestDecorator("prompts/list", ListPromptsResultSchema);

/**
 * Decorator to read a resource from the server.
 */
export const ReadResource = makeRequestDecorator("resources/read", ReadResourceResultSchema, (args) => {
  if (typeof args === "string") {
    return { uri: args };
  }
  return args;
});

/**
 * Decorator to list available resources on the server.
 */
export const ListResources = makeRequestDecorator("resources/list", ListResourcesResultSchema);

/**
 * Decorator to list available resource templates on the server.
 */
export const ListResourceTemplates = makeRequestDecorator("resources/templates/list", ListResourceTemplatesResultSchema);

/**
 * Decorator to subscribe to resource updates on the server.
 */
export const SubscribeResource = makeRequestDecorator("resources/subscribe", EmptyResultSchema, (args) => {
  if (typeof args === "string") {
    return { uri: args };
  }
  return args;
});

/**
 * Decorator to unsubscribe from resource updates on the server.
 */
export const UnsubscribeResource = makeRequestDecorator("resources/unsubscribe", EmptyResultSchema, (args) => {
  if (typeof args === "string") {
    return { uri: args };
  }
  return args;
});

/**
 * Decorator to complete a prompt/resource template argument on the server.
 */
export const CompletePromptOrResource = makeRequestDecorator("completion/complete", CompleteResultSchema);

/**
 * Decorator to set the server logging level.
 */
export const SetLoggingLevel = makeRequestDecorator("logging/setLevel", EmptyResultSchema, (args) => {
  if (typeof args === "string") {
    return { level: args };
  }
  return args;
});

/**
 * Decorator to ping the server.
 */
export function PingServer(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    descriptor.value = async function (this: any, options?: any) {
      if (!this.client) {
        throw new Error(`Client instance not injected. Make sure class is decorated with @UseClient.`);
      }
      return this.client.ping(options);
    };
    return descriptor;
  };
}
