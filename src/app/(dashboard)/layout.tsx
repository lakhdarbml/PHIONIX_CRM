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
      <div className="app-main min-h-screen h-screen w-screen">
        <AppSidebar />
        <main className="flex flex-1 flex-col h-full w-full">
          <AppHeader />
          <div className="flex-1 min-h-0 w-full max-w-full overflow-auto gap-4 p-4 sm:px-6 sm:py-4 md:gap-8 h-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}