import Image, { type ImageProps } from "next/image";
import { publicPath } from "@/lib/public-path";

export default function AppImage({ src, alt, ...props }: ImageProps) {
  return <Image {...props} alt={alt} src={typeof src === "string" ? publicPath(src) : src} />;
}
