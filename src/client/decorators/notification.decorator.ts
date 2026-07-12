export const NOTIFICATION_META = Symbol("pendingNotifications");

/**
 * @description
 * Decorator to register a method as an MCP client notification handler.
 * @param method - Zod Schema or string method name.
 */
export function NotificationHandler(method: string | any): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[NOTIFICATION_META]) {
      target[NOTIFICATION_META] = [];
    }
    target[NOTIFICATION_META].push({ method, methodName: propertyKey });
  };
}
