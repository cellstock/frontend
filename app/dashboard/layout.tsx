import { Suspense, type ReactNode } from "react";
import { DashboardSession } from "@/components/dashboard/dashboard-session";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p role="status">Loading workspace...</p>}>
      <DashboardSession>{children}</DashboardSession>
    </Suspense>
  );
}
