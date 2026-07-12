import { jest, describe, it, expect } from "@jest/globals";
import { RegisterClient, UseClient } from "../../src/client/decorators/client.decorator.js";
import { RequestHandler } from "../../src/client/decorators/requestHandler.decorator.js";
import { NotificationHandler } from "../../src/client/decorators/notification.decorator.js";
import { z } from "zod";

describe("Client Request and Notification Handlers", () => {
  it("should register low-level client request and notification handlers", () => {
    const mockClient = {
      connect: jest.fn(),
      setRequestHandler: jest.fn(),
      setNotificationHandler: jest.fn(),
    };

    @RegisterClient()
    class TargetClient {
      constructor(clientInfo?: any) {}
      connect = jest.fn();
      setRequestHandler = mockClient.setRequestHandler;
      setNotificationHandler = mockClient.setNotificationHandler;
    }
    const targetClientInstance = new TargetClient({ name: "req-notif-client", version: "2.0.0" });

    const reqSchema = z.object({
      method: z.literal("server/customRequest"),
      params: z.any().optional(),
    });

    @UseClient({ name: "req-notif-client", version: "2.0.0" })
    class ClientHandler {
      client: any;

      @RequestHandler(reqSchema)
      async handleRequest(req: any) {
        return "response";
      }

      @NotificationHandler("server/customNotification")
      async handleNotification(notif: any) {
        // Handle notification
      }
    }

    new ClientHandler();
    expect(mockClient.setRequestHandler).toHaveBeenCalledWith(
      reqSchema,
      expect.any(Function)
    );
    expect(mockClient.setNotificationHandler).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function)
    );
  });
});
