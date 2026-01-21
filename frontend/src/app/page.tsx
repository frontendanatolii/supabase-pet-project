"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useMe } from "@/hooks/useMe";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    if (me.isLoading) return;
    if (me.data?.team) router.replace("/app/products");
    else router.replace("/onboarding");
  }, [user, loading, me.isLoading, me.data?.team, router]);

  return <div className="p-6">Loading...</div>;
}
