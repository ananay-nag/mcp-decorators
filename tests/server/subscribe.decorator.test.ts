import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { Subscribe, Unsubscribe } from "../../src/server/decorators/subscribe.decorator.js";

describe("Subscribe and Unsubscribe Decorators", () => {
  it("should register subscribe and unsubscribe handlers in the server registry", () => {
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

    const serverInfo = { name: "sub-server", version: "2.0.0" };
    new ServerV1(serverInfo);

    @UseServer(serverInfo)
    class SubscribeHandler {
      @Subscribe()
      onSubscribe(uri: string) {
        return "subscribed";
      }

      @Unsubscribe()
      onUnsubscribe(uri: string) {
        return "unsubscribed";
      }
    }

    new SubscribeHandler();
    expect(mockServer.setRequestHandler).toHaveBeenCalled();
  });
});
