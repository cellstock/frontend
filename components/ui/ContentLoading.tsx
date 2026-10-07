"use client";
import { FullScreenTransition } from "@/components/ui/full-screen-transition";

export function ContentLoading({
  label = "Loading content",
}: {
  label?: string;
}) {
  return (
    <FullScreenTransition
      title={label}
      description="Please wait while CelleXa prepares your content."
    />
  );
}
