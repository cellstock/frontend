import type { Metadata } from "next";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";
import { getCurrentUserFromToken } from "@/lib/auth/auth-server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE_NAME)?.value;
  if (token && (await getCurrentUserFromToken(token)).roleSlug === "user")
    redirect("/dashboard/subscription");
  return <DashboardContent />;
}
