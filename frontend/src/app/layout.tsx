import type { ReactNode } from "react";

import "./globals.css";
import type { Metadata } from "next";
import QueryProvider from "@/providers/QueryProvider";
import AuthProvider from "@/providers/AuthProvider";

export const metadata: Metadata = {
  title: "Supabase test task",
  description: "Team products app (Supabase Auth/DB/Storage/Realtime)"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
