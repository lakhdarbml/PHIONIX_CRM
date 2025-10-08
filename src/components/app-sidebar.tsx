
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  BarChart,
  CheckSquare,
  DollarSign,
  LayoutGrid,
  MessageSquare,
  Users,
  Settings,
  Briefcase,
  User,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, type User as AuthUser } from "@/context/auth-context";
import React from "react";
import { PhoenixIcon } from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: AuthUser['role'][];
};

const allNavItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: LayoutGrid, roles: ['admin', 'manager'] },
    { href: "/customers", label: "Clients", icon: Users, roles: ['admin', 'manager', 'sales', 'support'] },
    { href: "/employees", label: "Employés", icon: Briefcase, roles: ['admin', 'manager'] },
    { href: "/opportunities", label: "Opportunités", icon: DollarSign, roles: ['admin', 'manager', 'sales', 'client'] },
    { href: "/tasks", label: "Tâches", icon: CheckSquare, roles: ['admin', 'manager', 'sales', 'support'] },
    { href: "/interactions", label: "Interactions", icon: MessageSquare, roles: ['admin', 'manager', 'sales', 'support'] },
    { href: "/messages", label: "Messages", icon: MessageCircle, roles: ['admin', 'manager', 'sales', 'support', 'client'] },
    { href: "/reports", label: "Rapports", icon: BarChart, roles: ['admin', 'manager'] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string) => {
    // Handle the dashboard case
    if (href === "/") return pathname === "/";
    // For other routes, check if the pathname starts with the href
    // This makes parent routes active for their sub-routes
    return pathname.startsWith(href);
  };
  
  const navItems = React.useMemo(() => {
    if (!user) return [];

    let items = allNavItems.filter(item => item.roles.includes(user.role));

    if (user.role === 'support') {
      // Pour le rôle support, on récupère les interactions et tâches depuis l'API
      // et on cache le lien 'Clients' s'il n'y a aucun client supporté.
      // Note: useMemo est synchrone, donc on ne peut pas await ici. On va
      // retourner les items tels quels et effectuer le filtrage côté effet.
    }
    
    return items;
  }, [user]);

  // Effect to hide customers link for support users without associated clients.
  React.useEffect(() => {
    if (!user || user.role !== 'support') return;

    let mounted = true;
    (async () => {
      try {
        // Get interactions and tasks, then compute supported client ids
        const [intRes, taskRes] = await Promise.all([
          fetch('/api/data/Interaction'),
          fetch('/api/data/Task')
        ]);
        if (!mounted) return;
        if (!intRes.ok || !taskRes.ok) return;
        const interactions = await intRes.json();
        const tasks = await taskRes.json();
        // Find employe id by matching personneId via API
        const empRes = await fetch(`/api/data/Employe`);
        if (!empRes.ok) return;
        const employes = await empRes.json();
        const employe = employes.find((e: any) => e.id_personne === user.personneId);
        if (!employe) {
          // No employe found: hide customers link by removing it from DOM via a CSS hook
          const el = document.querySelector('a[href="/customers"]');
          if (el) el.parentElement?.parentElement?.classList.add('hidden');
          return;
        }
        const supportedClientIds = new Set<string>();
        interactions.forEach((interaction: any) => {
          if (interaction.id_employe === employe.id_employe) supportedClientIds.add(interaction.id_client);
        });
        tasks.forEach((task: any) => {
          if (task.id_assigner_a === employe.id_employe && task.id_client) supportedClientIds.add(task.id_client);
        });

        if (supportedClientIds.size === 0) {
          const el = document.querySelector('a[href="/customers"]');
          if (el) el.parentElement?.parentElement?.classList.add('hidden');
        }
      } catch (err) {
        // swallow errors; keep the link visible as fallback
        console.error('Could not determine supported clients for support user', err);
      }
    })();

    return () => { mounted = false; };
  }, [user]);

  const canViewSettings = user && user.role !== 'client';

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <PhoenixIcon className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-semibold font-headline">CRM AgileFlow</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={{ children: item.label, className:"font-headline" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      {canViewSettings && (
        <>
            <SidebarSeparator />
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive('/settings')} tooltip={{ children: 'Settings', className:"font-headline"}}>
                            <Link href="/settings">
                                <Settings />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </>
      )}
    </Sidebar>
  );
}
