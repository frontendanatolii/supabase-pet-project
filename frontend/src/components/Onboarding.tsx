"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/useMe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const { data, isLoading } = useMe();

  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authExchanging, setAuthExchanging] = useState(false);

  // Prevent double-exchange in React StrictMode / re-renders
  const exchangedRef = useRef(false);

  // 1) If we arrived here from OAuth with ?code=..., exchange it for a session.
  useEffect(() => {
    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");
    const oauthErrorDesc = searchParams.get("error_description");

    if (oauthError) {
      setError(decodeURIComponent(oauthErrorDesc ?? oauthError));
      return;
    }

    if (!code) return;
    if (exchangedRef.current) return;

    exchangedRef.current = true;

    (async () => {
      setAuthExchanging(true);
      setError(null);

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        setError(exchangeError.message);
        setAuthExchanging(false);
        return;
      }

      // Refresh data that depends on auth
      await qc.invalidateQueries({ queryKey: ["me"] });

      // Remove code from URL to avoid re-exchanging on refresh
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        url.searchParams.delete("error");
        url.searchParams.delete("error_description");
        window.history.replaceState({}, "", url.toString());
      } catch {
        // ignore
      }

      setAuthExchanging(false);
    })();
  }, [searchParams, qc]);

  // 2) If user already has a team, go to products
  useEffect(() => {
    if (isLoading) return;
    if (data?.team) router.replace("/app/products");
  }, [data, isLoading, router]);

  const createTeam = useMutation({
    mutationFn: async () => {
      setError(null);
      const { data } = await api.post("/team/create", { name: teamName });
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.replace("/app/products");
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to create team"),
  });

  const joinTeam = useMutation({
    mutationFn: async () => {
      setError(null);
      const { data } = await api.post("/team/join", { invite_code: inviteCode });
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.replace("/app/products");
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to join team"),
  });

  const busy = authExchanging || isLoading;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold mb-2">Team onboarding</h1>
        <p className="text-slate-600 mb-6">Create a team or join by invite code.</p>

        {authExchanging ? (
          <div className="mb-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
            Completing sign-in…
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Create a team</h2>
            <div className="grid gap-2">
              <Label htmlFor="teamName">Team name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Acme"
                disabled={busy}
              />
            </div>
            <Button
              className="mt-4"
              onClick={() => createTeam.mutate()}
              disabled={busy || createTeam.isPending || teamName.trim().length === 0}
            >
              {createTeam.isPending ? "Creating..." : "Create"}
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Join a team</h2>
            <div className="grid gap-2">
              <Label htmlFor="invite">Invite code</Label>
              <Input
                id="invite"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. 9f12ab34"
                disabled={busy}
              />
            </div>
            <Button
              className="mt-4"
              onClick={() => joinTeam.mutate()}
              disabled={busy || joinTeam.isPending || inviteCode.trim().length === 0}
            >
              {joinTeam.isPending ? "Joining..." : "Join"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
