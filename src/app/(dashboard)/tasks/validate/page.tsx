
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

interface Task {
  id_task: number;
  titre: string;
  description: string | null;
  priorite: 'Basse' | 'Moyenne' | 'Haute';
  statut: 'Ouverte' | 'En Cours' | 'Terminée' | 'Annulée' | 'PendingValidation';
  date_creation: string;
  date_echeance: string | null;
  id_createur: number;
  id_assigner_a: number;
  id_client: number | null;
  updated_at: string;
}

interface User {
  id_personne: number;
  nom: string;
  prenom: string;
}

export default function ValidateTasksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, usersRes] = await Promise.all([
          fetch('/api/data/Task?statut=PendingValidation'),
          fetch('/api/data/Personne')
        ]);

        if (tasksRes.ok) {
          const tasksData = await tasksRes.json();
          setTasks(tasksData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTaskValidation = async (taskId: number, validate: boolean) => {
    try {
      const response = await fetch(`/api/task/${taskId}/validate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ validate }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate task');
      }

      // Update local state to remove the validated/rejected task
      setTasks(tasks.filter(task => task.id_task !== taskId));

      toast({
        title: "Success",
        description: validate ? "Task validated successfully" : "Task rejected successfully",
      });
    } catch (error) {
      console.error('Error validating task:', error);
      toast({
        title: "Error",
        description: "Failed to validate task",
        variant: "destructive",
      });
    }
  };

  const getUserName = (userId: number) => {
    const user = users.find(u => u.id_personne === userId);
    return user ? `${user.prenom} ${user.nom}` : 'Unknown';
  };

  const priorityColors: Record<string, string> = {
    'haute': 'text-red-600 bg-red-100',
    'moyenne': 'text-yellow-600 bg-yellow-100',
    'basse': 'text-green-600 bg-green-100'
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Validate Tasks</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Task Validation</CardTitle>
          <CardDescription>Review and approve new tasks submitted by managers.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <p className="text-muted-foreground">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
              <p className="text-muted-foreground">No tasks pending validation.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id_task}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.titre}</div>
                        <div className="text-sm text-muted-foreground">{task.description || ''}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getUserName(task.id_createur)}</TableCell>
                    <TableCell>{getUserName(task.id_assigner_a)}</TableCell>
                    <TableCell>
                      <Badge
                        className={priorityColors[task.priorite.toLowerCase()]}
                        variant="outline"
                      >
                        {task.priorite}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.date_echeance ? new Date(task.date_echeance).toLocaleDateString() : 'No deadline'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTaskValidation(task.id_task, true)}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTaskValidation(task.id_task, false)}
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
