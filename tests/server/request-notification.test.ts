import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { RequestHandler } from "../../src/server/decorators/requestHandler.decorator.js";
import { NotificationHandler } from "../../src/server/decorators/notification.decorator.js";
import { z } from "zod";

describe("Server Request and Notification Handlers", () => {
  it("should register low-level request and notification handlers on the server", () => {
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

    const serverInfo = { name: "req-notif-server", version: "2.0.0" };
    new ServerV1(serverInfo);

    const customSchema = z.object({
      method: z.literal("custom/request"),
      params: z.object({ val: z.number() }),
    });

    @UseServer(serverInfo)
    class ReqNotifHandler {
      @RequestHandler(customSchema)
      handleRequest(req: any) {
        return { ok: true };
      }

      @NotificationHandler("custom/notification")
      handleNotification(notif: any) {
        // Notification action
      }
    }

    new ReqNotifHandler();
    expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
      customSchema,
      expect.any(Function)
    );
    expect(mockServer.setNotificationHandler).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Function)
    );
  });
});
