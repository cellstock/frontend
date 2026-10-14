import Image, { type ImageProps } from "next/image";
import { publicPath } from "@/lib/public-path";

const marketplaceLogos: Record<string, string> = {
  "/images/marketplaces/refurbed.svg": "/images/marketplaces/refurbed.png",
  "/images/marketplaces/back-market.svg": "/images/marketplaces/back-market.png",
  "/images/marketplaces/back-market.jpg": "/images/marketplaces/back-market.png",
};

export default function AppImage({ src, alt, ...props }: ImageProps) {
  return <Image {...props} alt={alt} src={typeof src === "string" ? publicPath(marketplaceLogos[src] ?? src) : src} />;
}
