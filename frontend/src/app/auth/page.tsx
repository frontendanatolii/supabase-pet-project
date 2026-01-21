"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/components/ui/card";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/onboarding");
  }, [user, loading, router]);

  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Card className="w-full max-w-md p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-slate-600">Use email/password or Google OAuth.</p>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          redirectTo={redirectTo}
          appearance={{ theme: ThemeSupa }}
          theme="light"
        />
      </Card>
    </div>
  );
}
