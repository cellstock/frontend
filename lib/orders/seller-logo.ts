import { apiFetch, publicPath } from "@/lib/public-path";
import { getSellerProfile } from "@/lib/api/seller-profile";

export type SellerLogoPdfAsset = {
  name: "ImLogo";
  pixelWidth: number;
  pixelHeight: number;
  displayWidth: number;
  displayHeight: number;
  bytes: Uint8Array;
  filter: "DCTDecode";
};

const MAX_DISPLAY_WIDTH = 240;
const MAX_DISPLAY_HEIGHT = 72;

export async function loadSellerLogoForPdf(): Promise<SellerLogoPdfAsset | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  try {
    const profileResponse = await getSellerProfile();
    if (!profileResponse.data.profile.has_logo) {
      return null;
    }

    const response = await apiFetch(publicPath("/api/seller-profile/logo"), {
      credentials: "include",
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }

    const source = await response.blob();
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(
      MAX_DISPLAY_WIDTH / bitmap.width,
      MAX_DISPLAY_HEIGHT / bitmap.height,
      1,
    );
    const displayWidth = Math.max(1, Math.round(bitmap.width * scale));
    const displayHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    context.drawImage(bitmap, 0, 0, displayWidth, displayHeight);
    bitmap.close();

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
    if (!jpegBlob) {
      return null;
    }

    const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
    if (bytes.length === 0) {
      return null;
    }

    return {
      name: "ImLogo",
      pixelWidth: displayWidth,
      pixelHeight: displayHeight,
      displayWidth,
      displayHeight,
      bytes,
      filter: "DCTDecode",
    };
  } catch {
    return null;
  }
}
