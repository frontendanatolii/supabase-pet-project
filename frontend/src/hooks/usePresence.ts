
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type PresencePayload = {
  user_id: string;
  full_name?: string | null;
  email?: string | null;
};

export function useTeamPresence(opts: {
  teamId: string | null | undefined;
  userId: string | null | undefined;
  payload: PresencePayload;
}) {
  const { teamId, userId, payload } = opts;
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!teamId || !userId) return;

    const channel = supabase.channel(`team:${teamId}`, {
      config: {
        presence: { key: userId },
      },
    });

    const recompute = () => {
      const state = channel.presenceState();
      const ids = new Set<string>();
      for (const key of Object.keys(state)) {
        ids.add(key);
      }
      setOnlineIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, recompute)
      .on("presence", { event: "join" }, recompute)
      .on("presence", { event: "leave" }, recompute);

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      await channel.track(payload);
      recompute();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, userId, payload.user_id]);

  return onlineIds;
}
