"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/useMe";

export default function RequireTeam({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useMe();

  useEffect(() => {
    if (isLoading) return;
    if (isError) return;
    if (!data?.team) router.replace("/onboarding");
  }, [data, isLoading, isError, router]);

  if (isLoading || !data?.team) {
    return <div className="p-6">Loading...</div>;
  }

  return <>{children}</>;
}
