'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { FilePlus2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface AddTaskDialogProps {
  onTaskAdded: () => void;
}

export function AddTaskDialog({ onTaskAdded }: AddTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    type: 'Professionnel',
    priorite: 'Moyenne',
    date_echeance: '',
    id_client: '',
    id_assigner_a: '',
  });

  const initialErrors = { titre: false, description: false, id_assigner_a: false, date_echeance: false, id_client: false };
  const [errors, setErrors] = useState(initialErrors);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [employeesRes, clientsRes] = await Promise.all([
        fetch('/api/data/Employe'),
        fetch('/api/data/Client')
      ]);

      if (employeesRes.ok) {
        const employeesData = await employeesRes.json();
        setEmployees(employeesData);
        // Prefill assigner with the current user's employe id if available
        const emp = employeesData.find((e: any) => String(e.id_personne) === String(user?.personneId));
        if (emp) setFormData(fd => ({ ...fd, id_assigner_a: String(emp.id_employe) }));
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: "Error",
        description: "Failed to load required data",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let err = {
      titre: !formData.titre.trim(),
      description: !formData.description.trim(),
      id_assigner_a: (!isPersonal && !formData.id_assigner_a) ? true : false,
      date_echeance: !formData.date_echeance,
      id_client: (!isPersonal && !formData.id_client) ? true : false
    };
    setErrors(err);
    if (Object.values(err).some(Boolean)) {
      toast({ title:'Erreur', description:'Champs obligatoires manquants',variant:'destructive'});
      return;
    }
    setLoading(true);
    try {
      // determine current employee (creator)
      const emp = employees.find((e: any) => String(e.id_personne) === String(user?.personneId));
      const id_createur = emp ? emp.id_employe : undefined;

      const payload: any = {
        titre: formData.titre,
        description: formData.description,
        priorite: formData.priorite,
        date_echeance: formData.date_echeance || null,
        id_createur: id_createur,
      };

      if (isPersonal) {
        // personal tasks are assigned to creator and do not require validation
        payload.id_assigner_a = id_createur;
        payload.statut = 'Ouverte';
        payload.id_client = null;
      } else {
        payload.id_assigner_a = formData.id_assigner_a;
        payload.id_client = formData.id_client || null;
        // professional tasks require admin validation unless creator is admin
        payload.statut = user?.role === 'admin' ? 'Ouverte' : 'PendingValidation';
      }

      const response = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errMsg = await response.json().catch(()=>({error:'Erreur serveur'}));
        throw new Error(errMsg.error||'Création impossible');
      }
      toast({ title:'Succès', description: user?.role==='admin'?'Tâche créée':'Soumise à validation' });
      onTaskAdded();
      setOpen(false);
      setErrors(initialErrors);
  setFormData({ titre:'', description:'', type:'Professionnel', priorite:'Moyenne', date_echeance:'', id_client:'', id_assigner_a: String(emp?.id_employe || '') });
    } catch (error:any) {
      toast({ title:'Erreur', description: error?.message||'Création impossible', variant:'destructive'});
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isPersonal = formData.type === 'Personnel';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <FilePlus2 className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Ajouter une tâche
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle Tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type de tâche</Label>
            <RadioGroup
              defaultValue="Professionnel"
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Professionnel" id="professionnel" />
                <Label htmlFor="professionnel">Professionnel</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Personnel" id="personnel" />
                <Label htmlFor="personnel">Personnel</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input
              id="titre"
              value={formData.titre}
              onChange={(e) => handleChange('titre', e.target.value)}
              placeholder="Titre de la tâche"
              required
              aria-invalid={errors.titre}
              className={errors.titre?"border-red-500 focus-visible:ring-red-500":""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description de la tâche"
              required
              aria-invalid={errors.description}
              className={errors.description?"border-red-500 focus-visible:ring-red-500":""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priorite">Priorité</Label>
            <Select 
              value={formData.priorite} 
              onValueChange={(value) => handleChange('priorite', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Basse">Basse</SelectItem>
                <SelectItem value="Moyenne">Moyenne</SelectItem>
                <SelectItem value="Haute">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isPersonal && (
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select 
                value={formData.id_client} 
                onValueChange={(value) => handleChange('id_client', value)}
              >
                <SelectTrigger className={errors.id_client?"border-red-500 focus-visible:ring-red-500":""}>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id_client} value={client.id_client}>
                      {`${client.nom} ${client.prenom}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isPersonal ? (
            <div className="space-y-2">
              <Label htmlFor="assignee">Assigné à</Label>
              <Select 
                value={formData.id_assigner_a} 
                onValueChange={(value) => handleChange('id_assigner_a', value)}
                required
              >
                <SelectTrigger className={errors.id_assigner_a?"border-red-500 focus-visible:ring-red-500":""}>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id_employe} value={employee.id_employe}>
                      {`${employee.nom} ${employee.prenom}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">La tâche personnelle sera automatiquement assignée à vous.</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date_echeance">Date d'échéance</Label>
            <Input
              id="date_echeance"
              type="date"
              value={formData.date_echeance}
              onChange={(e) => handleChange('date_echeance', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              aria-invalid={errors.date_echeance}
              className={errors.date_echeance?"border-red-500 focus-visible:ring-red-500":""}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer la tâche"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}