import { jest, describe, it, expect } from "@jest/globals";
import { RegisterServer, UseServer } from "../../src/server/decorators/server.decorator.js";
import { Resource, ResourceTemplate } from "../../src/server/decorators/resource.decorator.js";

describe("Resource Decorators", () => {
  it("should register resources and templates on a v1 server", () => {
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

    const serverInfo = { name: "res-v1-server", version: "2.0.0" };
    new ServerV1(serverInfo);

    @UseServer(serverInfo)
    class ResourceHandler {
      @Resource({
        uri: "file:///test.txt",
        name: "test_resource",
        description: "A test static resource",
        mimeType: "text/plain",
      })
      myResource() {
        return "static content";
      }

      @ResourceTemplate({
        uriTemplate: "file:///{path}",
        name: "test_template",
        description: "A test dynamic resource template",
        mimeType: "text/plain",
      })
      myTemplate(params: any) {
        return `dynamic content for ${params.path}`;
      }
    }

    new ResourceHandler();
    expect(mockServer.registerCapabilities).toHaveBeenCalledWith(
      expect.objectContaining({ resources: {} })
    );
    expect(mockServer.setRequestHandler).toHaveBeenCalled();
  });

  it("should register resources and templates natively on an McpServer (SDK v2)", () => {
    const mockMcpServer = {
      connect: jest.fn(),
      registerResource: jest.fn(),
      registerTool: jest.fn(), // Required to identify as an SDK v2 server
      setRequestHandler: jest.fn(),
      setNotificationHandler: jest.fn(),
    };

    @RegisterServer()
    class ServerV2 {
      constructor(serverInfo?: any) {}
      connect = jest.fn();
      registerResource = mockMcpServer.registerResource;
      registerTool = mockMcpServer.registerTool;
      setRequestHandler = mockMcpServer.setRequestHandler;
      setNotificationHandler = mockMcpServer.setNotificationHandler;
    }

    const serverInfo = { name: "res-v2-server", version: "2.0.0" };
    new ServerV2(serverInfo);

    @UseServer(serverInfo)
    class ResourceHandlerV2 {
      @Resource({
        uri: "file:///test-v2.txt",
        name: "test_resource_v2",
      })
      myResource() {
        return "v2 static content";
      }

      @ResourceTemplate({
        uriTemplate: "file:///v2/{path}",
        name: "test_template_v2",
      })
      myTemplate(params: any) {
        return "v2 dynamic content";
      }
    }

    new ResourceHandlerV2();
    expect(mockMcpServer.registerResource).toHaveBeenCalledWith(
      "test_resource_v2",
      "file:///test-v2.txt",
      expect.objectContaining({ description: undefined }),
      expect.any(Function)
    );
    expect(mockMcpServer.registerResource).toHaveBeenCalledWith(
      "test_template_v2",
      "file:///v2/{path}",
      expect.objectContaining({ description: undefined }),
      expect.any(Function)
    );
  });
});
