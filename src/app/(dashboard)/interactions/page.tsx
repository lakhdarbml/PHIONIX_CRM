
'use client';

import React, { useState, useMemo } from 'react';
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
import { ListFilter, MessageSquare, Phone, Mail, Users, Sparkles, FilePlus2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from '@/context/auth-context';
import { useEffect } from 'react';

// Local types
type Interaction = {
  id_interaction: number | string;
  id_employe: number | string;
  id_client: number | string;
  id_type: number | string;
  date_interaction: string;
  resultat?: string;
  [key: string]: any;
};

type TypeInteraction = { id_type: number | string; libelle: string };
type Personne = { id_personne: number | string; prenom?: string; nom?: string };
type Client = { id_client: number | string; id_personne: number | string };
type Employe = { id_employe: number | string; id_personne: number | string };
type Participant = { id_conversation: number | string; id_personne: number | string; type_participant: string };

const ALL_TYPES = ['Appel', 'Email', 'Réunion', 'Note'];

const typeVariant: { [key: string]: "default" | "secondary" | "outline" } = {
  'Réunion': "default",
  'Appel': "secondary",
  'Email': "secondary",
  'Note': "outline",
};

const typeIcon: { [key: string]: React.ElementType } = {
    'Réunion': Users,
    'Appel': Phone,
    'Email': Mail,
    'Note': MessageSquare,
};

// ALL_TYPES already defined above


function InteractionsPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [typeFilters, setTypeFilters] = useState<string[]>(ALL_TYPES);

  const [interactions, setInteractions] = React.useState<Interaction[]>([]);
  const [types, setTypes] = React.useState<TypeInteraction[]>([]);
  const [personnes, setPersonnes] = React.useState<Personne[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [employes, setEmployes] = React.useState<Employe[]>([]);

  const getParticipantName = (personneId: number | string) => {
    const personne = personnes.find(p => String(p.id_personne) === String(personneId));
    return personne ? `${personne.prenom} ${personne.nom}` : String(personneId);
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [typesRes, interactionsRes, personnesRes, clientsRes, employesRes] = await Promise.all([
          fetch('/api/data/Type_Interaction'),
          fetch('/api/data/Interaction'),
          fetch('/api/data/Personne'),
          fetch('/api/data/Client'),
          fetch('/api/data/Employe'),
        ]).then(rs => Promise.all(rs.map(r => r.json())));

        setTypes(typesRes || []);
        setInteractions(interactionsRes || []);
        setPersonnes(personnesRes || []);
        setClients(clientsRes || []);
        setEmployes(employesRes || []);
      } catch (err) {
        console.error('Failed to load interactions data', err);
      }
    };

    load();
  }, []);

  const visibleInteractions = React.useMemo(() => {
    if (!user) return [];

    const allInteractions = interactions as Interaction[];
    const employe = (employes as Employe[]).find(e => String(e.id_personne) === String(user.personneId));

    if (user.role === 'admin' || user?.role === 'manager') {
      return allInteractions;
    }

    if (employe) {
      return allInteractions.filter(i => String(i.id_employe) === String(employe.id_employe));
    }
    return [];
  }, [user, interactions, employes]);

  const filteredInteractions = useMemo(() => {
    const typesMap = new Map((types as TypeInteraction[]).map(t => [String(t.id_type), t.libelle]));
    if(typeFilters.length === 0) {
      return visibleInteractions;
    }
    return visibleInteractions.filter(interaction => {
      const typeLabel = typesMap.get(String(interaction.id_type));
      return typeLabel && typeFilters.includes(typeLabel);
    });
  }, [visibleInteractions, typeFilters, types]);

  const handleTypeFilterChange = (type: string) => {
    setTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleRowClick = (id: string | number) => {
    router.push(`/interactions/${String(id)}`);
  };

  const canAddInteraction = user?.role === 'sales' || user?.role === 'support';
  const canGenerateInteractions = user?.role === 'admin' || user?.role === 'manager';

  const clientsMap = React.useMemo(() => new Map((clients as Client[]).map(c => [String(c.id_client), c.id_personne])), [clients]);
  const employesMap = React.useMemo(() => new Map((employes as Employe[]).map(e => [String(e.id_employe), e.id_personne])), [employes]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Interactions</CardTitle>
          <CardDescription>
            Consignez et consultez les interactions avec les clients.
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
              <DropdownMenuLabel>Filtrer par type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_TYPES.map(type => (
                <DropdownMenuCheckboxItem
                    key={type}
                    checked={typeFilters.includes(type)}
                    onCheckedChange={() => handleTypeFilterChange(type)}
                >
                    {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canAddInteraction && (
            <Button size="sm" className="h-8 gap-1">
              <FilePlus2 className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Ajouter une interaction
              </span>
            </Button>
          )}
          {canGenerateInteractions && (
            <Button size="sm" className="h-8 gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                 <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Générer les Interactions
                </span>
             </Button>
          )}
          <Button size="sm" className="h-8 gap-1" asChild>
             <Link href="/interactions/summarize">
                <Sparkles className="h-3.5 w-3.5" />
                 <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Résumer
                </span>
             </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredInteractions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Résumé</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInteractions.map((interaction) => {
                const typeInfo = (types as TypeInteraction[]).find(t => String(t.id_type) === String(interaction.id_type));
                const typeLabel = typeInfo?.libelle || "Inconnu";
                const Icon = typeIcon[typeLabel] || MessageSquare;
                const clientPersonneId = clientsMap.get(String(interaction.id_client));
                const employePersonneId = employesMap.get(String(interaction.id_employe));

                return (
                  <TableRow 
                    key={interaction.id_interaction} 
                    onClick={() => handleRowClick(interaction.id_interaction)}
                    className="cursor-pointer"
                  >
                      <TableCell>
                          <Badge variant={typeVariant[typeLabel] || 'outline'} className="capitalize">
                            <Icon className="h-3 w-3 mr-1" />
                            {typeLabel}
                          </Badge>
                      </TableCell>
                    <TableCell className="font-medium">{clientPersonneId ? getParticipantName(clientPersonneId) : 'N/A'}</TableCell>
                    <TableCell>{interaction.resultat || "Interaction consignée"}</TableCell>
                    <TableCell className="hidden md:table-cell">{employePersonneId ? getParticipantName(employePersonneId) : 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(String(interaction.date_interaction)).toLocaleDateString()}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground">Aucune interaction ne correspond aux filtres.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InteractionsPage() {
  return <InteractionsPageContent />
}
