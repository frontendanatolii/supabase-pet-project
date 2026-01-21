"use client";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useProduct } from "@/hooks/useProduct";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id;

  const productQuery = useProduct(id);
  const product = productQuery.data;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!product) return;
    setTitle(product.title);
    setDescription(product.description || "");
    setImagePath(product.image_path || null);
  }, [product?.id]);

  const signedUrlQuery = useSignedUrl(imagePath);

  const canEdit = product?.status === "draft";

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      const { data } = await api.patch(`/products/${id}`, {
        title,
        description: description || null,
        image_path: imagePath,
      });
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["product", id] });
      await qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to save"),
  });

  const activate = useMutation({
    mutationFn: async () => {
      setError(null);
      const { data } = await api.post(`/products/${id}/activate`);
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["product", id] });
      await qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to activate"),
  });

  const del = useMutation({
    mutationFn: async () => {
      setError(null);
      const { data } = await api.post(`/products/${id}/delete`);
      return data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["products"] });
      router.replace("/app/products");
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to delete"),
  });

  const uploadImage = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const { data } = await api.post<{ path: string; token: string }>("/storage/signed-upload", {
        filename: file.name,
        contentType: file.type,
      });

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .uploadToSignedUrl(data.path, data.token, file, {
          contentType: file.type || "application/octet-stream",
        });

      if (uploadErr) throw uploadErr;
      setImagePath(data.path);
    } catch (e: any) {
      setError(e?.message ?? "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!imagePath) return;
    setError(null);
    try {
      const { error: rmErr } = await supabase.storage.from("product-images").remove([imagePath]);
      if (rmErr) throw rmErr;
      setImagePath(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to remove image");
    }
  };

  if (productQuery.isLoading) return <div>Loading...</div>;
  if (productQuery.isError || !product) return <div>Not found</div>;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{product.title}</h1>
          <div className="mt-1">
            <Badge>
              {product.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <Card className="p-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} disabled={!canEdit} onChange={(e) => setDescription(e.target.value)} rows={6} />
        </div>

        <div className="grid gap-2">
          <Label>Image</Label>
          {imagePath ? (
            <div className="grid gap-2">
              <div className="text-xs text-slate-600">{imagePath}</div>
              {signedUrlQuery.data ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={signedUrlQuery.data} alt="product" className="max-h-64 rounded-md border" />
              ) : (
                <div className="text-xs text-slate-600">Loading signed url...</div>
              )}

              {canEdit ? (
                <div>
                  <Button variant="outline" onClick={() => void removeImage()}>
                    Remove image
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-slate-600">No image</div>
          )}

          {canEdit ? (
            <Input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file);
              }}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button disabled={save.isPending || title.trim().length === 0} onClick={() => save.mutate()}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          ) : null}

          {product.status === "draft" ? (
            <Button disabled={activate.isPending} onClick={() => activate.mutate()}>
              {activate.isPending ? "Activating..." : "Activate"}
            </Button>
          ) : null}

          {product.status !== "deleted" ? (
            <Button variant="destructive" disabled={del.isPending} onClick={() => del.mutate()}>
              {del.isPending ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>

        <div className="text-xs text-slate-600">
          Created: {new Date(product.created_at).toLocaleString()} · Updated: {new Date(product.updated_at).toLocaleString()}
        </div>
      </Card>
    </div>
  );
}
