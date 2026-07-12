import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { Tool } from "../../src/server/decorators/tool.decorator.js";
import { z } from "zod";

describe("Tool Decorator", () => {
  it("should register tools on a v1 server (using registry and setRequestHandler)", () => {
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

    const serverInfo = { name: "tool-v1-server", version: "2.0.0" };
    new ServerV1(serverInfo);

    @UseServer(serverInfo)
    class ToolHandler {
      @Tool({
        name: "test_tool",
        description: "A test tool",
        inputSchema: z.object({ arg: z.string() }),
      })
      myTool(args: any) {
        return { success: true, val: args.arg };
      }
    }

    new ToolHandler();
    expect(mockServer.registerCapabilities).toHaveBeenCalledWith(
      expect.objectContaining({ tools: {} })
    );
    expect(mockServer.setRequestHandler).toHaveBeenCalled();
  });

  it("should register tools natively on an McpServer (SDK v2)", () => {
    const mockMcpServer = {
      connect: jest.fn(),
      registerTool: jest.fn(),
      setRequestHandler: jest.fn(),
      setNotificationHandler: jest.fn(),
    };

    @RegisterServer()
    class ServerV2 {
      constructor(serverInfo?: any) {}
      connect = jest.fn();
      registerTool = mockMcpServer.registerTool;
      setRequestHandler = mockMcpServer.setRequestHandler;
      setNotificationHandler = mockMcpServer.setNotificationHandler;
    }

    const serverInfo = { name: "tool-v2-server", version: "2.0.0" };
    new ServerV2(serverInfo);

    @UseServer(serverInfo)
    class ToolHandlerV2 {
      @Tool({
        name: "test_tool_v2",
        description: "A test tool for v2",
      })
      myTool(args: any) {
        return "v2 success";
      }
    }

    new ToolHandlerV2();
    expect(mockMcpServer.registerTool).toHaveBeenCalledWith(
      "test_tool_v2",
      expect.objectContaining({ description: "A test tool for v2" }),
      expect.any(Function)
    );
  });
});
