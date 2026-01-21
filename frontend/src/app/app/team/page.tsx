"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMe } from "@/hooks/useMe";
import { useMembers } from "@/hooks/useMembers";
import { useAuth } from "@/providers/AuthProvider";
import { useTeamPresence } from "@/hooks/usePresence";

export default function TeamPage() {
  const { user } = useAuth();
  const { data: me } = useMe();
  const team = me?.team;

  const membersQuery = useMembers(Boolean(team));

  const onlineIds = useTeamPresence({
    teamId: team?.id,
    userId: user?.id,
    payload: {
      user_id: user?.id ?? "",
      full_name: me?.profile.full_name,
      email: me?.profile.email,
    },
  });

  const copyInvite = async () => {
    if (!team?.invite_code) return;
    await navigator.clipboard.writeText(team.invite_code);
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">Team</h1>
        <p className="text-sm text-slate-600">Invite code and online presence.</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-600">Team name</div>
            <div className="font-semibold">{team?.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <div>
              <div className="text-sm text-slate-600">Invite code</div>
              <div className="font-mono">{team?.invite_code}</div>
            </div>
            <Button variant="outline" onClick={() => void copyInvite()} disabled={!team?.invite_code}>
              Copy
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>Member</TH>
              <TH>Email</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {(membersQuery.data?.members ?? []).map((m) => {
              const online = onlineIds.has(m.id);
              return (
                <TR key={m.id}>
                  <TD className="font-medium">{m.full_name || m.id}</TD>
                  <TD>{m.email || "-"}</TD>
                  <TD>
                    <Badge className={online ? "text-green-600" : "text-gray-600"}>{online ? "online" : "offline"}</Badge>
                  </TD>
                </TR>
              );
            })}
            {membersQuery.isLoading ? (
              <TR>
                <TD colSpan={3}>Loading...</TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
