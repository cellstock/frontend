import SectionContent from "./section-content";
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ section: "orders" }];
}
export default function SectionPage() {
  return <SectionContent />;
}
