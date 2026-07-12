/**
 * 
 * @param schema - The schema to be used for validation.
 * @description
 * This decorator is used to mark a method as a request handler.
 * It adds metadata to the class prototype, allowing the server to recognize and handle requests.
 * @returns {MethodDecorator} A method decorator that adds metadata to the class prototype.
 */
// export function RequestHandler(schema: any): MethodDecorator {
//   return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
//     // Save metadata on the class prototype (not register yet)
//     if (!target._pendingHandlers) {
//       target._pendingHandlers = [];
//     }

//     target._pendingHandlers.push({
//       schema,
//       methodName: propertyKey,
//     });
//   };
// }

export function RequestHandler(schema: any): MethodDecorator {
  return function (target: any, propertyKey: string | symbol) {
    if (!target._pendingHandlers) {
      target._pendingHandlers = [];
    }

    target._pendingHandlers.push({ schema, methodName: propertyKey });
  };
}
