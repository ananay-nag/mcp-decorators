export interface ResourceOptions {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceTemplateOptions {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export const RESOURCE_META = Symbol("mcpResources");
export const RESOURCE_TEMPLATE_META = Symbol("mcpResourceTemplates");

/**
 * @description
 * Decorator to register a method as an MCP Resource handler.
 * @param options - Options for the resource including uri, name, and mimeType.
 */
export function Resource(options: ResourceOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[RESOURCE_META]) {
      target[RESOURCE_META] = [];
    }
    target[RESOURCE_META].push({
      options,
      methodName: propertyKey,
    });
  };
}

/**
 * @description
 * Decorator to register a method as an MCP Resource Template handler.
 * @param options - Options for the resource template including uriTemplate, name, and mimeType.
 */
export function ResourceTemplate(options: ResourceTemplateOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[RESOURCE_TEMPLATE_META]) {
      target[RESOURCE_TEMPLATE_META] = [];
    }
    target[RESOURCE_TEMPLATE_META].push({
      options,
      methodName: propertyKey,
    });
  };
}
