import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  ClientMetadata,
  RegisterClientOptions,
  UseClientOptions,
} from "../types/index.js";

const clientRegistry = new Map<string, ClientMetadata[]>();

/**
 * Registers a client instance in the global registry.
 */
export function registerClient(
  options: RegisterClientOptions,
  client: any
): void {
  const { name, version } = options;
  const clientMetadata: ClientMetadata = { name, version, client };
  const existingClients = clientRegistry.get(name) || [];

  const alreadyRegistered = existingClients.some(
    (c) => c.version === version
  );

  if (alreadyRegistered) {
    throw new Error(
      `Client with name "${name}" and version "${version}" is already registered.`
    );
  }

  clientRegistry.set(name, [...existingClients, clientMetadata]);
}

/**
 * Retrieves a registered client instance.
 */
export function getClient(options: UseClientOptions): any | undefined {
  const { name, version } = options;
  const clientMetadataList = clientRegistry.get(name) as Array<ClientMetadata>;

  if (!clientMetadataList || clientMetadataList.length === 0) {
    return undefined;
  }

  if (version) {
    const foundClient = clientMetadataList.find((c) => c.version === version);
    return foundClient?.client;
  }

  if (clientMetadataList.length === 1) {
    return clientMetadataList[0].client;
  }

  return clientMetadataList[0].client;
}
