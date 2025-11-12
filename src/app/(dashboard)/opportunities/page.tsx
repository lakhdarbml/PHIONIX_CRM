
'use client';

import { useState, useMemo, useEffect } from "react";
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
import { FilePlus2, ListFilter, Handshake, BrainCircuit, Loader2, XCircle, RotateCcw, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/auth-context";
import { AddOpportunityDialog } from "@/components/add-opportunity-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

// Types based on db.json structure
type Opportunite = {
    id_opportunite: string;
    titre: string;
    valeur?: number;
    etape: string;
    date_creation: string;
    id_employe: string;
    id_client: string;
    [key: string]: any;
};


const stageVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  'Prospection': "secondary",
  'Qualification': "secondary",
  'Proposition': "default",
  'Négociation': "default",
  'Gagnée': "outline",
  'Perdue': "destructive",
  'Clôturé': 'outline',
  'Arrêtée': "destructive"
};

const ALL_STAGES = ['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Gagnée', 'Perdue', 'Clôturé', 'Arrêtée'];


type OpportunityScore = {
  [opportunityId: string]: {
    loading: boolean;
    data: { score: string; reasoning: string } | null;
  }
};

export default function OpportunitiesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scores, setScores] = useState<OpportunityScore>({});
  const [stageFilters, setStageFilters] = useState<string[]>(['Prospection', 'Qualification', 'Proposition', 'Négociation']);
  const [personnes, setPersonnes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [opportunites, setOpportunites] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [pRes, cRes, eRes, oRes] = await Promise.all([
          fetch('/api/data/Personne'),
          fetch('/api/data/Client'),
          fetch('/api/data/Employe'),
          fetch('/api/data/Opportunite')
        ]);
        if (!mounted) return;
        if (pRes.ok) {
          const personnesData = await pRes.json();
          setPersonnes(personnesData);
        }
        if (cRes.ok) {
          const clientsData = await cRes.json();
          setClients(clientsData);
        }
        if (eRes.ok) {
          const employesData = await eRes.json();
          setEmployes(employesData);
        }
        if (oRes.ok) {
          const opportunitesData = await oRes.json();
          console.log('Opportunités récupérées depuis la base:', opportunitesData);
          setOpportunites(opportunitesData);
        }
      } catch (err) {
        console.error('Failed to load opportunities data', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  
  const getParticipantName = (personneId: string) => {
    const personne = (personnes || []).find(p => String(p.id_personne) === String(personneId));
    return personne ? `${personne.prenom} ${personne.nom}` : personneId;
  }

  const opportunities = useMemo(() => {
    if (!user) return [];
    
    const allOpportunities = (opportunites || []) as Opportunite[];
    const clientsMap = new Map((clients || []).map((c: any) => [String(c.id_client), String(c.id_personne)]));

    // Normalize all opportunity IDs to strings for consistent comparison
    // MySQL may return decimal values as strings or Decimal objects
    const normalizedOpportunities = allOpportunities.map((o: any) => {
      let valeur: number | null = null;
      if (o.valeur != null) {
        const val = typeof o.valeur === 'string' ? parseFloat(o.valeur) : (typeof o.valeur === 'number' ? o.valeur : parseFloat(String(o.valeur)));
        valeur = isNaN(val) ? null : val;
      }
      return {
        ...o,
        id_opportunite: String(o.id_opportunite),
        id_employe: String(o.id_employe),
        id_client: String(o.id_client),
        valeur,
        etape: o.etape || null,
        date_creation: o.date_creation || new Date().toISOString(),
      };
    });

    if (user.role === 'admin' || user.role === 'manager') {
      return normalizedOpportunities;
    }

    if (user.role === 'client') {
      return normalizedOpportunities.filter(o => {
          const clientPersonneId = clientsMap.get(String(o.id_client));
          return String(clientPersonneId) === String(user.personneId);
      });
    }
    
    // For sales and other roles, find their employe ID first.
    const employe = (employes || []).find((e: any) => String(e.id_personne) === String(user.personneId));
    if (employe) {
      return normalizedOpportunities.filter(o => String(o.id_employe) === String(employe.id_employe));
    }
    return [];

  }, [user, opportunites, clients, employes]);

  const filteredOpportunities = useMemo(() => {
    if (stageFilters.length === 0) {
      return opportunities;
    }
    return opportunities.filter(opp => stageFilters.includes(opp.etape));
  }, [opportunities, stageFilters]);

  // État pour la timeline interactive
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // format YYYY-MM
  
  // Comptage par étape pour une barre proportionnelle
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_STAGES.forEach(s => { counts[s] = 0; });
    (filteredOpportunities || []).forEach((o: any) => {
      const key = o?.etape ?? 'Prospection';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [filteredOpportunities]);
  const totalStageCount = useMemo(() => Object.values(stageCounts).reduce((a, b) => a + b, 0), [stageCounts]);
  
  // Opportunités filtrées par le clic sur la timeline
  const timelineFilteredOpportunities = useMemo(() => {
    let base = filteredOpportunities as Opportunite[];
    if (selectedStage !== null) {
      base = base.filter((opp: Opportunite) => opp.etape === selectedStage);
    }
    if (selectedMonth) {
      base = base.filter((opp: Opportunite) => {
        const d = opp.date_creation ? new Date(opp.date_creation) : null;
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonth;
      });
    }
    return base;
  }, [filteredOpportunities, selectedStage, selectedMonth]);

  // Build monthly buckets for the last 12 months
  const monthlyBuckets = useMemo(() => {
    const buckets: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = {};
    }
    (filteredOpportunities as Opportunite[]).forEach((opp) => {
      const d = opp.date_creation ? new Date(opp.date_creation) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets[key]) buckets[key] = {};
      const stage = opp.etape || 'Inconnu';
      buckets[key][stage] = (buckets[key][stage] || 0) + 1;
    });
    return buckets;
  }, [filteredOpportunities]);

  const monthKeys = useMemo(() => Object.keys(monthlyBuckets), [monthlyBuckets]);

  const STEP_ORDER = ['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Gagnée'] as const;
  const FINAL_STAGES = ['Perdue', 'Clôturé', 'Arrêtée'] as const;

  const handleSetStage = async (opportunity: Opportunite, targetStage: string) => {
    if (!user?.personneId) {
      toast({ title: 'Erreur', description: "Vous devez être connecté.", variant: 'destructive' });
      return;
    }
    const currentIndex = STEP_ORDER.indexOf(opportunity.etape as any);
    const targetIndex = STEP_ORDER.indexOf(targetStage as any);
    const isSequentialMove = targetIndex === currentIndex + 1;
    const canJump = isManagerOrAdmin;
    if (!canJump && !isSequentialMove) {
      toast({ title: 'Action non autorisée', description: "Vous ne pouvez avancer qu'à l'étape suivante.", variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(`/api/opportunite/${opportunity.id_opportunite}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etape: targetStage, user_id: user.personneId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Échec de mise à jour' }));
        throw new Error(err.error || 'Échec de mise à jour');
      }
      toast({ title: 'Étape mise à jour', description: `Nouvelle étape: ${targetStage}` });
      // refresh
      fetch('/api/data/Opportunite')
        .then(r => r.ok && r.json())
        .then(data => setOpportunites(data))
        .catch(console.error);
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message || 'Impossible de changer l\'étape', variant: 'destructive' });
    }
  };

  const handleStageFilterChange = (stage: string) => {
    setStageFilters(prev => 
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  const handleNegotiate = (opportunityName: string) => {
    toast({
      title: "Negotiation Started",
      description: `Your request to negotiate the opportunity "${opportunityName}" has been sent.`,
    });
  };

  const handleStopOpportunity = async (opportunity: Opportunite) => {
    if (!user?.personneId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour arrêter une opportunité.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir arrêter l'opportunité "${opportunity.titre}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/opportunite/${opportunity.id_opportunite}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etape: 'Arrêtée',
          user_id: user.personneId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(error.error || 'Échec de l\'arrêt de l\'opportunité');
      }

      toast({
        title: "Succès",
        description: `L'opportunité "${opportunity.titre}" a été arrêtée.`,
      });

      // Rafraîchir les opportunités
      fetch('/api/data/Opportunite')
        .then(res => res.ok && res.json())
        .then(data => setOpportunites(data))
        .catch(console.error);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || 'Impossible d\'arrêter l\'opportunité',
        variant: "destructive",
      });
    }
  };

  const handleRestoreOpportunity = async (opportunity: Opportunite) => {
    if (!user?.personneId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour restaurer une opportunité.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Voulez-vous restaurer l'opportunité "${opportunity.titre}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/opportunite/${opportunity.id_opportunite}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etape: 'Prospection', // Par défaut, on remet à Prospection
          user_id: user.personneId,
          restaurer: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(error.error || 'Échec de la restauration de l\'opportunité');
      }

      toast({
        title: "Succès",
        description: `L'opportunité "${opportunity.titre}" a été restaurée.`,
      });

      // Rafraîchir les opportunités
      fetch('/api/data/Opportunite')
        .then(res => res.ok && res.json())
        .then(data => setOpportunites(data))
        .catch(console.error);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || 'Impossible de restaurer l\'opportunité',
        variant: "destructive",
      });
    }
  };

  const handleDeleteOpportunity = async (opportunity: Opportunite) => {
    if (!user?.personneId) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour supprimer une opportunité.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'opportunité "${opportunity.titre}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/opportunite/${opportunity.id_opportunite}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.personneId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(error.error || 'Échec de la suppression de l\'opportunité');
      }

      toast({
        title: "Succès",
        description: `L'opportunité "${opportunity.titre}" a été supprimée définitivement.`,
      });

      // Rafraîchir les opportunités
      fetch('/api/data/Opportunite')
        .then(res => res.ok && res.json())
        .then(data => setOpportunites(data))
        .catch(console.error);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || 'Impossible de supprimer l\'opportunité',
        variant: "destructive",
      });
    }
  };

  const handleScoreOpportunity = async (opportunity: Opportunite) => {
    setScores(prev => ({
      ...prev,
      [opportunity.id_opportunite]: { loading: true, data: null }
    }));

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockScore = `${Math.floor(Math.random() * 40) + 50}%`;
      const mockReasoning = "Based on the recent positive interactions and the proposal stage, the likelihood of closing is high.";
      
      const result = { score: mockScore, reasoning: mockReasoning };

      setScores(prev => ({
        ...prev,
        [opportunity.id_opportunite]: { loading: false, data: result }
      }));
    } catch (error) {
      console.error("Failed to score opportunity:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: "Could not score the opportunity. Please try again.",
      });
      setScores(prev => ({
        ...prev,
        [opportunity.id_opportunite]: { loading: false, data: null }
      }));
    }
  };

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isClientView = user?.role === 'client';
  const isSales = user?.role === 'sales';
  
  // Opportunités arrêtées pour les admins
  const stoppedOpportunities = useMemo(() => {
    if (!isManagerOrAdmin) return [];
    return opportunities.filter((opp: Opportunite) => opp.etape === 'Arrêtée');
  }, [opportunities, isManagerOrAdmin]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }
  
  const clientsMap = useMemo(() => new Map((clients || []).map((c: any) => [String(c.id_client), String(c.id_personne)])), [clients]);
  const employesMap = useMemo(() => new Map((employes || []).map((e: any) => [String(e.id_employe), String(e.id_personne)])), [employes]);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Opportunités</CardTitle>
            <CardDescription>
              {isClientView ? "Consultez et gérez vos opportunités actuelles." : "Gérez vos opportunités de vente et suivez leur progression."}
            </CardDescription>
          </div>
          {(isManagerOrAdmin || isSales) && (
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
                  <DropdownMenuLabel>Filtrer par étape</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ALL_STAGES.map(stage => (
                    <DropdownMenuCheckboxItem
                        key={stage}
                        checked={stageFilters.includes(stage)}
                        onCheckedChange={() => handleStageFilterChange(stage)}
                     >
                      {stage}
                    </DropdownMenuCheckboxItem>
                  ))}
                  </DropdownMenuContent>
              </DropdownMenu>
              {isManagerOrAdmin && (
                <AddOpportunityDialog onOpportunityAdded={() => {
                  // Refetch opportunities when a new one is added
                  fetch('/api/data/Opportunite')
                    .then(res => res.ok && res.json())
                    .then(data => setOpportunites(data))
                    .catch(console.error);
                }} />
              )}
              <Button size="sm" variant="outline" className="h-8" asChild>
                <Link href="/opportunities/completed">Voir Opportunités Terminées</Link>
              </Button>
              </div>
          )}
        </CardHeader>
        <CardContent>
          {isManagerOrAdmin && stoppedOpportunities.length > 0 && (
            <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Opportunités arrêtées en attente</h3>
                  <p className="text-sm text-red-700">Vous avez {stoppedOpportunities.length} opportunité(s) arrêtée(s) nécessitant votre validation</p>
                </div>
                <Badge variant="destructive">{stoppedOpportunities.length}</Badge>
              </div>
              <div className="space-y-3">
                {stoppedOpportunities.map((opportunity: Opportunite) => {
                  const clientPersonneId = clientsMap.get(opportunity.id_client);
                  const employePersonneId = employesMap.get(opportunity.id_employe);
                  return (
                    <Card key={opportunity.id_opportunite} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{opportunity.titre}</h4>
                            <Badge variant="destructive">Arrêtée</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mb-3">
                            <div>
                              <span className="font-medium">Client:</span> {clientPersonneId ? getParticipantName(clientPersonneId) : opportunity.id_client}
                            </div>
                            <div>
                              <span className="font-medium">Valeur:</span> {opportunity.valeur ? formatCurrency(opportunity.valeur) : 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Propriétaire:</span> {employePersonneId ? getParticipantName(employePersonneId) : opportunity.id_employe}
                            </div>
                            <div>
                              <span className="font-medium">Créée le:</span> {new Date(opportunity.date_creation).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRestoreOpportunity(opportunity)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Restaurer
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteOpportunity(opportunity)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="table">Vue Tableau</TabsTrigger>
              <TabsTrigger value="timeline">Vue Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="table">
              {filteredOpportunities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunité</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead>Valeur</TableHead>
                  {(isManagerOrAdmin || isSales) && <TableHead>Score</TableHead>}
                  <TableHead>Terminée</TableHead>
                  {isManagerOrAdmin && <TableHead>Propriétaire</TableHead>}
                  <TableHead>Date de création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map((opportunity) => {
                  const scoreInfo = scores[opportunity.id_opportunite];
                  const clientPersonneId = clientsMap.get(opportunity.id_client);
                  const employePersonneId = employesMap.get(opportunity.id_employe);
                  return (
                    <TableRow key={opportunity.id_opportunite}>
                      <TableCell className="font-medium">{opportunity.titre}</TableCell>
                      <TableCell>{clientPersonneId ? getParticipantName(clientPersonneId) : opportunity.id_client}</TableCell>
                      <TableCell>
                        <Badge variant={stageVariant[opportunity.etape] || 'secondary'} className="capitalize">{opportunity.etape.replace('-', ' ')}</Badge>
                      </TableCell>
                      <TableCell>{opportunity.valeur ? formatCurrency(opportunity.valeur) : 'N/A'}</TableCell>
                      {(isManagerOrAdmin || isSales) && (
                        <TableCell>
                          {scoreInfo?.data ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline">{scoreInfo.data.score}</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{scoreInfo.data.reasoning}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <div className="w-20" />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {['Gagnée','Clôturé','Perdue'].includes(opportunity.etape) ? (
                          <Badge variant="outline" className="text-green-600 border-green-500">Oui</Badge>
                        ) : (
                          <span className="text-muted-foreground">Non</span>
                        )}
                      </TableCell>
                      {isManagerOrAdmin && <TableCell className="hidden md:table-cell">{employePersonneId ? getParticipantName(employePersonneId): opportunity.id_employe}</TableCell>}
                      <TableCell className="hidden md:table-cell">{new Date(opportunity.date_creation).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {isSales && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleScoreOpportunity(opportunity)} 
                              disabled={scoreInfo?.loading}
                            >
                              {scoreInfo?.loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <BrainCircuit className="mr-2 h-4 w-4" />
                              )}
                              Analyser
                            </Button>
                        )}
                        {isClientView && (
                          <Button variant="outline" size="sm" onClick={() => handleNegotiate(opportunity.titre)}>
                              <Handshake className="mr-2 h-4 w-4" />
                              Négocier
                          </Button>
                        )}
                        {(isManagerOrAdmin || isSales) && opportunity.etape !== 'Arrêtée' && opportunity.etape !== 'Gagnée' && opportunity.etape !== 'Perdue' && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleStopOpportunity(opportunity)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Arrêter
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ): (
              <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Aucune opportunité ne correspond aux filtres sélectionnés.</p>
              </div>
          )}
            </TabsContent>
            <TabsContent value="timeline">
              {filteredOpportunities.length > 0 ? (
                <div className="relative">
                  {/* Nouvelle timeline: histogramme mensuel empilé par statut */}
                  <div className="w-full mb-4">
                    {/* Stepper des statuts */}
                    <div className="p-4 bg-muted/30 rounded-lg border mb-3">
                      <div className="relative flex items-center justify-between">
                        {/* Ligne */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-muted rounded" />
                        {STEP_ORDER.map((stage, idx) => {
                          const isActive = selectedStage === stage;
                          return (
                            <div key={stage} className="relative z-10 flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => setSelectedStage(prev => prev === stage ? null : stage)}
                                className={`w-10 h-10 rounded-full border flex items-center justify-center text-[11px] font-semibold transition ${
                                  isActive ? 'bg-primary text-white border-primary shadow' : 'bg-background hover:bg-muted border-muted-foreground/30'
                                }`}
                                title={`${stage}`}
                                aria-label={`Filtrer par ${stage}`}
                              >
                                {idx + 1}
                              </button>
                              <span className="mt-1 text-[10px] text-muted-foreground whitespace-nowrap">{stage}</span>
                            </div>
                          );
                        })}
                        {/* États finaux à droite */}
                        <div className="relative z-10 flex items-center gap-2 ml-4">
                          {FINAL_STAGES.map(end => (
                            <button
                              key={end}
                              type="button"
                              onClick={() => setSelectedStage(prev => prev === end ? null : end)}
                              className={`px-2 py-1 rounded-md text-xs border transition ${selectedStage === end ? 'bg-red-500 text-white border-red-500' : 'bg-white hover:bg-muted border-muted-foreground/20'}`}
                              title={end}
                              aria-label={`Filtrer par ${end}`}
                            >
                              {end}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        {selectedMonth || selectedStage ? (
                          <Button variant="outline" size="sm" onClick={() => { setSelectedMonth(null); setSelectedStage(null); }}>Réinitialiser</Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <div className="relative flex items-center justify-between">
                        {/* Ligne */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-muted rounded" />
                        {/* Points mois */}
                        {monthKeys.map((key, idx) => {
                          const isActive = selectedMonth === key;
                          const counts = monthlyBuckets[key] || {};
                          const total = Object.values(counts).reduce((a: any, b: any) => a + b, 0);
                          return (
                            <div key={key} className="relative z-10 flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => setSelectedMonth(prev => prev === key ? null : key)}
                                className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-semibold transition ${
                                  isActive ? 'bg-primary text-white border-primary shadow' : 'bg-background hover:bg-muted border-muted-foreground/30'
                                }`}
                                title={`Mois ${key.slice(5)} • ${total} opp.`}
                                aria-label={`Filtrer mois ${key}`}
                              >
                                {key.slice(5)}
                              </button>
                              <span className="mt-1 text-[10px] text-muted-foreground">{String(idx + 1).padStart(2, '0')}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {selectedMonth && (
                      <p className="text-xs text-muted-foreground mt-2">Mois sélectionné: {selectedMonth}</p>
                    )}
                  </div>

                  {/* Opportunités filtrées selon le mois/les statuts */}
                  <div className="space-y-3 mt-4">
                    {selectedStage || selectedMonth ? (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-sm font-semibold text-primary">
                          {timelineFilteredOpportunities.length} opportunité(s)
                          {selectedStage ? <> au statut "{selectedStage}"</> : null}
                          {selectedMonth ? <> pour le mois {selectedMonth}</> : null}
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-muted/50 border border-muted rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">
                          👆 Sélectionnez un ou plusieurs filtres (statut ou mois) pour affiner les opportunités
                        </p>
                      </div>
                    )}
                    
                    {timelineFilteredOpportunities.length > 0 ? (
                      timelineFilteredOpportunities.map((opp: any) => {
                        const clientPersonneId = clientsMap.get(opp.id_client);
                        const employePersonneId = employesMap.get(opp.id_employe);
                        const stageIndex = ['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Gagnée'].indexOf(opp.etape);
                        const isFinalState = ['Perdue', 'Clôturé', 'Arrêtée'].includes(opp.etape);
                        
                        return (
                          <Card key={opp.id_opportunite} className="p-4 hover:shadow-lg transition-shadow border-l-4" 
                            style={{ borderLeftColor: stageVariant[opp.etape] === 'destructive' ? '#ef4444' : stageVariant[opp.etape] === 'outline' ? '#22c55e' : '#3b82f6' }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-base truncate">{opp.titre}</h4>
                                  <Badge variant={stageVariant[opp.etape] || 'secondary'} className="text-xs shrink-0">
                                    {opp.etape}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mb-3">
                                  <div>
                                    <span className="font-medium">Client:</span>{' '}
                                    {clientPersonneId ? getParticipantName(clientPersonneId) : opp.id_client}
                                  </div>
                                  <div>
                                    <span className="font-medium">Valeur:</span>{' '}
                                    <span className="font-semibold text-foreground">{opp.valeur ? formatCurrency(opp.valeur) : 'N/A'}</span>
                                  </div>
                                  {isManagerOrAdmin && (
                                    <div>
                                      <span className="font-medium">Propriétaire:</span>{' '}
                                      {employePersonneId ? getParticipantName(employePersonneId) : opp.id_employe}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-medium">Créée:</span>{' '}
                                    {new Date(opp.date_creation).toLocaleDateString()}
                                  </div>
                                </div>
                                {/* Stepper de progression */}
                                <div className="mt-2 space-y-2">
                                  {!isFinalState && stageIndex >= 0 ? (
                                    <Progress value={((stageIndex + 1) / 5) * 100} className="h-2" />
                                  ) : isFinalState ? (
                                    <div className="h-2 bg-muted rounded-full">
                                      <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }}></div>
                                    </div>
                                  ) : null}

                                  {/* Stepper interactif */}
                                  {!isFinalState && (
                                    <div className="flex items-center gap-3">
                                      {STEP_ORDER.map((stage, idx) => {
                                        const completed = idx < stageIndex;
                                        const current = idx === stageIndex;
                                        const canClick = isManagerOrAdmin || idx === stageIndex + 1 || current; // admin/manager: jump; sales: only next/current
                                        return (
                                          <div key={stage} className="flex items-center gap-3">
                                            <button
                                              type="button"
                                              onClick={() => canClick && !current && handleSetStage(opp as any, stage)}
                                              disabled={!canClick || current}
                                              className={`w-8 h-8 rounded-full text-xs font-bold border flex items-center justify-center transition ${
                                                current ? 'bg-primary text-white border-primary' : completed ? 'bg-green-500 text-white border-green-600' : canClick ? 'bg-white hover:bg-muted border-muted-foreground/30' : 'bg-muted text-muted-foreground border-muted'
                                              }`}
                                              aria-label={`Aller à ${stage}`}
                                              title={stage}
                                            >
                                              {idx + 1}
                                            </button>
                                            {idx < STEP_ORDER.length - 1 && (
                                              <div className={`w-10 h-[2px] ${idx < stageIndex ? 'bg-green-500' : 'bg-muted'} rounded`} />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })
                    ) : selectedStage ? (
                      <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed">
                        <p className="text-muted-foreground">Aucune opportunité au statut "{selectedStage}"</p>
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center rounded-md border-2 border-dashed bg-muted/20">
                        <div className="text-center">
                          <p className="text-muted-foreground font-medium mb-2">Timeline interactive</p>
                          <p className="text-sm text-muted-foreground">Cliquez sur un point de la timeline ci-dessus pour filtrer les opportunités par statut</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
                  <p className="text-muted-foreground">Aucune opportunité ne correspond aux filtres sélectionnés.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
