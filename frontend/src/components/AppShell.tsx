"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const nav = [
    { href: "/app/products", label: "Products" },
    { href: "/app/team", label: "Team" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-semibold">Products App</div>
            <nav className="flex items-center gap-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm no-underline px-2 py-1 rounded-md",
                    pathname?.startsWith(item.href) ? "bg-slate-100" : "hover:bg-slate-50"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-6">{children}</main>
    </div>
  );
}
