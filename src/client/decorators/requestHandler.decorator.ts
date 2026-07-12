import { z } from "zod";

/**
 * @description
 * Decorator to register a method as an MCP client request handler.
 * @param schema - Zod Schema or string method name.
 */
export function RequestHandler(schema: any): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target._pendingHandlers) {
      target._pendingHandlers = [];
    }
    target._pendingHandlers.push({ schema, methodName: propertyKey });
  };
}
