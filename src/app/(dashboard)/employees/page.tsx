
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
import { FilePlus2, ListFilter, Inbox, Briefcase } from "lucide-react";
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
    date_embauche?: string;
    [key: string]: any;
};

type Role = {
    id_role: string;
    libelle: string;
};

type Employe = {
    id_employe: string;
    id_personne: string;
    id_role: string;
    date_embauche?: string;
    [key: string]: any;
};


type EmployePersonne = Employe & {
  personne: Personne;
  role: Role;
};

const roleVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  manager: "default",
  sales: "secondary",
  support: "destructive",
  admin: "outline"
};

const ALL_ROLES = ['admin', 'manager', 'sales', 'support'];

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roleFilters, setRoleFilters] = useState<string[]>(['manager', 'sales', 'support', 'admin']);
  const router = useRouter();
  const [personnes, setPersonnes] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [pRes, rRes, eRes] = await Promise.all([
          fetch('/api/data/Personne'),
          fetch('/api/data/Role'),
          fetch('/api/data/Employe')
        ]);
        if (!mounted) return;
        if (pRes.ok) setPersonnes(await pRes.json());
        if (rRes.ok) setRoles(await rRes.json());
        if (eRes.ok) setEmployes(await eRes.json());
      } catch (err) {
        console.error('Failed to load employees data', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const employeeData: EmployePersonne[] = useMemo(() => {
    const personnesMap = new Map((personnes as Personne[]).map(p => [String(p.id_personne), p]));
    const rolesMap = new Map((roles as Role[]).map(r => [String(r.id_role), r]));

    return (employes as Employe[]).map(employee => {
      const personneInfo = personnesMap.get(String(employee.id_personne));
      const roleInfo = rolesMap.get(String(employee.id_role));
      
      return {
        ...employee,
        personne: personneInfo || { id_personne: '', nom: 'N/A', email: 'N/A'},
        role: roleInfo || { id_role: '', libelle: 'N/A'},
      };
    }).filter(e => e.role.libelle !== 'N/A');
  }, [personnes, roles, employes]);

  const filteredEmployees = useMemo(() => {
    if (roleFilters.length === 0) {
      return employeeData;
    }
    return employeeData.filter(employee => roleFilters.includes(employee.role.libelle));
  }, [employeeData, roleFilters]);

  const handleRoleFilterChange = (role: string) => {
    setRoleFilters(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };
  
  const isManager = user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const handleRequestClick = () => {
    toast({
      title: "Demande Envoyée",
      description: "Votre demande d'ajout d'un nouvel employé a été envoyée à l'administrateur.",
    });
  };

  const handleRowClick = (employeeId: string) => {
    router.push(`/employees/${employeeId}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6" />
          <div>
            <CardTitle>Employés</CardTitle>
            <CardDescription>
              Gérez vos employés et leurs rôles.
            </CardDescription>
          </div>
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
              <DropdownMenuLabel>Filtrer par rôle</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_ROLES.map(role => (
                <DropdownMenuCheckboxItem
                  key={role}
                  checked={roleFilters.includes(role)}
                  onCheckedChange={() => handleRoleFilterChange(role)}
                  className="capitalize"
                >
                  {role}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {isAdmin && (
            <Button size="sm" className="h-8 gap-1" asChild>
                <Link href="/employees/requests">
                    <Inbox className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Gérer les demandes
                    </span>
                </Link>
            </Button>
          )}
          {isManager && (
            <Button size="sm" className="h-8 gap-1" onClick={handleRequestClick}>
              <FilePlus2 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Demander un nouvel employé
              </span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredEmployees.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Employé</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Date d'arrivée</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredEmployees.map((employee) => (
                <TableRow 
                  key={employee.id_employe}
                  onClick={() => handleRowClick(employee.id_employe)}
                  className="cursor-pointer"
                >
                    <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                        <AvatarFallback>
                            {employee.personne.prenom ? `${employee.personne.prenom[0]}${employee.personne.nom[0]}` : employee.personne.nom.slice(0, 2)}
                        </AvatarFallback>
                        </Avatar>
                        <div className="grid">
                            <div className="font-medium">{employee.personne.prenom} {employee.personne.nom}</div>
                            <div className="text-sm text-muted-foreground">{employee.personne.email}</div>
                        </div>
                    </div>
                    </TableCell>
                    <TableCell>
                    <Badge variant={roleVariant[employee.role.libelle]} className="capitalize">{employee.role.libelle}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{employee.date_embauche ? new Date(employee.date_embauche).toLocaleDateString() : 'N/A'}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
           <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Aucun employé ne correspond aux filtres sélectionnés.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
