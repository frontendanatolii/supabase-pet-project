"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = useMutation({
    mutationFn: async () => {
      setError(null);
      const { data } = await api.post<{ product: { id: string } }>("/products", {
        title,
        description: description || null,
        image_path: imagePath,
      });
      return data.product;
    },
    onSuccess: (product) => {
      router.replace(`/app/products/${product.id}`);
    },
    onError: (e: any) => setError(e?.response?.data?.error ?? "Failed to create product"),
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

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold">New product</h1>
        <p className="text-sm text-slate-600">Creates a Draft product; you can activate later.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <Card className="p-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" rows={5} />
        </div>

        <div className="grid gap-2">
          <Label>Image (optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
            }}
          />
          <div className="text-xs text-slate-600">
            {uploading ? "Uploading..." : imagePath ? `Uploaded: ${imagePath}` : "No image uploaded"}
          </div>
        </div>

        <div className="flex gap-2">
          <Button disabled={createProduct.isPending || title.trim().length === 0} onClick={() => createProduct.mutate()}>
            {createProduct.isPending ? "Creating..." : "Create"}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}
