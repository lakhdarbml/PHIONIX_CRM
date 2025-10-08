
'use client';

import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/auth-context';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Interaction = {
  id_interaction: number | string;
  resultat?: string;
  date_interaction: string;
  id_client: number | string;
  id_employe: number | string;
};

type Personne = {
  id_personne: number | string;
  nom: string;
  prenom?: string;
};

type Client = {
  id_client: number | string;
  id_personne: number | string;
};

type Employe = {
  id_employe: number | string;
  id_personne: number | string;
};

// (types defined above)

export default function InteractionDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employes, setEmployes] = useState<Employe[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [interRes, personnesRes, clientsRes, employesRes] = await Promise.all([
          fetch('/api/data/Interaction'),
          fetch('/api/data/Personne'),
          fetch('/api/data/Client'),
          fetch('/api/data/Employe'),
        ]).then(rs => Promise.all(rs.map(r => r.json())));

        const found = (interRes || []).find((i: any) => String(i.id_interaction) === String(id));
        setInteraction(found || null);
        setPersonnes(personnesRes || []);
        setClients(clientsRes || []);
        setEmployes(employesRes || []);
      } catch (err) {
        console.error('Failed to load interaction detail', err);
      }
    };

    load();
  }, [id]);

  if (!interaction) {
    return <div>Interaction not found</div>;
  }

  const getPersonneById = (personneId: number | string): Personne | undefined => {
      return personnes.find(p => String(p.id_personne) === String(personneId));
  }
  
  const client = (clients as Client[]).find(c => String(c.id_client) === String(interaction.id_client));
  const clientPersonne = client ? getPersonneById(client.id_personne) : undefined;
  
  const employee = (employes as Employe[]).find(e => String(e.id_employe) === String(interaction.id_employe));
  const employeePersonne = employee ? getPersonneById(employee.id_personne) : undefined;
  
  const customerName = clientPersonne ? `${clientPersonne.prenom} ${clientPersonne.nom}` : 'Unknown Customer';
  const employeeName = employeePersonne ? `${employeePersonne.prenom} ${employeePersonne.nom}` : 'Unknown Employee';

  const canEdit = user?.role === 'admin' || user?.displayName === employeeName;

  return (
    <div className="flex flex-col h-full">
       <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/interactions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Interaction Details</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>{interaction.resultat || "Interaction"}</CardTitle>
            <CardDescription>
              {new Date(interaction.date_interaction).toLocaleString()} with {customerName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarFallback>{employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{employeeName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(interaction.date_interaction).toLocaleTimeString()}</p>
                </div>
                <div className="p-3 rounded-md bg-muted text-sm">
                  <p>{interaction.resultat}</p>
                </div>
              </div>
            </div>

            {/* This would be where you loop through notes/messages */}
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarFallback>{customerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                 <div className="flex items-center justify-between">
                    <p className="font-medium">{customerName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(interaction.date_interaction).toLocaleTimeString()}</p>
                </div>
                <div className="p-3 rounded-md border text-sm">
                  <p>This is a placeholder reply from the customer. In a real application, this would be part of the interaction thread.</p>
                </div>
              </div>
            </div>

          </CardContent>
          {canEdit && (
            <CardFooter>
              <div className="flex w-full items-center space-x-2">
                <Textarea placeholder="Type your message or note..." />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
