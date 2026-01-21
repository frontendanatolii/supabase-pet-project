"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/useProducts";
import { useMembers } from "@/hooks/useMembers";
import { useMe } from "@/hooks/useMe";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

export default function ProductsPage() {
  const { data: me } = useMe();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [status, setStatus] = useState("all");

  // Keep raw input separate from the query param
  const [qInput, setQInput] = useState("");
  const q = useDebouncedValue(qInput, 350);

  const [createdBy, setCreatedBy] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  const membersQuery = useMembers(Boolean(me?.team));
  const productsQuery = useProducts({
    page,
    pageSize,
    status,
    q,
    createdBy,
    updatedFrom,
    updatedTo,
  });

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Reset to first page when debounced search term actually changes
  useEffect(() => {
    setPage(1);
  }, [q]);

  // Keep page within bounds after results change
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-slate-600">
            Search, filter, and manage team products.
          </p>
        </div>
        <Link href="/app/products/new">
          <Button>Create product</Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search"
          />

          <Select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="deleted">Deleted</option>
          </Select>

          <Select
            value={createdBy}
            onChange={(e) => {
              setPage(1);
              setCreatedBy(e.target.value);
            }}
          >
            <option value="">All creators</option>
            {(membersQuery.data?.members ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email || m.id}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <Input
              type="datetime-local"
              value={updatedFrom}
              onChange={(e) => {
                setPage(1);
                setUpdatedFrom(e.target.value);
              }}
              title="Updated from"
            />
            <Input
              type="datetime-local"
              value={updatedTo}
              onChange={(e) => {
                setPage(1);
                setUpdatedTo(e.target.value);
              }}
              title="Updated to"
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Creator</TH>
              <TH>Updated</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {(productsQuery.data?.items ?? []).map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">{p.title}</TD>
                <TD>
                  <Badge>
                    {p.status}
                  </Badge>
                </TD>
                <TD>{p.creator?.full_name || p.creator?.email || p.created_by}</TD>
                <TD>{fmtDate(p.updated_at)}</TD>
                <TD className="text-right">
                  <Link href={`/app/products/${p.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </TD>
              </TR>
            ))}

            {productsQuery.isLoading ? (
              <TR>
                <TD colSpan={5}>Loading...</TD>
              </TR>
            ) : null}

            {!productsQuery.isLoading &&
            (productsQuery.data?.items?.length ?? 0) === 0 ? (
              <TR>
                <TD colSpan={5}>No products found.</TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Page {page} of {totalPages} · {total} total
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
