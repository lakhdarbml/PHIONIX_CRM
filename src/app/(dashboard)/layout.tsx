
'use client';

import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <main className="flex flex-1 flex-col bg-muted/40">
          <AppHeader />
          <div className="flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
