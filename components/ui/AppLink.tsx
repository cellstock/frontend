import type { ComponentProps } from "react";
import { publicPath } from "@/lib/public-path";

/** Load exported HTML directly and preserve native new-tab navigation. */
export default function AppLink({
  href,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { href: string }) {
  let destination = href;
  if (href.startsWith("/") && !href.startsWith("//")) {
    const separator = href.search(/[?#]/);
    const path = separator < 0 ? href : href.slice(0, separator);
    const suffix = separator < 0 ? "" : href.slice(separator);
    const pagePath = path.endsWith("/") || /\.[^/]+$/.test(path)
      ? path
      : `${path}/`;
    destination = publicPath(pagePath + suffix);
  }
  return <a {...props} href={destination} />;
}
