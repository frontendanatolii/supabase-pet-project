"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/auth?error=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      router.replace("/onboarding");
    })();
  }, [router]);

  return <div className="min-h-screen grid place-items-center">Finishing sign in…</div>;
}
