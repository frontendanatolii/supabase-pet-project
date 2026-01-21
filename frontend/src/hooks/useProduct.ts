import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ["product", productId],
    enabled: Boolean(productId),
    queryFn: async () => {
      const { data } = await api.get<{ product: Product }>(`/products/${productId}`);
      return data.product;
    },
  });
}
