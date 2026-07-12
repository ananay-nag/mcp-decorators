import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { getServer } from "../../src/server/utils/serverRegistry.js";

describe("Server Use and Register Decorators", () => {
  it("should register a server in the registry using @RegisterServer", () => {
    @RegisterServer()
    class MockServer {
      constructor(serverInfo?: any) {}
      connect = jest.fn();
      setRequestHandler = jest.fn();
      setNotificationHandler = jest.fn();
      registerCapabilities = jest.fn();
    }

    const serverInfo = { name: "register-test-server", version: "2.0.0" };
    const instance = new MockServer(serverInfo);

    const retrieved = getServer(serverInfo);
    expect(retrieved).toBe(instance);
  });

  it("should bind UseServer to a handler class and inject the server", () => {
    @RegisterServer()
    class TargetServer {
      constructor(serverInfo?: any) {}
      connect = jest.fn();
      setRequestHandler = jest.fn();
      setNotificationHandler = jest.fn();
      registerCapabilities = jest.fn();
    }
    const targetServerInstance = new TargetServer({ name: "use-test-server", version: "2.0.0" });
    const serverInfo = { name: "use-test-server", version: "2.0.0" };
    
    @UseServer(serverInfo)
    class TestHandler {
      server: any;
    }

    const handler = new TestHandler();
    expect(handler.server).toBe(targetServerInstance);
  });

  it("should throw an error if the server name is missing in @UseServer options", () => {
    expect(() => {
      @UseServer({ name: "" })
      class TestHandler {}
      new TestHandler();
    }).toThrow("Server name is required in @UseServer options.");
  });

  it("should throw an error if the server is not registered", () => {
    expect(() => {
      @UseServer({ name: "non-existent-server" })
      class TestHandler {}
      new TestHandler();
    }).toThrow('Server with name "non-existent-server" not found.');
  });
});
