"use client";

import { ArrowRight, Package } from "lucide-react";
import { useParams } from "next/navigation";
import { AddInventoryItemPage } from "@/components/inventory/AddInventoryItemPage";
import { InventoryFilesPage } from "@/components/inventory/InventoryFilesPage";
import { InventoryTablePage } from "@/components/inventory/InventoryTablePage";
import { InventoryDiagnosticsPage } from "@/components/inventory/InventoryDiagnosticsPage";
import { ShippingProfilesPage } from "@/components/inventory/ShippingProfilesPage";

const sectionDetails: Record<string, { title: string; description: string }> = {
  table: {
    title: "Inventory table",
    description:
      "Your marketplace inventory will be displayed and managed here.",
  },
  add: {
    title: "Add an item",
    description: "The product creation workflow will be added here.",
  },
  files: {
    title: "File management",
    description:
      "Inventory files, uploads, and processing history will be managed here.",
  },
  import: {
    title: "Importing your inventory",
    description: "The guided inventory import workflow will be added here.",
  },
  fulfillment: {
    title: "Fulfillment quantity synchronization",
    description:
      "Fulfillment stock synchronization settings will be added here.",
  },
  diagnostics: {
    title: "Diagnosing errors in your offers",
    description:
      "Marketplace offer errors and recommended fixes will be shown here.",
  },
};

export default function InventorySectionPage() {
  const params = useParams<{ section?: string[] }>();
  const key = params.section?.[0] ?? "table";
  const section = sectionDetails[key] ?? sectionDetails.table;

  if (key === "table") return <InventoryTablePage />;
  if (key === "add") return <AddInventoryItemPage />;
  if (key === "files" || key === "import") return <InventoryFilesPage />;
  if (key === "diagnostics") return <InventoryDiagnosticsPage />;
  if (key === "shipping-profiles") return <ShippingProfilesPage />;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-blue-600">Inventory</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          {section.title}
        </h1>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Package className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Page ready for the next step
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {section.description}
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
            Functionality will be added from your next reference{" "}
            <ArrowRight className="h-4 w-4" />
          </p>
        </div>
      </div>
    </main>
  );
}
