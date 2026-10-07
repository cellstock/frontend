"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useContext, type ComponentProps } from "react";
import { CacheContext } from "@/components/dashboard/dashboard-provider";
import { getDashboardData } from "@/lib/dashboard/dashboard-data";
import { getMarketplace, getMarketplaces } from "@/lib/api/marketplaces";
import { getOrder, getOrders } from "@/lib/api/orders";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  return pending ? (
    <FullScreenTransition
      title="Opening page"
      description="Please wait while CelleXa prepares your content."
    />
  ) : null;
}

export default function AppLink({
  href,
  children,
  onMouseEnter,
  onFocus,
  prefetch,
  ...props
}: ComponentProps<typeof NextLink>) {
  const cache = useContext(CacheContext);
  function warmData() {
    if (!cache || typeof href !== "string" || !href.startsWith("/dashboard"))
      return;
    const url = new URL(href, window.location.origin);
    if (url.pathname === "/dashboard")
      void cache.fetch("dashboard", getDashboardData);
    else if (url.pathname === "/dashboard/marketplaces")
      void cache.fetch("marketplaces", getMarketplaces);
    else if (url.pathname === "/dashboard/orders") {
      const filters = Object.fromEntries(url.searchParams);
      void cache.fetch(`orders?${url.searchParams.toString()}`, (signal) =>
        getOrders(
          {
            ...filters,
            page: Number(url.searchParams.get("page")) || 1,
            per_page: Number(url.searchParams.get("per_page")) || 20,
          },
          signal,
        ),
      );
    } else {
      const order = url.pathname.match(/^\/dashboard\/orders\/(\d+)$/);
      const marketplace = url.pathname.match(
        /^\/dashboard\/marketplaces\/([^/]+)$/,
      );
      if (order)
        void cache.fetch(`order:${order[1]}`, (signal) =>
          getOrder(order[1], signal),
        );
      if (marketplace) {
        const slug = decodeURIComponent(marketplace[1]);
        void cache.fetch(`marketplace:${slug}`, (signal) =>
          getMarketplace(slug, signal),
        );
      }
    }
  }
  return (
    <NextLink
      {...props}
      href={href}
      prefetch={prefetch ?? true}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        warmData();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        warmData();
      }}
    >
      {children}
      <NavigationFeedback />
    </NextLink>
  );
}
