import type { Order } from "@/types/order";

export type MarketplaceConnectionStatus =
  | "connected" | "pending" | "testing" | "failed" | "disabled" | "disconnected";

export interface DashboardSummary {
  totalOrders: number;
  pendingOrders: number;
  connectedMarketplaces: number;
  orderValues: { currency: string | null; total: string }[];
}

export interface MarketplaceSummary {
  id: number;
  name: string;
  slug: string;
  ordersThisMonth: number;
  status: MarketplaceConnectionStatus;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentOrders: Order[];
  marketplaces: MarketplaceSummary[];
  updatedAt: string;
}
