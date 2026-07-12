import { jest, describe, it, expect } from "@jest/globals";
import { RegisterClient, UseClient, CallTool, ListTools } from "../../src/client/decorators/client.decorator.js";
import { getClient } from "../../src/client/utils/clientRegistry.js";

describe("Client Use and Register Decorators", () => {
  it("should register a client using @RegisterClient", () => {
    @RegisterClient()
    class MockClient {
      constructor(clientInfo?: any) {}
      connect = jest.fn();
    }

    const clientInfo = { name: "register-test-client", version: "2.0.0" };
    const instance = new MockClient(clientInfo);

    const retrieved = getClient(clientInfo);
    expect(retrieved).toBe(instance);
  });

  it("should inject client and wrap calls with request decorators", async () => {
    const mockClientInstance = {
      connect: jest.fn(),
      request: jest.fn().mockResolvedValue({ success: true } as any),
    };

    @RegisterClient()
    class TargetClient {
      constructor(clientInfo?: any) {}
      connect = jest.fn();
      request = mockClientInstance.request;
    }
    const targetClientInstance = new TargetClient({ name: "use-test-client", version: "2.0.0" });

    @UseClient({ name: "use-test-client", version: "2.0.0" })
    class ClientHandler {
      client: any;

      @ListTools()
      async getTools() {
        return { customOpt: true };
      }

      @CallTool("custom_tool_name")
      async runTool(args: any) {
        return args;
      }
    }

    const handler = new ClientHandler();
    expect(handler.client).toBe(targetClientInstance);

    // Call @ListTools method
    await handler.getTools();
    expect(mockClientInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "tools/list", params: { customOpt: true } }),
      expect.any(Object),
      undefined
    );

    // Call @CallTool method
    await handler.runTool({ a: 1 });
    expect(mockClientInstance.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "tools/call", params: { name: "custom_tool_name", arguments: { a: 1 } } }),
      expect.any(Object),
      undefined
    );
  });

  it("should throw an error if method is called without UseClient context", async () => {
    class RawHandler {
      client: any = null;

      @ListTools()
      async getTools() {}
    }

    const handler = new RawHandler();
    await expect(handler.getTools()).rejects.toThrow(
      "Client instance not injected. Make sure class is decorated with @UseClient."
    );
  });
});
