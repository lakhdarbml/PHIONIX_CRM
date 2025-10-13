
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { FilePlus2, ListFilter, AlertTriangle, CheckCircle2, Circle, Hourglass, Inbox, Briefcase, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddTaskDialog } from "@/components/add-task-dialog";


// Types based on db.json structure
type Task = {
    id_task: string;
    titre: string;
    type: 'Professionnel' | 'Personnel';
    statut: 'Ouverte' | 'En Cours' | 'Terminée' | 'Annulée' | 'PendingValidation';
    priorite: 'Basse' | 'Moyenne' | 'Haute';
    id_assigner_a: string;
    id_client: string | null;
    date_echeance?: string;
    [key: string]: any;
};


const priorityVariant: { [key: string]: "destructive" | "secondary" | "outline" } = {
  Haute: "destructive",
  Moyenne: "secondary",
  Basse: "outline",
};

const priorityIcon: { [key: string]: React.ElementType } = {
    Haute: AlertTriangle,
    Moyenne: Circle,
    Basse: Circle,
};

const statusVariant: { [key: string]: "default" | "secondary" | "outline" | "destructive" } = {
  'Terminée': "default",
  'En Cours': "secondary",
  'Ouverte': "outline",
  'Annulée': 'destructive',
};

const statusIcon: { [key: string]: React.ElementType } = {
    'Terminée': CheckCircle2,
    'En Cours': Hourglass,
    'Ouverte': Circle,
    'Annulée': AlertTriangle,
};

const typeVariant: { [key in Task['type']]: "default" | "secondary" } = {
  'Professionnel': "secondary",
  'Personnel': "default",
};

const typeIcon: { [key in Task['type']]: React.ElementType } = {
  'Professionnel': Briefcase,
  'Personnel': User,
};

const ALL_STATUSES = ['Ouverte', 'En Cours', 'Terminée', 'Annulée'];
const ALL_PRIORITIES = ['Basse', 'Moyenne', 'Haute'];


export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilters, setStatusFilters] = useState<string[]>(['Ouverte', 'En Cours']);
  const [priorityFilters, setPriorityFilters] = useState<string[]>([]);
  const [tasksData, setTasksData] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [personnes, setPersonnes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tRes, eRes, pRes, cRes] = await Promise.all([
          fetch('/api/data/Task'),
          fetch('/api/data/Employe'),
          fetch('/api/data/Personne'),
          fetch('/api/data/Client')
        ]);
        if (!mounted) return;
        if (tRes.ok) setTasksData(await tRes.json());
        if (eRes.ok) setEmployes(await eRes.json());
        if (pRes.ok) setPersonnes(await pRes.json());
        if (cRes.ok) setClients(await cRes.json());
      } catch (err) {
        console.error('Failed to load tasks data', err);
      }
    })();
    return () => { mounted = false; };
  }, []);
  
  const allTasks = React.useMemo(() => {
    if (!user) return [];

    const tasks = tasksData as Task[];
    const employe = (employes || []).find(e => String(e.id_personne) === String(user.personneId));

    if (user.role === 'admin' || user.role === 'manager') {
      return tasks;
    }
    
    if (employe) {
      // Employees see all tasks assigned to them, personal or professional
      return (tasks || []).filter(t => String(t.id_assigner_a) === String(employe.id_employe));
    }
    return [];
  }, [user, tasksData, employes]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
        const statusMatch = statusFilters.length === 0 || statusFilters.includes(task.statut);
        const priorityMatch = priorityFilters.length === 0 || priorityFilters.includes(task.priorite);
        return statusMatch && priorityMatch;
    });
  }, [allTasks, statusFilters, priorityFilters]);

  const professionalTasks = filteredTasks.filter(task => task.type === 'Professionnel');
  const personalTasks = filteredTasks.filter(task => task.type === 'Personnel');


  const canAddTask = user?.role === 'manager' || user?.role === 'sales' || user?.role === 'support' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const handleTaskAdded = async () => {
    // Refetch tasks when a new one is added
    try {
      const response = await fetch('/api/data/Task');
      if (response.ok) {
        const data = await response.json();
        setTasksData(data);
      }
    } catch (error) {
      console.error('Failed to refresh tasks:', error);
    }
  };
  
  const handleStatusFilterChange = (status: string) => {
    setStatusFilters(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handlePriorityFilterChange = (priority: string) => {
    setPriorityFilters(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  const getAssigneeName = (assigneeId: string) => {
    const employe = (employes || []).find(e => String(e.id_employe) === String(assigneeId));
    if (!employe) return assigneeId;
    const personne = (personnes || []).find(p => String(p.id_personne) === String(employe.id_personne));
    return personne ? `${personne.prenom} ${personne.nom}` : assigneeId;
  };
  
  const getClientName = (clientId: string | null) => {
      if (!clientId) return <span className="text-muted-foreground">N/A</span>;
      const client = (clients || []).find(c => String(c.id_client) === String(clientId));
      if (!client) return clientId;
      const personne = (personnes || []).find(p => String(p.id_personne) === String(client.id_personne));
      return personne ? `${personne.prenom} ${personne.nom}` : clientId;
  }

  const renderTasksTable = (tasks: Task[], isPersonal: boolean) => {
    if (tasks.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">
                    {isPersonal ? "Vous n'avez aucune tâche personnelle." : "Aucune tâche professionnelle ne correspond aux filtres."}
                </p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Titre</TableHead>
                    {!isPersonal && <TableHead>Client</TableHead>}
                    <TableHead>Statut</TableHead>
                    <TableHead>Priorité</TableHead>
                    {(isAdmin || isManager) && !isPersonal && <TableHead>Assigné à</TableHead>}
                    <TableHead>Date d'échéance</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map((task) => {
                    const PriorityIcon = priorityIcon[task.priorite];
                    const StatusIcon = statusIcon[task.statut];
                    return (
                        <TableRow key={task.id_task}>
                            <TableCell className="font-medium">{task.titre}</TableCell>
                             {!isPersonal && <TableCell>{getClientName(task.id_client)}</TableCell>}
                            <TableCell>
                                <Badge variant={statusVariant[task.statut] || 'outline'} className="capitalize">
                                    {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                                    {task.statut}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={priorityVariant[task.priorite]} className="capitalize">
                                    <PriorityIcon className="h-3 w-3 mr-1" />
                                    {task.priorite}
                                </Badge>
                            </TableCell>
                            {(isAdmin || isManager) && !isPersonal && <TableCell>{getAssigneeName(task.id_assigner_a)}</TableCell>}
                            <TableCell>{task.date_echeance ? new Date(task.date_echeance).toLocaleDateString() : 'N/A'}</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Tâches</CardTitle>
          <CardDescription>
            Gérez vos tâches professionnelles et personnelles.
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
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Filtrer par priorité</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ALL_PRIORITIES.map(priority => (
                        <DropdownMenuCheckboxItem
                            key={priority}
                            checked={priorityFilters.includes(priority)}
                            onCheckedChange={() => handlePriorityFilterChange(priority)}
                        >
                            {priority}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
          
          {isAdmin && (
            <Button size="sm" className="h-8 gap-1" asChild>
              <Link href="/tasks/validate">
                  <Inbox className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Valider les Tâches
                  </span>
              </Link>
            </Button>
          )}

          {canAddTask && (
            <AddTaskDialog onTaskAdded={handleTaskAdded} />
          )}
         </div>
      </CardHeader>
      <CardContent>
         <Tabs defaultValue="professional">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="professional">
                    <Briefcase className="h-4 w-4 mr-2" />
                    Tâches Professionnelles
                </TabsTrigger>
                <TabsTrigger value="personal">
                    <User className="h-4 w-4 mr-2" />
                    Tâches Personnelles
                </TabsTrigger>
            </TabsList>
            <TabsContent value="professional" className="mt-4">
                 {renderTasksTable(professionalTasks, false)}
            </TabsContent>
            <TabsContent value="personal" className="mt-4">
                {renderTasksTable(personalTasks, true)}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
