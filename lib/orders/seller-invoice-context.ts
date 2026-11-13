import { getSellerProfile } from "@/lib/api/seller-profile";

export type SellerInvoiceContext = {
  contactLines: string[];
  footerLines: string[];
};

function richTextToLines(value: string): string[] {
  const normalized = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  return normalized
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

export async function loadSellerInvoiceContext(): Promise<SellerInvoiceContext> {
  try {
    const response = await getSellerProfile();
    const profile = response.data.profile;
    return {
      contactLines: richTextToLines(profile.contact_information),
      footerLines: richTextToLines(profile.terms_and_conditions).slice(0, 8),
    };
  } catch {
    return { contactLines: [], footerLines: [] };
  }
}
