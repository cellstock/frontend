import { Suspense, type ReactNode } from "react";
import { DashboardSession } from "@/components/dashboard/dashboard-session";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardSession>{children}</DashboardSession>
    </Suspense>
  );
}
