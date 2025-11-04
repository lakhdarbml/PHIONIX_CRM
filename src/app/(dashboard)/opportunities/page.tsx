
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
  
  // Opportunités filtrées par le clic sur la timeline
  const timelineFilteredOpportunities = useMemo(() => {
    if (selectedStage === null) {
      return filteredOpportunities;
    }
    return filteredOpportunities.filter((opp: Opportunite) => opp.etape === selectedStage);
  }, [filteredOpportunities, selectedStage]);

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
                  {/* Timeline horizontale interactive - ligne avec points cliquables */}
                  <div className="relative w-full mb-8 py-6 bg-muted/30 rounded-lg border-2 border-primary/20">
                    {/* Ligne de timeline épaisse et colorée */}
                    <div className="absolute top-10 left-4 right-4 h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 rounded-full shadow-lg border-2 border-white"></div>
                    
                    {/* Points interactifs pour chaque statut - ordonnés selon l'enchaînement */}
                    <div className="relative flex justify-between items-start" style={{ height: '120px' }}>
                      {/* Statuts principaux dans l'ordre chronologique */}
                      {['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Gagnée'].map((stage, index) => {
                        const stageOpps = filteredOpportunities.filter((o: any) => o.etape === stage);
                        const percentage = (index / 4) * 100;
                        const isSelected = selectedStage === stage;
                        
                        return (
                          <div 
                            key={stage} 
                            className="absolute flex flex-col items-center z-30 transition-all"
                            style={{ left: `calc(4px + ${percentage}% * (100% - 8px) / 100)`, transform: 'translateX(-50%)', top: '5px' }}
                          >
                            {/* Point cliquable sur la timeline */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedStage(isSelected ? null : stage);
                              }}
                              className={`w-10 h-10 rounded-full border-4 border-white shadow-xl z-30 flex items-center justify-center transition-all hover:scale-125 active:scale-95 cursor-pointer ${
                                isSelected 
                                  ? 'bg-primary scale-125 ring-4 ring-primary/50 animate-pulse' 
                                  : stageOpps.length > 0 
                                    ? 'bg-primary scale-110 ring-2 ring-primary/50 hover:ring-4' 
                                    : 'bg-muted scale-100 hover:bg-primary/50'
                              }`}
                              style={{ marginTop: '-2px' }}
                              aria-label={`Voir les opportunités ${stage}`}
                            >
                              {stageOpps.length > 0 && (
                                <span className="text-white text-xs font-bold">{stageOpps.length}</span>
                              )}
                            </button>
                            {/* Étiquette de l'étape cliquable */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedStage(isSelected ? null : stage);
                              }}
                              className={`mt-4 text-center min-w-[130px] px-3 py-2 rounded-md shadow-sm transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-primary text-white scale-110 ring-2 ring-primary' 
                                  : 'bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-md'
                              }`}
                            >
                              <p className={`text-sm font-bold whitespace-nowrap ${
                                isSelected ? 'text-white' : 'text-foreground'
                              }`}>
                                {stage}
                              </p>
                              <Badge 
                                variant={isSelected ? 'secondary' : (stageVariant[stage] || 'secondary')} 
                                className="mt-1 text-xs"
                              >
                                {stageOpps.length} opp.
                              </Badge>
                            </button>
                          </div>
                        );
                      })}
                      
                      {/* Points pour les états finaux (à droite de la ligne) */}
                      {['Perdue', 'Clôturé', 'Arrêtée'].map((stage, index) => {
                        const stageOpps = filteredOpportunities.filter((o: any) => o.etape === stage);
                        if (stageOpps.length === 0) return null;
                        const isSelected = selectedStage === stage;
                        
                        return (
                          <div 
                            key={stage} 
                            className="absolute flex flex-col items-end z-30 transition-all"
                            style={{ right: '4px', top: `${index * 40 + 5}px` }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedStage(isSelected ? null : stage);
                              }}
                              className={`w-10 h-10 rounded-full border-4 border-white shadow-xl z-30 flex items-center justify-center transition-all hover:scale-125 active:scale-95 ring-2 cursor-pointer ${
                                isSelected 
                                  ? 'bg-red-500 scale-125 ring-4 ring-red-500/50 animate-pulse' 
                                  : stageVariant[stage] === 'destructive' 
                                    ? 'bg-red-500 ring-red-500/50 hover:ring-4' 
                                    : 'bg-gray-500 ring-gray-500/50 hover:ring-4'
                              }`}
                              aria-label={`Voir les opportunités ${stage}`}
                            >
                              <span className="text-white text-xs font-bold">{stageOpps.length}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedStage(isSelected ? null : stage);
                              }}
                              className={`mt-3 text-right min-w-[130px] px-3 py-2 rounded-md shadow-sm transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-red-500 text-white scale-110 ring-2 ring-red-500' 
                                  : 'bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-md'
                              }`}
                            >
                              <p className={`text-sm font-bold whitespace-nowrap ${
                                isSelected ? 'text-white' : 'text-foreground'
                              }`}>
                                {stage}
                              </p>
                              <Badge 
                                variant={isSelected ? 'secondary' : (stageVariant[stage] || 'secondary')} 
                                className="mt-1 text-xs"
                              >
                                {stageOpps.length} opp.
                              </Badge>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Bouton pour réinitialiser le filtre */}
                    {selectedStage && (
                      <div className="absolute bottom-2 right-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedStage(null)}
                          className="bg-white/90 backdrop-blur-sm"
                        >
                          Voir toutes les opportunités
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Opportunités filtrées selon le point sélectionné */}
                  <div className="space-y-3 mt-4">
                    {selectedStage ? (
                      <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-sm font-semibold text-primary">
                          {timelineFilteredOpportunities.length} opportunité(s) au statut "{selectedStage}"
                        </p>
                      </div>
                    ) : (
                      <div className="mb-4 p-3 bg-muted/50 border border-muted rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">
                          👆 Cliquez sur un point de la timeline ci-dessus pour voir les opportunités d'un statut spécifique
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
                                {/* Barre de progression */}
                                <div className="mt-2">
                                  {!isFinalState && stageIndex >= 0 ? (
                                    <Progress value={((stageIndex + 1) / 5) * 100} className="h-2" />
                                  ) : isFinalState ? (
                                    <div className="h-2 bg-muted rounded-full">
                                      <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }}></div>
                                    </div>
                                  ) : null}
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
