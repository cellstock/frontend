import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SignupContent } from "@/components/auth/signup-content";
import { AUTH_TOKEN_COOKIE_NAME } from "@/lib/auth/constants";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if ((await cookies()).has(AUTH_TOKEN_COOKIE_NAME)) redirect("/dashboard");
  return <SignupContent />;
}
