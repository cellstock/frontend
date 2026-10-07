import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LoginContent } from "@/components/auth/login-content";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";
export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage() {
  if ((await cookies()).has(AUTH_TOKEN_COOKIE_NAME)) redirect("/dashboard");
  return <LoginContent />;
}
