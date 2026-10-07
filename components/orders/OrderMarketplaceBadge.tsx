import { Store } from "lucide-react";
import Image from "next/image";

import type { OrderMarketplace } from "@/types/order";

interface OrderMarketplaceBadgeProps {
  marketplace: OrderMarketplace;
  compact?: boolean;
}

export function OrderMarketplaceBadge({
  marketplace,
  compact = false,
}: OrderMarketplaceBadgeProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white ${
          compact ? "h-8 w-8" : "h-10 w-10"
        }`}
      >
        {marketplace.logo ? (
          <Image
            src={marketplace.logo}
            alt={`${marketplace.name} logo`}
            width={compact ? 24 : 32}
            height={compact ? 24 : 32}
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <Store
            className={`text-slate-400 ${compact ? "h-4 w-4" : "h-5 w-5"}`}
          />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">
          {marketplace.name}
        </p>

        {!compact && (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {marketplace.slug}
          </p>
        )}
      </div>
    </div>
  );
}
