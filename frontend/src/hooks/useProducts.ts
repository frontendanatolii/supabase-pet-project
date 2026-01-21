import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProductsResponse } from "@/lib/types";

export type ProductsParams = {
  page: number;
  pageSize: number;
  status: string;
  q: string;
  createdBy: string;
  updatedFrom: string;
  updatedTo: string;
};

export function useProducts(params: ProductsParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => {
      const { data } = await api.get<ProductsResponse>("/products", {
        params: {
          page: params.page,
          pageSize: params.pageSize,
          status: params.status,
          q: params.q,
          createdBy: params.createdBy || undefined,
          updatedFrom: params.updatedFrom || undefined,
          updatedTo: params.updatedTo || undefined,
        },
      });
      return data;
    },
  });
}
