import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { Prompt } from "../../src/server/decorators/prompt.decorator.js";

describe("Prompt Decorator", () => {
  it("should register prompts on a v1 server", () => {
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

    const serverInfo = { name: "prompt-v1-server", version: "2.0.0" };
    new ServerV1(serverInfo);

    @UseServer(serverInfo)
    class PromptHandler {
      @Prompt({
        name: "test_prompt",
        description: "A test prompt description",
        arguments: [{ name: "arg1", description: "first argument", required: true }]
      })
      myPrompt(args: any) {
        return "prompt response";
      }
    }

    new PromptHandler();
    expect(mockServer.registerCapabilities).toHaveBeenCalledWith(
      expect.objectContaining({ prompts: {} })
    );
    expect(mockServer.setRequestHandler).toHaveBeenCalled();
  });

  it("should register prompts natively on an McpServer (SDK v2)", () => {
    const mockMcpServer = {
      connect: jest.fn(),
      registerPrompt: jest.fn(),
      registerTool: jest.fn(), // Required to identify as an SDK v2 server
      setRequestHandler: jest.fn(),
      setNotificationHandler: jest.fn(),
    };

    @RegisterServer()
    class ServerV2 {
      constructor(serverInfo?: any) {}
      connect = jest.fn();
      registerPrompt = mockMcpServer.registerPrompt;
      registerTool = mockMcpServer.registerTool;
      setRequestHandler = mockMcpServer.setRequestHandler;
      setNotificationHandler = mockMcpServer.setNotificationHandler;
    }

    const serverInfo = { name: "prompt-v2-server", version: "2.0.0" };
    new ServerV2(serverInfo);

    @UseServer(serverInfo)
    class PromptHandlerV2 {
      @Prompt({
        name: "test_prompt_v2",
        description: "A test prompt for v2",
      })
      myPrompt(args: any) {
        return "v2 prompt response";
      }
    }

    new PromptHandlerV2();
    expect(mockMcpServer.registerPrompt).toHaveBeenCalledWith(
      "test_prompt_v2",
      expect.objectContaining({ description: "A test prompt for v2" }),
      expect.any(Function)
    );
  });
});
