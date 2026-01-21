"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/auth");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="p-6">Loading...</div>;
  }

  return <>{children}</>;
}
