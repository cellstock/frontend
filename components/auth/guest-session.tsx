"use client";
import { apiFetch } from "@/lib/public-path";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
export function GuestSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void apiFetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        if (result.success && result.data?.user?.status === "active")
          router.replace("/dashboard");
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [router]);
  return children;
}
