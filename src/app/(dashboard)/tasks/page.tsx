
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
import { Progress } from "@/components/ui/progress";
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
    description?: string | null;
    statut: 'Ouverte' | 'En Cours' | 'Terminée' | 'Annulée' | 'PendingValidation';
    priorite: 'Basse' | 'Moyenne' | 'Haute';
    date_creation?: string;
    date_echeance?: string | null;
    id_createur: string;
    id_assigner_a: string;
    id_client?: string | null;
  progress?: number;
    updated_at?: string;
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

// Tasks don't have types in the DB schema, so we'll derive it from client_id
const typeVariant = {
  'Professionnel': "secondary" as const,
  'Personnel': "default" as const,
};

const typeIcon = {
  'Professionnel': Briefcase,
  'Personnel': User,
};

const ALL_STATUSES = ['Ouverte', 'En Cours', 'Terminée', 'Annulée', 'PendingValidation'];
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
    
    // Si pas d'employé trouvé, retourner tableau vide
    if (!employe) return [];

    if (user.role === 'admin' || user.role === 'manager') {
      return tasks;
    }
    
    // Pour les autres rôles (sales, support, etc.)
    return tasks.filter(task => {
      // Exclure les tâches en attente de validation pour les utilisateurs non-admin/non-manager,
      // sauf si l'utilisateur est le créateur ou l'assigné de la tâche.
      if (task.statut === 'PendingValidation') {
        if (String(task.id_createur) === String(employe.id_employe)) return true;
        if (String(task.id_assigner_a) === String(employe.id_employe)) return true;
        return false;
      }

      // Tâches professionnelles : l'employé doit être assigné
      if (task.id_client) {
        return String(task.id_assigner_a) === String(employe.id_employe);
      }
      // Tâches personnelles : l'employé doit être le créateur
      return String(task.id_createur) === String(employe.id_employe);
    });
  }, [user, tasksData, employes]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
        const statusMatch = statusFilters.length === 0 || statusFilters.includes(task.statut);
        const priorityMatch = priorityFilters.length === 0 || priorityFilters.includes(task.priorite);
        return statusMatch && priorityMatch;
    });
  }, [allTasks, statusFilters, priorityFilters]);

  // Tasks with client_id are professional, others are personal
  const professionalTasks = filteredTasks.filter(task => task.id_client != null);
  const personalTasks = filteredTasks.filter(task => {
    // Tâches personnelles : pas de client ET soit admin/manager, soit créateur = employé courant
    if (task.id_client != null) return false;
    
    if (user?.role === 'admin' || user?.role === 'manager') return true;
    
    const employe = (employes || []).find(e => String(e.id_personne) === String(user?.personneId));
    return employe && String(task.id_createur) === String(employe.id_employe);
  });


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

  const handleUpdateProgress = async (taskId: string | number, newProgress: number) => {
    try {
      const res = await fetch('/api/task', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_task: taskId, progress: newProgress, user_id: user?.personneId }),
      });
      if (!res.ok) throw new Error('Failed to update progress');
      const updated = await res.json();
      // Update local tasksData
      setTasksData(prev => (prev || []).map((t: any) => String(t.id_task) === String(taskId) ? updated : t));
    } catch (err) {
      console.error('Failed to update progress', err);
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour la progression', variant: 'destructive' });
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
                    <TableHead>Progression</TableHead>
                  <TableHead>Terminée</TableHead>
                    {(isAdmin || isManager) && <TableHead>Assigné à</TableHead>}
          <TableHead>Date d'échéance</TableHead>
          <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tasks.map((task) => {
                    const PriorityIcon = priorityIcon[task.priorite];
                    const StatusIcon = statusIcon[task.statut];
                    return (
                        <TableRow key={task.id_task}>
                            <TableCell className="font-medium">{task.titre}</TableCell>
                             {!isPersonal && <TableCell>{getClientName(task.id_client || null)}</TableCell>}
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
                            <TableCell className="w-60">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 relative">
                                    <Progress value={typeof task.progress === 'number' ? task.progress : 0} className="h-3" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-xs font-medium text-muted-foreground">{task.statut}</span>
                                    </div>
                                  </div>
                                </div>
                                {/* Status buttons for assignee or admins/managers */}
                                {((isAdmin || isManager) || (() => {
                                    const emp = (employes || []).find(e => String(e.id_personne) === String(user?.personneId));
                                    return emp && String(emp.id_employe) === String(task.id_assigner_a);
                                  })()) && (
                                  <div className="flex gap-1">
                                    {[
                                      { label: "Ouverte", value: 0 },
                                      { label: "En Cours", value: 50 },
                                      { label: "Terminée", value: 100 }
                                    ].map(({ label, value }) => (
                                      <Button 
                                        key={label} 
                                        size="sm" 
                                        variant={task.statut === label ? "default" : "outline"}
                                        className="flex-1 h-8 text-xs"
                                        onClick={() => {
                                          if (task.statut === label) return;
                                          if (task.statut === "Terminée") return;
                                          handleUpdateProgress(task.id_task, value);
                                        }}
                                      >
                                        {label}
                                      </Button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {['Terminée','Annulée'].includes(task.statut) ? (
                                <Badge variant="outline" className="text-green-600 border-green-500">Oui</Badge>
                              ) : (
                                <span className="text-muted-foreground">Non</span>
                              )}
                            </TableCell>
                            {(isAdmin || isManager) && <TableCell>{getAssigneeName(task.id_assigner_a)}</TableCell>}
                            <TableCell>{task.date_echeance ? new Date(task.date_echeance).toLocaleDateString() : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                              {/* Next step button: visible to admins/managers or to assignee */}
                              {(() => {
                                const emp = (employes || []).find(e => String(e.id_personne) === String(user?.personneId));
                                const isAssignee = emp && String(emp.id_employe) === String(task.id_assigner_a);
                                if (isAdmin || isManager || isAssignee) {
                                  const isFinal = ['Terminée','Annulée'].includes(task.statut);
                                  return (
                                    <Button size="sm" variant="outline" disabled={isFinal} onClick={async () => {
                                      try {
                                        const res = await fetch('/api/task', {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ id_task: task.id_task, action: 'advance', user_id: user?.personneId })
                                        });
                                        if (!res.ok) throw new Error('Failed to advance status');
                                        const updated = await res.json();
                                        setTasksData(prev => (prev || []).map((t: any) => String(t.id_task) === String(task.id_task) ? updated : t));
                                        toast({ title: 'Statut mis à jour', description: `Nouvel statut: ${updated.statut}` });
                                      } catch (err) {
                                        console.error('Failed to advance status', err);
                                        toast({ title: 'Erreur', description: 'Impossible d\'avancer le statut', variant: 'destructive' });
                                      }
                                    }}>Suivant</Button>
                                  );
                                }
                                return null;
                              })()}
                            </TableCell>
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

          <Button size="sm" variant="outline" className="h-8" asChild>
            <Link href="/tasks/completed">Voir Tâches Terminées</Link>
          </Button>

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
