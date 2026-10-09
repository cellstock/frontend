import SectionContent from "./section-content";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    { section: [] },
    { section: ["table"] },
    { section: ["add"] },
    { section: ["files"] },
    { section: ["import"] },
    { section: ["fulfillment"] },
    { section: ["diagnostics"] },
    { section: ["shipping-profiles"] },
  ];
}
export default function SectionPage() {
  return <SectionContent />;
}
