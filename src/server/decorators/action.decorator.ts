/**
 * 
 * @description
 * This decorator is used to mark a method as an action handler.
 * It adds metadata to the class prototype, allowing the server to recognize and handle actions.
 * The method name and the action name are stored in the `_actions` array.
 * @param {string} actionName - The name of the action to be handled.
 * @returns {MethodDecorator} A method decorator that adds metadata to the class prototype.
 */
// decorators/action.decorator.ts
export function ActionHandler(actionName: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target._actionsMap) {
      target._actionsMap = {};
    }

    target._actionsMap[propertyKey] = actionName;
  };
}

