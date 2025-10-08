
'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Mail, Phone, Briefcase, Users, CheckSquare, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEffect, useState } from 'react';

type Personne = { id_personne: number | string; nom: string; prenom?: string; email?: string; telephone?: string; };
type Employe = { id_employe: number | string; id_personne: number | string; id_role: number | string; };
type Role = { id_role: number | string; libelle: string; };
type Opportunite = { id_opportunite: number | string; id_employe: number | string; titre: string; valeur?: number; etape: string; };
type Task = { id_task: number | string; id_assigner_a: number | string; titre: string; statut: string; priorite: string; };
type Interaction = { id_interaction: number | string; id_employe: number | string; id_client: number | string; };
type Client = { id_client: number | string; id_personne: number | string };

const roleVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  manager: "default",
  sales: "secondary",
  support: "destructive",
  admin: "outline",
};

const stageVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  'Prospection': "secondary",
  'Qualification': "secondary",
  'Proposition': "default",
  'Négociation': "default",
  'Gagnée': "outline",
  'Perdue': "destructive",
  'Clôturé': 'outline'
};


export default function EmployeeDetailPage() {
  const { id } = useParams();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunite[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [employesRes, personnesRes, rolesRes, opportunitiesRes, tasksRes, interactionsRes, clientsRes] = await Promise.all([
          fetch('/api/data/Employe'),
          fetch('/api/data/Personne'),
          fetch('/api/data/Role'),
          fetch('/api/data/Opportunite'),
          fetch('/api/data/Task'),
          fetch('/api/data/Interaction'),
          fetch('/api/data/Client'),
        ]).then(rs => Promise.all(rs.map(r => r.json())));

        setEmployes(employesRes || []);
        setPersonnes(personnesRes || []);
        setRoles(rolesRes || []);
        setOpportunities(opportunitiesRes || []);
        setTasks(tasksRes || []);
        setInteractions(interactionsRes || []);
        setClients(clientsRes || []);
      } catch (err) {
        console.error('Failed to load employee detail data', err);
      }
    };

    load();
  }, []);

  const employe = employes.find((e) => String(e.id_employe) === String(id));

  if (!employe) {
    return (
        <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                <Link href="/employees">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                </Button>
                <h1 className="text-xl font-semibold">Employé non trouvé</h1>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <p>Désolé, cet employé est introuvable.</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  const personne = personnes.find(p => String(p.id_personne) === String(employe.id_personne));
  const role = roles.find(r => String(r.id_role) === String(employe.id_role));
  const opportunitiesForEmp = opportunities.filter(o => String(o.id_employe) === String(employe.id_employe));
  const tasksForEmp = tasks.filter(t => String(t.id_assigner_a) === String(employe.id_employe));

  const interactionsForEmp = interactions.filter(i => String(i.id_employe) === String(employe.id_employe));
  const managedClientsCount = new Set(interactionsForEmp.map(i => String(i.id_client))).size;

  const totalOpportunitiesValue = opportunitiesForEmp.reduce((sum, opp) => sum + (opp.valeur || 0), 0);
  const openTasksCount = tasksForEmp.filter(t => t.statut === 'Ouverte' || t.statut === 'En Cours').length;


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }

  if (!personne) {
    return <div>Personne non trouvée pour cet employé.</div>
  }


  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">{personne.prenom} {personne.nom}</h1>
        {role && <Badge variant={roleVariant[role.libelle]} className="text-sm capitalize">{role.libelle}</Badge>}
        <Button size="sm" variant="outline" className="ml-auto">
            <Edit className="mr-2 h-4 w-4" />
            Modifier
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients Gérés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{managedClientsCount}</div>
            <p className="text-xs text-muted-foreground">Clients avec interactions récentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur des Opportunités</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOpportunitiesValue)}</div>
             <p className="text-xs text-muted-foreground">sur {opportunities.length} opportunités</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches Ouvertes</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTasksCount}</div>
            <p className="text-xs text-muted-foreground">sur {tasks.length} tâches au total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
             <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${personne.email}`} className="hover:underline">{personne.email}</a>
            </div>
            <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{personne.telephone || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Opportunités en cours</CardTitle>
            </CardHeader>
      <CardContent>
        {opportunitiesForEmp.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Étape</TableHead>
                <TableHead className="text-right">Valeur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunitiesForEmp.map(opp => (
                <TableRow key={opp.id_opportunite}>
                  <TableCell>{opp.titre}</TableCell>
                  <TableCell>
                     <Badge variant={stageVariant[opp.etape]} className="capitalize">{opp.etape}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{opp.valeur ? formatCurrency(opp.valeur) : 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground p-8">Aucune opportunité assignée.</div>
        )}
      </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Tâches Récentes</CardTitle>
            </CardHeader>
            <CardContent>
                 {tasks.length > 0 ? (
                    <div className="space-y-4">
                        {tasks.slice(0, 5).map(task => (
                            <div key={task.id_task} className="flex items-start gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">
                                        {task.titre}
                                        <span className="font-normal text-muted-foreground"> - {task.statut}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">Priorité: {task.priorite}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-8">Aucune tâche assignée.</div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
