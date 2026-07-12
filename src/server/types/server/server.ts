/**
 * @description
 * This interface defines the options for registering a server.
 * The name is a required field, while the version is optional.
 * additional properties can be added as needed.
 */
interface BaseServer {
  name: string;
  version?: string;
  [key: string]: any;
}

/**
 * @description
 * This interface defines the options for registering a server.
 * The name is a required field, while the version is optional.
 */
export interface RegisterServerOptions extends BaseServer {}

/**
 * @description
 * This interface defines the options for using a server.
 * The name is a required field, while the version is optional.
 */
export interface UseServerOptions extends BaseServer {}

/**
 * @description
 * This interface defines the metadata for a server.
 * It includes the server name is required, version is optional, and the server instance itself.
 */
export interface ServerMetadata extends BaseServer {
  server: any;
}
