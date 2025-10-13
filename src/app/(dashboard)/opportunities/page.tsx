
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
import { FilePlus2, ListFilter, Handshake, BrainCircuit, Loader2 } from "lucide-react";
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
  'Clôturé': 'outline'
};

const ALL_STAGES = ['Prospection', 'Qualification', 'Proposition', 'Négociation', 'Gagnée', 'Perdue', 'Clôturé'];


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
        if (pRes.ok) setPersonnes(await pRes.json());
        if (cRes.ok) setClients(await cRes.json());
        if (eRes.ok) setEmployes(await eRes.json());
        if (oRes.ok) setOpportunites(await oRes.json());
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
    const clientsMap = new Map((clients || []).map((c: any) => [String(c.id_client), c.id_personne]));

    if (user.role === 'admin' || user.role === 'manager') {
      return allOpportunities;
    }

    if (user.role === 'client') {
      return allOpportunities.filter(o => {
          const clientPersonneId = clientsMap.get(o.id_client);
          return clientPersonneId === user.personneId;
      });
    }
    
    // For sales and other roles, find their employe ID first.
  const employe = (employes || []).find((e: any) => String(e.id_personne) === String(user.personneId));
    if (employe) {
      return allOpportunities.filter(o => o.id_employe === employe.id_employe);
    }
    return [];

  }, [user]);

  const filteredOpportunities = useMemo(() => {
    if (stageFilters.length === 0) {
      return opportunities;
    }
    return opportunities.filter(opp => stageFilters.includes(opp.etape));
  }, [opportunities, stageFilters]);

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
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }
  
  const clientsMap = useMemo(() => new Map((clients || []).map((c: any) => [String(c.id_client), c.id_personne])), [clients]);
  const employesMap = useMemo(() => new Map((employes || []).map((e: any) => [String(e.id_employe), e.id_personne])), [employes]);

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
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
