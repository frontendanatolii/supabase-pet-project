
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md";
};

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none";

  const variants: Record<string, string> = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-slate-300 bg-white hover:bg-slate-50",
    ghost: "hover:bg-slate-100",
    destructive: "bg-red-600 text-white hover:bg-red-500",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3",
    md: "h-10 px-4",
  };

  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
