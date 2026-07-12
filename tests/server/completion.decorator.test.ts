import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { Completion } from "../../src/server/decorators/completion.decorator.js";

describe("Completion Decorator", () => {
  it("should register completion handlers in the server registry", () => {
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

    const serverInfo = { name: "comp-server", version: "2.0.0" };
    new ServerV1(serverInfo);

    @UseServer(serverInfo)
    class CompletionHandler {
      @Completion({ type: "prompt", name: "test_prompt" })
      myCompletion(args: any) {
        return { completions: ["choice1", "choice2"] };
      }
    }

    new CompletionHandler();
    expect(mockServer.registerCapabilities).toHaveBeenCalledWith(
      expect.objectContaining({ completions: {} })
    );
    expect(mockServer.setRequestHandler).toHaveBeenCalled();
  });
});
