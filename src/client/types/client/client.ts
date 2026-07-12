interface BaseClient {
  name: string;
  version?: string;
  [key: string]: any;
}

export interface RegisterClientOptions extends BaseClient {}
export interface UseClientOptions extends BaseClient {}
export interface ClientMetadata extends BaseClient {
  client: any;
}
