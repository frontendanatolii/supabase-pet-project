import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MeResponse } from "@/lib/types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get<MeResponse>("/me");
      return data;
    },
  });
}
