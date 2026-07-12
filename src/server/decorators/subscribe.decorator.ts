export const SUBSCRIBE_META = Symbol("mcpSubscribe");
export const UNSUBSCRIBE_META = Symbol("mcpUnsubscribe");

/**
 * @description
 * Decorator to register a method as an MCP Resource Subscribe handler.
 */
export function Subscribe(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    target[SUBSCRIBE_META] = propertyKey;
  };
}

/**
 * @description
 * Decorator to register a method as an MCP Resource Unsubscribe handler.
 */
export function Unsubscribe(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    target[UNSUBSCRIBE_META] = propertyKey;
  };
}
