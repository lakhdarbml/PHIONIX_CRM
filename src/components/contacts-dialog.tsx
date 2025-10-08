
'use client';

import { useMemo, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type User } from '@/context/auth-context';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
// Data is loaded from the server via /api/data/[Entity]


// Types based on db.json structure
type Personne = { id_personne: string | number; nom: string; prenom?: string; [key: string]: any; };
type Employe = { id_employe: string | number; id_personne: string | number; id_role: string | number; [key: string]: any; };
type Opportunite = { id_opportunite: string | number; id_employe: string | number; id_client: string | number; titre: string; [key: string]: any; };
type Interaction = { id_interaction: string | number; id_employe: string | number; id_client: string | number; [key: string]: any; };
type Task = { id_task: string | number; id_assigner_a: string | number; id_client: string | number | null; titre: string; [key: string]: any; };


type FullEmployee = Employe & Personne;

type ContactsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUser: User;
  onSelectContact: (employee: FullEmployee) => void;
  employees: FullEmployee[];
  opportunities: Opportunite[];
  interactions: Interaction[];
  tasks: Task[];
};

type Contact = FullEmployee & {
  commonContext: string;
  roleLibelle: string;
};

export function ContactsDialog({ isOpen, onOpenChange, currentUser, onSelectContact, employees, opportunities, interactions, tasks }: ContactsDialogProps) {
    const [roles, setRoles] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [personnes, setPersonnes] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [rRes, cRes, pRes] = await Promise.all([
                    fetch('/api/data/Role'),
                    fetch('/api/data/Client'),
                    fetch('/api/data/Personne')
                ]);
                if (!mounted) return;
                if (rRes.ok) setRoles(await rRes.json());
                if (cRes.ok) setClients(await cRes.json());
                if (pRes.ok) setPersonnes(await pRes.json());
            } catch (err) {
                console.error('Failed to load reference data for contacts dialog', err);
            }
        })();
        return () => { mounted = false; };
    }, []);
  
  const relevantContacts = useMemo(() => {
    if (!currentUser || !employees || !opportunities || !interactions || !tasks) return [];
    if (currentUser.role !== 'sales' && currentUser.role !== 'support') return [];
    
    const currentUserEmploye = employees.find(e => e.id_personne === currentUser.personneId);
    if (!currentUserEmploye) return [];

    const myCustomers = new Set<string>();
    
    if (currentUser.role === 'sales') {
        opportunities.forEach(opp => {
            if (String(opp.id_employe) === String(currentUserEmploye.id_employe)) {
                myCustomers.add(String(opp.id_client));
            }
        });
    }

    interactions.forEach(int => {
        if (String(int.id_employe) === String(currentUserEmploye.id_employe)) {
            myCustomers.add(String(int.id_client));
        }
    });

    tasks.forEach(task => {
        const client = (clients || []).find(c => String(c.id_client) === String(task.id_client));
        if (String(task.id_assigner_a) === String(currentUserEmploye.id_employe) && client) {
            myCustomers.add(String(client.id_client));
        }
    });
    
    const contactsMap = new Map<string, Contact>();
    const rolesMap = new Map((roles || []).map((r: any) => [String(r.id_role), r.libelle]));

    const addContact = (employeeId: string | number, context: string) => {
        if (String(employeeId) === String(currentUserEmploye.id_employe)) return;
        const employee = employees.find(e => String(e.id_employe) === String(employeeId));
        if (employee) {
            if (!contactsMap.has(String(employee.id_employe))) {
                contactsMap.set(String(employee.id_employe), { 
                    ...employee, 
                    commonContext: context,
                    roleLibelle: rolesMap.get(String(employee.id_role)) || 'N/A'
                });
            }
        }
    };
    
    opportunities.forEach(opp => {
        if (myCustomers.has(String(opp.id_client))) {
            addContact(opp.id_employe, opp.titre);
        }
    });

    interactions.forEach(int => {
        if (myCustomers.has(String(int.id_client))) {
            const client = (clients || []).find(c => String(c.id_client) === String(int.id_client));
            const clientPersonne = client ? (personnes || []).find((p: any) => String(p.id_personne) === String(client.id_personne)) : null;
            addContact(int.id_employe, `Client: ${clientPersonne?.nom}`);
        }
    });
    
    tasks.forEach(task => {
        if (task.id_client && myCustomers.has(String(task.id_client))) {
             addContact(task.id_assigner_a, task.titre);
        }
    });


    return Array.from(contactsMap.values());

  }, [currentUser, employees, opportunities, interactions, tasks]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contacts Pertinents</DialogTitle>
          <DialogDescription>
            Collègues travaillant sur vos clients ou opportunités.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 -mx-6">
            <div className="px-6">
                {relevantContacts.length > 0 ? (
                    relevantContacts.map((contact, index) => (
                        <div key={contact.id_employe}>
                            <Button variant="ghost" className="h-auto w-full justify-start py-3 px-2" onClick={() => onSelectContact(contact)}>
                                <div className="flex items-center gap-4 text-left">
                                    <Avatar>
                                        <AvatarFallback>{contact.prenom ? `${contact.prenom[0]}${contact.nom[0]}` : '??'}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid gap-1">
                                        <p className="font-semibold">{contact.prenom} {contact.nom}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Contexte : <span className="font-medium text-foreground">{contact.commonContext}</span>
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className="ml-auto capitalize">{contact.roleLibelle}</Badge>
                                </div>
                            </Button>
                            {index < relevantContacts.length - 1 && <Separator />}
                        </div>
                    ))
                ) : (
                    <div className="flex h-full items-center justify-center text-center text-muted-foreground p-8">
                        <p>Aucun contact pertinent trouvé pour vos clients et opportunités actuels.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
