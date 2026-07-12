import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ServerMetadata,
  RegisterServerOptions,
  UseServerOptions,
} from "../types/index.js";
import { z } from "zod";

const serverRegistry = new Map<string, ServerMetadata[]>();

/**
 * Registers a server with the given options.
 * Stores the server metadata in a registry.
 * Throws an error if a server with the same name and version is already registered.
 * @param options - Options for registering the server (name, version).
 * @param server - The server instance to register.
 */
export function registerServer(
  options: RegisterServerOptions,
  server: any
): void {
  const { name, version } = options;
  const serverMetadata: ServerMetadata = { name, version, server };
  const existingServers = serverRegistry.get(name) || [];

  const alreadyRegistered = existingServers.some(
    (s) => s.version === version
  );

  if (alreadyRegistered) {
    throw new Error(
      `Server with name "${name}" and version "${version}" is already registered.`
    );
  }

  serverRegistry.set(name, [...existingServers, serverMetadata]);
}

/**
 * Retrieves a registered server based on the provided options.
 * Returns the server instance if found, otherwise undefined.
 * If a version is specified, it returns the server with that specific version.
 * If no version is specified and only one version is registered, it returns that server.
 * Otherwise, it returns undefined.
 * @param options - Options for retrieving the server (name, optional version).
 * @returns The registered server instance or undefined.
 */
export function getServer(options: UseServerOptions): any | undefined {
  const { name, version } = options;
  const serverMetadataList = serverRegistry.get(name) as Array<ServerMetadata>;

  if (!serverMetadataList || serverMetadataList.length === 0) {
    return undefined;
  }

  if (version) {
    const foundServer = serverMetadataList.find((s) => s.version === version);
    return foundServer?.server;
  }

  if (serverMetadataList.length === 1) {
    return serverMetadataList[0].server;
  }

  if(!version){
    console.log(`Server version not passed, will return same name version ${serverMetadataList[0].name} with index 0 found in registry.`)
  }
  return serverMetadataList[0].server; // No specific version requested and multiple versions exist
}

/**
 * Metadata registration structure for server instances.
 * Stores decorators data globally mapped to their respective server.
 */
export interface ServerRegistration {
  server: any;
  tools: Map<string, { options: any; handler: Function }>;
  prompts: Map<string, { options: any; handler: Function }>;
  resources: Map<string, { options: any; handler: Function }>;
  resourceTemplates: Map<string, { options: any; handler: Function }>;
  subscribers: Map<string, Set<string>>; // uri -> Set of sessionIds
  subscribeHandler?: Function;
  unsubscribeHandler?: Function;
  completionHandlers: Array<{ ref: any; handler: Function }>;
}

const activeServers = new Map<any, ServerRegistration>();

/**
 * Get or create server registration details for tracking decorator features.
 */
export function getOrCreateServerRegistration(server: any): ServerRegistration {
  let reg = activeServers.get(server);
  if (!reg) {
    reg = {
      server,
      tools: new Map(),
      prompts: new Map(),
      resources: new Map(),
      resourceTemplates: new Map(),
      subscribers: new Map(),
      completionHandlers: [],
    };
    activeServers.set(server, reg);
  }
  return reg;
}

/**
 * Match a URI against a URI template and extract parameters.
 * E.g. template: "mysql://{tableName}/schema" matches uri: "mysql://users/schema"
 * and returns { tableName: "users" }.
 */
export function matchUriTemplate(template: string, uri: string): Record<string, string> | null {
  const paramNames: string[] = [];
  const regexStr = "^" + template
    .replace(/[.+*?^$()|[\]\\\/\s]/g, "\\$&") // Escape regex special chars except {}
    .replace(/\{([^}]+)\}/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    }) + "$";

  const regex = new RegExp(regexStr);
  const match = uri.match(regex);
  if (!match) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = match[i + 1];
  }
  return params;
}

/**
 * Helper to notify clients that a resource has updated.
 */
export async function notifyResourceUpdated(server: any, uri: string): Promise<void> {
  const underlyingServer = server.server || server;
  await underlyingServer.notification({
    method: "notifications/resources/updated",
    params: { uri }
  });
}

/**
 * Helper to send progress notifications to a client from a server handler.
 */
export async function sendProgress(
  server: any,
  progressToken: string | number,
  progress: number,
  total?: number,
  message?: string
): Promise<void> {
  const underlyingServer = server.server || server;
  await underlyingServer.notification({
    method: "notifications/progress",
    params: {
      progressToken,
      progress,
      total,
      message
    }
  });
}

/**
 * Helper to send logging messages/notifications from a server.
 */
export async function sendLoggingMessage(
  server: any,
  level: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency",
  data: unknown,
  logger?: string
): Promise<void> {
  const underlyingServer = server.server || server;
  await underlyingServer.notification({
    method: "notifications/message",
    params: {
      level,
      data,
      logger
    }
  });
}

/**
 * Helper to request elicitation (input/form) from the client.
 */
export async function elicitInput(
  server: any,
  params: {
    mode: "form" | "url";
    message?: string;
    requestedSchema?: Record<string, unknown>;
    url?: string;
  },
  options?: any
): Promise<any> {
  const underlyingServer = server.server || server;
  return underlyingServer.request(
    {
      method: "elicitation/create",
      params
    },
    z.any(),
    options
  );
}