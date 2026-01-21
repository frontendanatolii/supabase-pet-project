"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMe } from "@/hooks/useMe";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading } = useMe();

  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold mb-2">Team onboarding</h1>
        <p className="text-slate-600 mb-6">Create a team or join by invite code.</p>

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold mb-3">Create a team</h2>
            <div className="grid gap-2">
              <Label htmlFor="teamName">Team name</Label>
              <Input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Acme" />
            </div>
            <Button
              className="mt-4"
              onClick={() => createTeam.mutate()}
              disabled={createTeam.isPending || teamName.trim().length === 0}
            >
              {createTeam.isPending ? "Creating..." : "Create"}
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">Join a team</h2>
            <div className="grid gap-2">
              <Label htmlFor="invite">Invite code</Label>
              <Input id="invite" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="e.g. 9f12ab34" />
            </div>
            <Button
              className="mt-4"
              onClick={() => joinTeam.mutate()}
              disabled={joinTeam.isPending || inviteCode.trim().length === 0}
            >
              {joinTeam.isPending ? "Joining..." : "Join"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
