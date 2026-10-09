import SectionContent from "./section-content";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    { section: [] },
    { section: ["repricing"] },
    { section: ["repricing", "strategies"] },
    { section: ["repricing", "schedule"] },
  ];
}
export default function SectionPage() {
  return <SectionContent />;
}
