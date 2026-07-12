/**
 * @description
 * This decorator is used to mark a method as a notification handler.
 * It adds metadata to the class prototype, allowing the server to recognize and handle notifications.
 * The method name and the notification method are stored in the `_pendingNotifications` array.
 * @param {string} method - The name of the notification method.
 * @returns {MethodDecorator} - A method decorator that adds metadata to the class prototype.
 */
// decorators/notification.decorator.ts
export const NOTIFICATION_META = Symbol("pendingNotifications");

export function NotificationHandler(method: string): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target[NOTIFICATION_META]) {
      target[NOTIFICATION_META] = [];
    }

    target[NOTIFICATION_META].push({ method, methodName: propertyKey });
  };
}


  
  