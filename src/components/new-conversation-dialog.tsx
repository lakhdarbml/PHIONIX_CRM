
 'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/auth-context';
import { Avatar, AvatarFallback } from './ui/avatar';

import type { UIParticipant, Personne, Employe as EmployeType } from '@/types/db';

// Types (IDs can be number when coming from DB)
type PersonneLocal = Personne;
type Employe = EmployeType;
type FullEmployee = Employe & PersonneLocal;

type NewConversationDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateConversation: (title: string, participants: UIParticipant[]) => void;
  employees: FullEmployee[];
};

export function NewConversationDialog({ isOpen, onOpenChange, onCreateConversation, employees }: NewConversationDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<FullEmployee[]>([]);
  const [errors, setErrors] = useState({ title: false, participants: false });
  const [submitting, setSubmitting] = useState(false);

  const otherEmployees = user ? employees.filter(e => e.email !== user.email) : [];

  const handleSelectEmployee = (employee: FullEmployee) => {
    setSelectedEmployees(prev =>
      prev.some(e => e.id_employe === employee.id_employe)
        ? prev.filter(e => e.id_employe !== employee.id_employe)
        : [...prev, employee]
    );
  };

  const handleSubmit = () => {
    let err = { title: !title.trim(), participants: selectedEmployees.length === 0 };
    setErrors(err);
    if (err.title || err.participants) {
      return;
    }
    setSubmitting(true);
    try {
      if (user) {
        const participants = selectedEmployees.map(e => ({
          id: e.id_personne ?? e.id ?? `emp_${Date.now()}`,
          name: `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(),
          avatar: ''
        }));
        participants.push({ id: user.personneId, name: user.displayName || 'Moi', avatar: '' });
        onCreateConversation(title, participants); // parent doit gérer le toast
        onOpenChange(false);
        setTitle('');
        setSelectedEmployees([]);
        setErrors({ title: false, participants: false });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nouvelle conversation de groupe</DialogTitle>
          <DialogDescription>
            Démarrez une nouvelle discussion de groupe avec vos collègues.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Titre
            </Label>
            <Input
              id="title"
              value={title}
              aria-invalid={errors.title}
              className={errors.title ? "border-red-500 focus:ring-red-500" : ""}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex : Planification Projet Alpha"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Participants</Label>
            <ScrollArea className={"col-span-3 h-48 rounded-md border p-2 "+(errors.participants?"border-red-500 ring-red-500":"")}
              aria-invalid={errors.participants}
            >
              <div className="space-y-2">
                {otherEmployees.map(employee => (
                  <div key={employee.id_employe} className="flex items-center space-x-2">
                    <Checkbox
                      id={`emp-${employee.id_employe}`}
                      checked={selectedEmployees.some(e => e.id_employe === employee.id_employe)}
                      onCheckedChange={() => handleSelectEmployee(employee)}
                    />
                    <Label
                      htmlFor={`emp-${employee.id_employe}`}
                      className="flex-1 cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                    <AvatarFallback>{employee.prenom ? `${employee.prenom[0]}${(employee.nom ?? '')[0] ?? ''}`: '??'}</AvatarFallback>
                            </Avatar>
                            <span>{employee.prenom} {employee.nom}</span>
                        </div>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" onClick={handleSubmit} disabled={submitting}>{submitting?"Création...":"Créer la conversation"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
