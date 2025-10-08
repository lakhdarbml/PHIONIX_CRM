
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FilePlus2, ListFilter, Inbox } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

// Types based on db.json structure
type Personne = {
    id_personne: string;
    nom: string;
    prenom?: string;
    email?: string;
    created_at?: string;
    [key: string]: any;
};

type Client = {
    id_client: string;
    id_personne: string;
    statut?: 'Actif' | 'Prospect' | 'Inactif' | 'Suspendu';
    [key: string]: any;
};

type Employe = {
    id_employe: string;
    id_personne: string;
    [key: string]: any;
};

type Interaction = {
    id_employe: string;
    id_client: string;
    [key: string]: any;
}

type Task = {
    id_assigner_a: string;
    id_client: string | null;
    [key: string]: any;
}


type ClientPersonne = Client & {
  personne: Personne;
};

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Actif: "default",
  Prospect: "secondary",
  Inactif: "outline",
  Suspendu: 'destructive',
};

const ALL_STATUSES = ['Actif', 'Prospect', 'Inactif', 'Suspendu'];

export default function CustomersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilters, setStatusFilters] = useState<string[]>(['Actif', 'Prospect']);
  const router = useRouter();

  const [personnes, setPersonnes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [pRes, cRes, eRes, iRes, tRes] = await Promise.all([
          fetch('/api/data/Personne'),
          fetch('/api/data/Client'),
          fetch('/api/data/Employe'),
          fetch('/api/data/Interaction'),
          fetch('/api/data/Task')
        ]);
        if (!mounted) return;
        if (pRes.ok) setPersonnes(await pRes.json());
        if (cRes.ok) setClients(await cRes.json());
        if (eRes.ok) setEmployes(await eRes.json());
        if (iRes.ok) setInteractions(await iRes.json());
        if (tRes.ok) setTasks(await tRes.json());
      } catch (err) {
        console.error('Failed to load customers data', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const customerData = useMemo((): ClientPersonne[] => {
  const personnesMap = new Map((personnes as Personne[]).map(p => [String(p.id_personne), p]));
  let filteredClients = (clients as Client[]) || [];

  if (user?.role === 'support') {
    const employe = (employes as Employe[]).find(e => String(e.id_personne) === String(user.personneId));
    if (employe) {
      const supportedClientIds = new Set<string>();

      // Find clients from interactions
      (interactions as Interaction[]).forEach(interaction => {
        if (String(interaction.id_employe) === String(employe.id_employe)) {
          supportedClientIds.add(String(interaction.id_client));
        }
      });

      // Find clients from tasks
      (tasks as Task[]).forEach(task => {
        if (String(task.id_assigner_a) === String(employe.id_employe) && task.id_client) {
          supportedClientIds.add(String(task.id_client));
        }
      });

      filteredClients = filteredClients.filter(client => supportedClientIds.has(String(client.id_client)));
    } else {
      filteredClients = []; // No employee profile found, show no clients
    }
  }

  return filteredClients.map(client => {
    const personneInfo = personnesMap.get(String(client.id_personne));
    return {
    ...client,
    personne: personneInfo || { id_personne: '', nom: 'N/A', email: 'N/A'},
    };
  });
  }, [user, personnes, clients, employes, interactions, tasks]);
  
  const filteredCustomers = useMemo(() => {
    if (statusFilters.length === 0) {
      return customerData;
    }
    return customerData.filter(customer => customer.statut && statusFilters.includes(customer.statut));
  }, [customerData, statusFilters]);

  const handleStatusFilterChange = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }

  const handleRowClick = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  const canManageRequests = user?.role === 'admin' || user?.role === 'manager';
  const canAddClient = user?.role === 'manager';

  const handleRequestClick = () => {
    toast({
        title: "Demande envoyée",
        description: "Votre demande d'ajout de client a été envoyée pour approbation.",
    });
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Clients</CardTitle>
          <CardDescription>
            Gérez vos clients et consultez leur historique de ventes.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Filtrer
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_STATUSES.map(status => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilters.includes(status)}
                    onCheckedChange={() => handleStatusFilterChange(status)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canManageRequests && (
             <Button size="sm" className="h-8 gap-1" asChild>
                <Link href="/customers/requests">
                    <Inbox className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Voir les demandes
                    </span>
                </Link>
             </Button>
          )}
           {canAddClient && (
            <Button size="sm" className="h-8 gap-1" onClick={handleRequestClick}>
              <FilePlus2 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Demander un ajout
              </span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredCustomers.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date d'ajout</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredCustomers.map((customer) => (
                <TableRow 
                    key={customer.id_client}
                    onClick={() => handleRowClick(customer.id_client)}
                    className="cursor-pointer"
                >
                    <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                        <AvatarFallback>
                            {customer.personne.prenom ? `${customer.personne.prenom[0]}${customer.personne.nom[0]}` : customer.personne.nom.slice(0, 2)}
                        </AvatarFallback>
                        </Avatar>
                        <div className="grid">
                            <div className="font-medium">{customer.personne.prenom} {customer.personne.nom}</div>
                            <div className="text-sm text-muted-foreground">{customer.personne.email}</div>
                        </div>
                    </div>
                    </TableCell>
                    <TableCell>
                      {customer.statut && <Badge variant={statusVariant[customer.statut]} className="capitalize">{customer.statut}</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{customer.personne.created_at ? new Date(customer.personne.created_at).toLocaleDateString() : 'N/A'}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
             <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Aucun client ne correspond aux filtres sélectionnés.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
