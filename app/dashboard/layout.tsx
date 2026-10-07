import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { DashboardProvider } from "@/components/dashboard/dashboard-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AuthApiError, getCurrentUserFromToken } from "@/lib/auth/auth-server";
import { AUTH_TOKEN_COOKIE_NAME, LOGIN_ROUTE } from "@/lib/auth/constants";
import { formatUserRole, getUserInitials } from "@/lib/auth/user-display";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: Readonly<DashboardLayoutProps>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    redirect(LOGIN_ROUTE);
  }

  let authenticatedUser;
  try {
    authenticatedUser = await getCurrentUserFromToken(token);
  } catch (error) {
    if (error instanceof AuthApiError && error.status === 401) {
      redirect("/api/auth/clear-session");
    }
    throw error;
  }
  if (authenticatedUser.status !== "active")
    redirect("/api/auth/clear-session");
  const user = {
    id: authenticatedUser.id,
    name: authenticatedUser.name,
    email: authenticatedUser.email,
    role: formatUserRole(authenticatedUser.role),
    roleSlug: authenticatedUser.roleSlug,
    initials: getUserInitials(authenticatedUser.name),
    lastLoginAt: authenticatedUser.lastLoginAt,
    hasAvatar: authenticatedUser.hasAvatar,
  };
  return (
    <DashboardProvider key={authenticatedUser.id} user={authenticatedUser}>
      <DashboardShell user={user}>{children}</DashboardShell>
    </DashboardProvider>
  );
}
