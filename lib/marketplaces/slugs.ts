/** Marketplace slug helpers — Back Market uses back-market-eu|na|ap (and legacy back-market). */

export function isRefurbed(slug?: string | null): boolean {
  return (slug ?? "").trim().toLowerCase() === "refurbed";
}

export function isBackMarket(slug?: string | null): boolean {
  return (slug ?? "").trim().toLowerCase().startsWith("back-market");
}

export function isInventoryMarketplace(slug?: string | null): boolean {
  return isRefurbed(slug) || isBackMarket(slug);
}

export function marketplaceLogoPath(slug?: string | null): string {
  return isBackMarket(slug)
    ? "/images/marketplaces/back-market.png"
    : "/images/marketplaces/refurbed.png";
}

export function sameMarketplaceFamily(
  a?: string | null,
  b?: string | null,
): boolean {
  if (isRefurbed(a) && isRefurbed(b)) return true;
  if (isBackMarket(a) && isBackMarket(b)) return true;
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}
