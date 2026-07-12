export interface PromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface PromptOptions {
  name: string;
  description?: string;
  arguments?: PromptArgument[];
}

export const PROMPT_META = Symbol("mcpPrompts");

/**
 * @description
 * Decorator to register a method as an MCP Prompt.
 * Handlers are dynamically collected and registered on the server.
 * @param options - Options for the prompt including name, description, and arguments.
 */
export function Prompt(options: PromptOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[PROMPT_META]) {
      target[PROMPT_META] = [];
    }
    target[PROMPT_META].push({
      options,
      methodName: propertyKey,
    });
  };
}
