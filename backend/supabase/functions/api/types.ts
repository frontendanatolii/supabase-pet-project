export type Team = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  team_id: string | null;
  created_at: string;
};

export type ProductStatus = "draft" | "active" | "deleted";

export type Product = {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  status: ProductStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
