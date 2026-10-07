export const MARKETPLACE_CAPABILITIES = [
  "orders",
  "products",
  "inventory",
] as const;

export type MarketplaceCapability =
  (typeof MARKETPLACE_CAPABILITIES)[number];

export const CONNECTION_STATUSES = [
  "connected",
  "failed",
  "disconnected",
  "testing",
] as const;

export type MarketplaceConnectionStatus =
  (typeof CONNECTION_STATUSES)[number];

export const SYNC_TYPES = [
  "full",
  "orders",
  "products",
  "inventory",
] as const;

export type SyncType = (typeof SYNC_TYPES)[number];

export const SYNC_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;

export type SyncStatus = (typeof SYNC_STATUSES)[number];

export interface MarketplaceSettings {
  sync_orders: boolean;
  sync_products: boolean;
  sync_inventory: boolean;
  markets?: MarketplaceMarketSetting[];
}

export interface MarketplaceMarket {
  code: string;
  name: string;
  currency_code: string | null;
}

export interface MarketplaceMarketSetting extends MarketplaceMarket {
  manage_orders: boolean;
  manage_offers: boolean;
}

export interface MarketplaceConnectionOptionsResponse {
  success: boolean;
  message: string;
  data: { markets: MarketplaceMarket[] };
}

export interface MarketplaceConnection {
  id: number;
  account_name: string;
  external_account_id: string | null;
  status: MarketplaceConnectionStatus;
  status_label: string;
  settings: MarketplaceSettings;
  last_tested_at: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Marketplace {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  capabilities: MarketplaceCapability[];
  is_active: boolean;
  is_connected: boolean;
  connection: MarketplaceConnection | null;
}

export interface MarketplaceListData {
  connected: Marketplace[];
  available: Marketplace[];
}

export interface MarketplaceListResponse {
  success: boolean;
  message: string;
  data: MarketplaceListData;
}

export interface MarketplaceData {
  marketplace: Marketplace;
}

export interface MarketplaceResponse {
  success: boolean;
  message: string;
  data: MarketplaceData;
}

export interface MarketplaceCredentials {
  api_key: string;
}

export interface ConnectMarketplaceRequest {
  account_name: string;
  credentials: MarketplaceCredentials;
  settings: MarketplaceSettings;
}

export interface UpdateMarketplaceConnectionRequest {
  account_name: string;
  settings: MarketplaceSettings;
  credentials?: MarketplaceCredentials;
}

export interface SyncMarketplaceRequest {
  type: SyncType;
}

export interface SyncRun {
  id: number;
  type: SyncType;
  status: SyncStatus;
  processed_count: number | null;
  success_count: number | null;
  failed_count: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string | null;
}

export interface SyncRunData {
  sync_run: SyncRun;
}

export interface SyncMarketplaceResponse {
  success: boolean;
  message: string;
  data: SyncRunData;
}

export type ValidationErrors = Record<string, string[]>;

export interface ApiErrorResponse {
  success?: boolean;
  message: string;
  errors?: ValidationErrors;
}

export interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

export interface MarketplaceActionResponse extends ApiSuccessResponse {
  data?: MarketplaceData;
}

export interface MarketplaceFormValues {
  account_name: string;
  api_key: string;
  settings: MarketplaceSettings;
}
