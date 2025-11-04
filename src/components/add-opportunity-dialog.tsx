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
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [personnes, setPersonnes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [formData, setFormData] = useState({
    titre: '',
    valeur: '',
    etape: 'Prospection',
    id_client: '',
    id_employe: ''
  });

  const initialErrors = { titre: false, id_client: false, id_employe: false, valeur: false };
  const [errors, setErrors] = useState(initialErrors);

  useEffect(() => {
    // Fetch clients and sales employees
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const [clientsRes, employeesRes, personnesRes, rolesRes] = await Promise.all([
          fetch('/api/data/Client'),
          fetch('/api/data/Employe'),
          fetch('/api/data/Personne'),
          fetch('/api/data/Role')
        ]);

        let clientsData: any[] = [];
        let employeesData: any[] = [];
        let personnesData: any[] = [];
        let rolesData: any[] = [];

        if (clientsRes.ok) {
          clientsData = await clientsRes.json();
          setClients(clientsData);
        }

        if (employeesRes.ok) {
          employeesData = await employeesRes.json();
          setEmployees(employeesData);
        }

        if (rolesRes.ok) {
          rolesData = await rolesRes.json();
          setRoles(rolesData);
        }

        if (personnesRes.ok) {
          personnesData = await personnesRes.json();
          setPersonnes(personnesData);
        }

        // Map employees with sales role
        if (employeesData.length > 0 && rolesData.length > 0 && personnesData.length > 0) {
          const rolesMap = new Map(rolesData.map((r: any) => [String(r.id_role), r]));
          const personnesMap = new Map(personnesData.map((p: any) => [String(p.id_personne), p]));
          
          // Find sales role IDs (case-insensitive)
          const salesRoleIds = rolesData
            .filter((r: any) => String(r.libelle).toLowerCase().trim() === 'sales')
            .map((r: any) => String(r.id_role));
          
          console.log('Sales role IDs found:', salesRoleIds);
          console.log('Total employees:', employeesData.length);
          
          const salesEmps = employeesData
            .filter((e: any) => {
              const eRoleId = String(e.id_role);
              const isSales = salesRoleIds.includes(eRoleId);
              if (isSales) {
                console.log('Found sales employee:', e.id_employe, 'with role:', eRoleId);
              }
              return isSales;
            })
            .map((e: any) => {
              const p = personnesMap.get(String(e.id_personne)) as any;
              const emp = {
                ...e,
                nom: p?.nom || '',
                prenom: p?.prenom || ''
              };
              console.log('Mapped sales employee:', emp);
              return emp;
            });
          
          console.log('Final sales employees:', salesEmps.length, salesEmps);
          setSalesEmployees(salesEmps);
          
          if (salesEmps.length === 0) {
            console.warn('No sales employees found. Available roles:', rolesData.map((r: any) => r.libelle));
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: "Error",
          description: "Failed to load required data",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let newErrors = { titre: !formData.titre.trim(), id_client: !formData.id_client, id_employe: !formData.id_employe, valeur: false };
    if (formData.valeur && (isNaN(+formData.valeur) || +formData.valeur<0)) newErrors.valeur = true;
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) {
      toast({ title: 'Erreur', description: 'Veuillez remplir tous les champs obligatoires (et montant >= 0).', variant: 'destructive'});
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/opportunite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: formData.titre,
          valeur: formData.valeur ? parseFloat(formData.valeur) : null,
          etape: formData.etape || 'Prospection',
          id_client: Number(formData.id_client),
          id_employe: Number(formData.id_employe),
        })
      });
      if (!response.ok) {
        const err = await response.json().catch(()=>({error:'Erreur serveur'}));
        throw new Error(err.error || 'Failed to create opportunity');
      }
      toast({ title: 'Succès', description: 'Nouvelle opportunité créée avec succès' });
      onOpportunityAdded();
      setOpen(false);
      setFormData({ titre: '', valeur: '', etape: 'Prospection', id_client: '', id_employe: '' });
      setErrors(initialErrors);
    } catch (error:any) {
      toast({ title: 'Erreur', description: error?.message||'Création impossible', variant:'destructive'});
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
              aria-invalid={errors.titre}
              className={errors.titre?"border-red-500 focus-visible:ring-red-500":""}
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
              aria-invalid={errors.valeur}
              className={errors.valeur?"border-red-500 focus-visible:ring-red-500":""}
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
            <Select value={formData.id_client} onValueChange={(value) => handleChange('id_client', String(value))}>
              <SelectTrigger className={errors.id_client?"border-red-500 focus-visible:ring-red-500":""}>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => {
                  const clientPersonne = personnes?.find((p: any) => String(p.id_personne) === String(client.id_personne));
                  const displayName = clientPersonne ? `${clientPersonne.prenom || ''} ${clientPersonne.nom || ''}`.trim() : client.nom || `Client ${client.id_client}`;
                  return (
                    <SelectItem key={client.id_client} value={String(client.id_client)}>
                      {displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="employe">Commercial responsable</Label>
            <Select value={formData.id_employe} onValueChange={(value) => handleChange('id_employe', String(value))} disabled={loadingData || salesEmployees.length === 0}>
              <SelectTrigger className={errors.id_employe?"border-red-500 focus-visible:ring-red-500":""}>
                <SelectValue placeholder={
                  loadingData 
                    ? "Chargement..." 
                    : salesEmployees.length === 0 
                      ? "Aucun commercial disponible" 
                      : "Sélectionner un commercial"
                } />
              </SelectTrigger>
              <SelectContent>
                {loadingData ? (
                  <SelectItem value="loading" disabled>Chargement des commerciaux...</SelectItem>
                ) : salesEmployees.length > 0 ? (
                  salesEmployees.map((employee) => (
                    <SelectItem key={employee.id_employe} value={String(employee.id_employe)}>
                      {employee.prenom ? `${employee.prenom} ${employee.nom}` : employee.nom || `Employé ${employee.id_employe}`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Aucun commercial disponible</SelectItem>
                )}
              </SelectContent>
            </Select>
            {!loadingData && salesEmployees.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun employé avec le rôle "sales" n'a été trouvé dans la base de données.</p>
            )}
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