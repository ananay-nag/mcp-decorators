import { z } from "zod";

export interface ToolOptions {
  name: string;
  description: string;
  inputSchema?: Record<string, any> | z.ZodObject<any>;
}

export const TOOL_META = Symbol("mcpTools");

/**
 * @description
 * Decorator to register a method as an MCP Tool.
 * Handlers are dynamically collected and registered on the server.
 * @param options - Options for the tool including name, description, and schema.
 */
export function Tool(options: ToolOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[TOOL_META]) {
      target[TOOL_META] = [];
    }
    target[TOOL_META].push({
      options,
      methodName: propertyKey,
    });
  };
}
