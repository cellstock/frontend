export interface InventoryOffer {
  id: string;
  created_at?: string;
  instance_id: string;
  instance_name: string;
  state: string;
  sku: string;
  grading: string;
  warranty: string;
  taxation?: string;
  stock: number;
  shipping_profile_id: string;
  reference_currency_code: string;
  reference_price: string;
  reference_min_price?: string | null;
  ean?: string | null;
  tags: string[];
  online_price?: string | null;
  repriced_price?: string | null;
  selected_competitor?: string | null;
  sales_rank?: string | number | null;
  buy_box?: boolean;
  lowest_price?: string | null;
  price_locked: boolean;
  pending_upload: boolean;
  is_active: boolean;
}

export interface InventoryOfferDetails extends InventoryOffer {
  listing_details: Record<string, string>;
  market_codes: string[];
  markets: InventoryMarket[];
  marketplace: {
    name: string;
    slug: string;
    logo?: string | null;
    account_name?: string | null;
  };
}

export interface InventoryMarket {
  code: string;
  name: string;
  currency_code?: string | null;
}

export interface InventoryResponse {
  success: boolean;
  data: {
    offers: InventoryOffer[];
    marketplace: {
      name: string;
      slug: string;
      logo?: string | null;
      account_name?: string | null;
    };
    markets: InventoryMarket[];
    selected_market?: string | null;
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      from: number | null;
      to: number | null;
    };
  };
}

export interface InventoryInstance {
  id: string;
  name: string;
  name_de?: string;
  category?: string;
  attributes?: string;
  attributes_de?: string;
  gtin?: string;
  mpn?: string;
}
