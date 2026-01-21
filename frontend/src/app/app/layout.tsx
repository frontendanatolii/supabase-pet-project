"use client";

import type { ReactNode } from "react";

import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";
import RequireTeam from "@/components/RequireTeam";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <RequireTeam>
        <AppShell>{children}</AppShell>
      </RequireTeam>
    </RequireAuth>
  );
}
