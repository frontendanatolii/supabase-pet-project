import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MembersResponse } from "@/lib/types";

export function useMembers(enabled: boolean) {
  return useQuery({
    queryKey: ["team-members"],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<MembersResponse>("/team/members");
      return data;
    },
  });
}
