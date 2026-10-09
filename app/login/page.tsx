import type { Metadata } from "next";
import { LoginContent } from "@/components/auth/login-content";
import { GuestSession } from "@/components/auth/guest-session";
export const metadata: Metadata = { title: "Sign in" };
export default function LoginPage() {
  return (
    <GuestSession>
      <LoginContent />
    </GuestSession>
  );
}
