import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { RequestHandler } from "../../src/server/decorators/requestHandler.decorator.js";
import { ActionHandler } from "../../src/server/decorators/action.decorator.js";
import { z } from "zod";

describe("Action Handler Decorator", () => {
  it("should map actions and dispatch to the correct action handler method", async () => {
    const mockServer = {
      connect: jest.fn(),
      setRequestHandler: jest.fn(),
      setNotificationHandler: jest.fn(),
      registerCapabilities: jest.fn(),
    };

    @RegisterServer()
    class ServerV1 {
      constructor(serverInfo?: any) {}
      connect = jest.fn();
      setRequestHandler = mockServer.setRequestHandler;
      setNotificationHandler = mockServer.setNotificationHandler;
      registerCapabilities = mockServer.registerCapabilities;
    }

    const serverInfo = { name: "action-server", version: "2.0.0" };
    new ServerV1(serverInfo);

    const callSchema = z.object({
      method: z.literal("custom/call"),
      params: z.object({ name: z.string() }).optional(),
    });

    @UseServer(serverInfo)
    class MyActionClass {
      @RequestHandler(callSchema)
      @ActionHandler("greet")
      handleGreet(req: any) {
        return `Hello, ${req.params?.name}!`;
      }

      @RequestHandler(callSchema)
      @ActionHandler("farewell")
      handleFarewell(req: any) {
        return `Goodbye, ${req.params?.name}!`;
      }
    }

    new MyActionClass();

    // Verify that the request handler was registered
    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      callSchema,
      expect.any(Function)
    );

    // Get the registered dispatcher function
    const callArgs = mockServer.setRequestHandler.mock.calls.find(
      (args: any[]) => args[0] === callSchema
    );
    expect(callArgs).toBeDefined();
    const dispatcher = callArgs![1] as any;

    // Simulate dispatching different actions
    const greetRes = await dispatcher({ params: { name: "greet" } }, { mcpReq: {} });
    expect(greetRes).toBe("Hello, greet!");

    const farewellRes = await dispatcher({ params: { name: "farewell" } }, { mcpReq: {} });
    expect(farewellRes).toBe("Goodbye, farewell!");
  });
});
