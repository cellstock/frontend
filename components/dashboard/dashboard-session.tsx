"use client";
import { apiFetch, publicPath } from "@/lib/public-path";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { formatUserRole, getUserInitials } from "@/lib/auth/user-display";
import type { AuthenticatedUser } from "@/types/auth";

export function DashboardSession({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const pathname = usePathname().replace(/\/$/, "");
  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await apiFetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const result = await response.json();
        if (!response.ok || !result.success || !result.data?.user)
          throw new Error(result.message || "Unable to check your session.");
        if (result.data.user.status !== "active") {
          window.location.replace(publicPath("/api/auth/clear-session"));
          return;
        }
        setUser(result.data.user);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to connect to the API.",
          );
      }
    }
    void loadSession();
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (user?.roleSlug === "user" && pathname === "/dashboard")
      router.replace("/dashboard/subscription");
  }, [user, pathname, router]);

  if (error)
    return (
      <main className="p-8 text-center">
        <p role="alert">{error}</p>
        <button
          className="mt-4 underline"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
        <a className="ml-4 underline" href={publicPath("/login/")}>
          Sign in
        </a>
      </main>
    );
  if (!user || (user.roleSlug === "user" && pathname === "/dashboard"))
    return (
      <p role="status" className="p-8 text-center">
        Loading workspace...
      </p>
    );
  const displayUser = {
    ...user,
    role: formatUserRole(user.role),
    initials: getUserInitials(user.name),
  };
  return (
    <DashboardProvider key={user.id} user={user}>
      <DashboardShell user={displayUser}>{children}</DashboardShell>
    </DashboardProvider>
  );
}
