'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/auth-context';

type Opportunite = {
  id_opportunite: string;
  titre: string;
  etape: string;
  valeur?: number | string | null;
  id_client: string;
  id_employe: string;
  date_creation: string;
};

const stageVariant: { [key: string]: 'secondary' | 'outline' | 'destructive' } = {
  'Gagnée': 'outline',
  'Perdue': 'destructive',
  'Clôturé': 'outline',
  'Arrêtée': 'destructive',
};

export default function CompletedOpportunitiesPage() {
  const { user } = useAuth();
  const [opps, setOpps] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [personnes, setPersonnes] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [oRes, cRes, pRes, eRes] = await Promise.all([
          fetch('/api/data/Opportunite'),
          fetch('/api/data/Client'),
          fetch('/api/data/Personne'),
          fetch('/api/data/Employe'),
        ]);
        if (!mounted) return;
        if (oRes.ok) setOpps(await oRes.json());
        if (cRes.ok) setClients(await cRes.json());
        if (pRes.ok) setPersonnes(await pRes.json());
        if (eRes.ok) setEmployes(await eRes.json());
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const completedOpps = useMemo(() => {
    const data = (opps || []) as Opportunite[];
    const completedStages = ['Gagnée', 'Perdue', 'Clôturé'];
    if (isManagerOrAdmin) return data.filter(o => completedStages.includes(o.etape));
    // For other roles, show only owned opps
    if (!user) return [];
    const mine = data.filter(o => String(o.id_employe) === String(user.uid) || String(o.id_client) === String(user.uid));
    return mine.filter(o => completedStages.includes(o.etape));
  }, [opps, user, isManagerOrAdmin]);

  const personnesMap = useMemo(() => new Map((personnes || []).map((p: any) => [String(p.id_personne), p])), [personnes]);
  const clientsMap = useMemo(() => new Map((clients || []).map((c: any) => [String(c.id_client), String(c.id_personne)])), [clients]);
  const employesMap = useMemo(() => new Map((employes || []).map((e: any) => [String(e.id_employe), String(e.id_personne)])), [employes]);

  const getName = (personneId?: string) => {
    if (!personneId) return '';
    const p = personnesMap.get(String(personneId));
    return p ? `${p.prenom} ${p.nom}` : personneId;
  };

  const formatCurrency = (value: any) => {
    const n = typeof value === 'number' ? value : parseFloat(value ?? '');
    if (!isFinite(n)) return 'N/A';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Opportunités Terminées</CardTitle>
          <CardDescription>Vue dédiée pour les opportunités gagnées, perdues ou clôturées.</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
          <Link href="/opportunities">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux opportunités
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {completedOpps.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunité</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Étape</TableHead>
                <TableHead>Valeur</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Date de création</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedOpps.map((o) => {
                const clientPersonneId = clientsMap.get(String(o.id_client));
                const employePersonneId = employesMap.get(String(o.id_employe));
                return (
                  <TableRow key={o.id_opportunite}>
                    <TableCell className="font-medium">{o.titre}</TableCell>
                    <TableCell>{getName(String(clientPersonneId))}</TableCell>
                    <TableCell>
                      <Badge variant={stageVariant[o.etape] || 'secondary'}>{o.etape}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(o.valeur)}</TableCell>
                    <TableCell>{getName(String(employePersonneId))}</TableCell>
                    <TableCell>{o.date_creation ? new Date(o.date_creation).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-md border-2 border-dashed">
            <p className="text-muted-foreground">Aucune opportunité terminée.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}




