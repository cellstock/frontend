import SectionContent from "./section-content";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    { section: "seller-profile" },
    { section: "orders" },
    { section: "push" },
  ];
}
export default function SectionPage() {
  return <SectionContent />;
}
