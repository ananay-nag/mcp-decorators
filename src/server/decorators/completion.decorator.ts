export interface CompletionRef {
  type: "prompt" | "resource";
  name: string;
}

export const COMPLETION_META = Symbol("mcpCompletions");

/**
 * @description
 * Decorator to register a method as an MCP completion handler for prompts or resource templates.
 * @param ref - The reference specifying the type ('prompt' | 'resource') and template/prompt name.
 */
export function Completion(ref: CompletionRef): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[COMPLETION_META]) {
      target[COMPLETION_META] = [];
    }
    target[COMPLETION_META].push({
      ref,
      methodName: propertyKey,
    });
  };
}
