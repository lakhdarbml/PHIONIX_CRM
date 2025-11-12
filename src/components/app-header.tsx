'use client';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { NotificationBell } from '@/components/notification-bell';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppHeader() {
  const pathname = usePathname();
  const getTitle = () => {
    const segment = pathname.split('/').pop();
    if (segment === '' || !segment) return 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <header className="sticky top-0 z-20 flex w-full items-center gap-4 border-b bg-white/60 backdrop-blur-sm px-4 py-2 shadow-sm dark:bg-[rgba(6,8,15,0.6)] sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-xl font-semibold leading-tight md:text-2xl font-headline">{getTitle()}</h1>
      </div>

      {/* search intentionally removed per UX request */}

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex">
          <NotificationBell />
        </div>
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  );
}
