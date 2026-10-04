/**
 * @description
 * Base options for server identification.
 * The name is a required field, while the version is optional.
 * Additional properties can be added as needed.
 */
interface BaseServer {
  name: string;
  version?: string;
  [key: string]: any;
}

/**
 * @description
 * Options for registering an MCP server instance with `@RegisterServer()`.
 *
 * @note
 * In `@modelcontextprotocol/sdk` >= 1.32.0, the low-level `Server` class is deprecated.
 * You should use `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`.
 * Support for legacy `Server` will be completely removed in the next major version.
 */
export interface RegisterServerOptions extends BaseServer {}

/**
 * @description
 * Options for binding decorator handlers to a server instance with `@UseServer()`.
 *
 * @note
 * Targets servers registered via `@RegisterServer()`. Works with both `McpServer`
 * (recommended) and legacy `Server` (deprecated).
 */
export interface UseServerOptions extends BaseServer {}

/**
 * @description
 * Metadata stored for a registered server instance.
 * Stores server name, version, and the server instance (`McpServer` or legacy `Server`).
 */
export interface ServerMetadata extends BaseServer {
  server: any;
}

