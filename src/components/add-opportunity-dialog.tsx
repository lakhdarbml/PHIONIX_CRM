'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FilePlus2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";

interface AddOpportunityDialogProps {
  onOpportunityAdded: () => void;
}

export function AddOpportunityDialog({ onOpportunityAdded }: AddOpportunityDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [salesEmployees, setSalesEmployees] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    titre: '',
    valeur: '',
    etape: 'Prospection',
    id_client: '',
    id_employe: ''
  });

  useEffect(() => {
    // Fetch clients and sales employees
    const fetchData = async () => {
      try {
        const [clientsRes, employeesRes] = await Promise.all([
          fetch('/api/data/Client'),
          fetch('/api/data/Employe')
        ]);

        if (clientsRes.ok) {
          const clientsData = await clientsRes.json();
          setClients(clientsData);
        }

        if (employeesRes.ok) {
          const employeesData = await employeesRes.json();
          setSalesEmployees(employeesData.filter((e: any) => e.role === 'sales'));
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

    if (open) {
      fetchData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/data/Opportunite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          valeur: formData.valeur ? parseFloat(formData.valeur) : null,
          date_creation: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create opportunity');
      }

      toast({
        title: "Success",
        description: "Nouvelle opportunité créée avec succès",
      });

      onOpportunityAdded();
      setOpen(false);
      setFormData({
        titre: '',
        valeur: '',
        etape: 'Prospection',
        id_client: '',
        id_employe: ''
      });
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to create opportunity",
        variant: "destructive",
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <FilePlus2 className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Ajouter une Opportunité
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle Opportunité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titre">Titre</Label>
            <Input
              id="titre"
              value={formData.titre}
              onChange={(e) => handleChange('titre', e.target.value)}
              placeholder="Nom de l'opportunité"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="valeur">Valeur (€)</Label>
            <Input
              id="valeur"
              type="number"
              value={formData.valeur}
              onChange={(e) => handleChange('valeur', e.target.value)}
              placeholder="Montant estimé"
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="etape">Étape</Label>
            <Select value={formData.etape} onValueChange={(value) => handleChange('etape', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Prospection">Prospection</SelectItem>
                <SelectItem value="Qualification">Qualification</SelectItem>
                <SelectItem value="Proposition">Proposition</SelectItem>
                <SelectItem value="Négociation">Négociation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select value={formData.id_client} onValueChange={(value) => handleChange('id_client', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id_client} value={client.id_client}>
                    {client.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employe">Commercial responsable</Label>
            <Select value={formData.id_employe} onValueChange={(value) => handleChange('id_employe', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un commercial" />
              </SelectTrigger>
              <SelectContent>
                {salesEmployees.map((employee) => (
                  <SelectItem key={employee.id_employe} value={employee.id_employe}>
                    {employee.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer l'opportunité"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}