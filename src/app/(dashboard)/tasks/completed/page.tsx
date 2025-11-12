'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

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
  updated_at?: string;
};

const statusVariant: { [key: string]: 'default' | 'secondary' | 'outline' | 'destructive' } = {
  'Terminée': 'default',
  'En Cours': 'secondary',
  'Ouverte': 'outline',
  'Annulée': 'destructive',
};

export default function CompletedTasksPage() {
  const { user } = useAuth();
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
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const allTasks: Task[] = useMemo(() => {
    const tasks = tasksData as Task[];
    if (!user) return [];
    const employe = (employes || []).find((e: any) => String(e.id_personne) === String(user.personneId));
    if (!employe) return [];
    if (user.role === 'admin' || user.role === 'manager') return tasks;
    return tasks.filter((task) => {
      if (task.id_client) {
        return String(task.id_assigner_a) === String(employe.id_employe);
      }
      return String(task.id_createur) === String(employe.id_employe);
    });
  }, [tasksData, employes, user]);

  const completedTasks = useMemo(() => {
    return allTasks.filter((t) => ['Terminée', 'Annulée'].includes(t.statut));
  }, [allTasks]);

  const getPersonName = (personneId: string) => {
    const p = (personnes || []).find((pp: any) => String(pp.id_personne) === String(personneId));
    return p ? `${p.prenom} ${p.nom}` : personneId;
  };

  const getClientName = (clientId?: string | null) => {
    if (!clientId) return <span className="text-muted-foreground">N/A</span>;
    const client = (clients || []).find((c: any) => String(c.id_client) === String(clientId));
    if (!client) return clientId as any;
    return getPersonName(String(client.id_personne));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Tâches Terminées</CardTitle>
          <CardDescription>Vue dédiée pour les tâches terminées ou annulées.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
          <Link href="/tasks">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux tâches
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {completedTasks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Assigné à</TableHead>
                <TableHead>Date d'échéance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedTasks.map((t) => {
                const assignee = (employes || []).find((e: any) => String(e.id_employe) === String(t.id_assigner_a));
                const assigneeName = assignee ? getPersonName(String(assignee.id_personne)) : t.id_assigner_a;
                return (
                  <TableRow key={t.id_task}>
                    <TableCell className="font-medium">{t.titre}</TableCell>
                    <TableCell>{getClientName(t.id_client || null)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[t.statut] || 'outline'}>{t.statut}</Badge>
                    </TableCell>
                    <TableCell>{assigneeName}</TableCell>
                    <TableCell>{t.date_echeance ? new Date(t.date_echeance).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground">Aucune tâche terminée/annulée.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}




