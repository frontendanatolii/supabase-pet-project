import axios from "axios";
import { supabase } from "@/lib/supabase";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!baseURL) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
}

export const api = axios.create({ baseURL });

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  console.log(data, token);
  

  // Supabase Functions expects a Bearer token for user-authenticated calls
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Some setups also expect apikey header (safe to include with anon key)
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anon) {
    config.headers = config.headers ?? {};
    config.headers.apikey = anon;
  }

  return config;
});
