
'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Mail, Phone } from 'lucide-react';
import Link from 'next/link';
// Data now comes from server via /api/data/[Entity]
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Types
type Personne = { id_personne: string; nom: string; prenom?: string; email?: string; telephone?: string; };
type Client = { id_client: string; id_personne: string; statut?: string; };
type Opportunite = { id_opportunite: string; id_client: string; valeur?: number; etape: string; };
type Interaction = { id_interaction: string; id_client: string; resultat?: string; date_interaction: string; id_type: string };
type InteractionType = { id_type: string; libelle: string; };

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Actif: "default",
  Prospect: "secondary",
  Inactif: "outline",
  Suspendu: 'destructive',
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


export default function CustomerDetailPage() {
  const { id } = useParams();

  const [client, setClient] = useState<any | null>(null);
  const [personne, setPersonne] = useState<any | null>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [interactionTypes, setInteractionTypes] = useState<Map<any, any>>(new Map());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [clientsRes, oppRes, interRes, typesRes, personnesRes] = await Promise.all([
          fetch('/api/data/Client'),
          fetch('/api/data/Opportunite'),
          fetch('/api/data/Interaction'),
          fetch('/api/data/Type_Interaction'),
          fetch('/api/data/Personne')
        ]);
        if (!mounted) return;
        const clients = clientsRes.ok ? await clientsRes.json() : [];
        const opps = oppRes.ok ? await oppRes.json() : [];
        const inters = interRes.ok ? await interRes.json() : [];
        const types = typesRes.ok ? await typesRes.json() : [];
        const personnes = personnesRes.ok ? await personnesRes.json() : [];

        const foundClient = (clients || []).find((c: any) => String(c.id_client) === String(id));
        if (!foundClient) {
          setClient(null);
          return;
        }
        setClient(foundClient);
        const p = (personnes || []).find((pp: any) => String(pp.id_personne) === String(foundClient.id_personne));
        setPersonne(p || null);
        setOpportunities((opps || []).filter((o: any) => String(o.id_client) === String(id)));
        setInteractions((inters || []).filter((i: any) => String(i.id_client) === String(id)));
        setInteractionTypes(new Map((types || []).map((t: any) => [String(t.id_type), t.libelle])));
      } catch (err) {
        console.error('Failed to load client details', err);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (!client) {
    return (
        <div className="flex flex-col gap-4">
             <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                <Link href="/customers">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                </Button>
                <h1 className="text-xl font-semibold">Client non trouvé</h1>
            </div>
            <Card>
                <CardContent className="pt-6">
                    <p>Désolé, ce client est introuvable.</p>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  if (!personne) return <div>Chargement...</div>;

  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.valeur || 0), 0);
  const wonOpportunities = opportunities.filter(o => o.etape === 'Gagnée').length;


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  }

  // personne is loaded above; already returned if null while loading


  return (
    <div className="flex flex-col gap-4">
       <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">{personne.prenom} {personne.nom}</h1>
        <Button size="sm" variant="outline" className="ml-auto">
            <Edit className="mr-2 h-4 w-4" />
            Modifier
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur Totale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Toutes opportunités confondues</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunités Gagnées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonOpportunities}</div>
             <p className="text-xs text-muted-foreground">sur {opportunities.length} au total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interactions.length}</div>
            <p className="text-xs text-muted-foreground">Dernière il y a 2 jours</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Statut</CardTitle>
          </CardHeader>
          <CardContent>
            {client.statut && <Badge variant={statusVariant[client.statut]} className="text-lg capitalize">{client.statut}</Badge>}
             <p className="text-xs text-muted-foreground mt-2">Client depuis {personne.created_at ? new Date(personne.created_at).getFullYear() : 'N/A'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Opportunités</CardTitle>
            </CardHeader>
            <CardContent>
                {opportunities.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Titre</TableHead>
                                <TableHead>Étape</TableHead>
                                <TableHead className="text-right">Valeur</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {opportunities.map(opp => (
                                <TableRow key={opp.id_opportunite}>
                                    <TableCell>{opp.titre}</TableCell>
                                    <TableCell>
                                         <Badge variant={stageVariant[opp.etape]} className="capitalize">{opp.etape}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{opp.valeur ? formatCurrency(opp.valeur) : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center text-muted-foreground p-8">Aucune opportunité pour ce client.</div>
                )}
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Interactions Récentes</CardTitle>
            </CardHeader>
            <CardContent>
                 {interactions.length > 0 ? (
                    <div className="space-y-4">
                        {interactions.slice(0, 5).map(interaction => (
                            <div key={interaction.id_interaction} className="flex items-start gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium">
                                        {interactionTypes.get(interaction.id_type) || 'Interaction'}
                                        <span className="font-normal text-muted-foreground"> - {interaction.resultat}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">{new Date(interaction.date_interaction).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground p-8">Aucune interaction pour ce client.</div>
                )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}
