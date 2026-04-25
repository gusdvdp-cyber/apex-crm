"use client";

import { SidebarProvider } from "@/lib/sidebar-context";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
