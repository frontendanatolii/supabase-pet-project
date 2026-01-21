"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    const code = params.get("code");

    if (error) {
      router.replace(`/auth?error=${encodeURIComponent(errorDescription ?? error)}`);
      return;
    }

    if (!code) {
      router.replace("/auth");
      return;
    }

    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        router.replace(`/auth?error=${encodeURIComponent(error.message)}`);
        return;
      }

      router.replace("/onboarding");
    })();
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="text-sm text-slate-700">Signing you in…</div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="text-sm text-slate-700">Signing you in…</div>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
