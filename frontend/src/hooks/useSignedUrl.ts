import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: Boolean(path),
    queryFn: async () => {
      const { data } = await api.post<{ url: string }>("/storage/signed-download", { path });
      return data.url;
    },
  });
}
