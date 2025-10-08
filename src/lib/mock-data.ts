

export type Customer = {
    id: string;
    name: string;
    email: string;
    company: string;
    status: 'prospect' | 'active' | 'inactive' | 'lost';
    joined: string;
};

export type Employee = {
    id: string;
    name: string;
    email: string;
    role: 'manager' | 'sales' | 'support' | 'admin';
    joined: string;
};

export type Opportunity = {
    id: string;
    titre: string;
    id_client: string;
    valeur: number;
    etape: 'Prospection' | 'Qualification' | 'Proposition' | 'Négociation' | 'Gagnée' | 'Perdue';
    date_creation: string;
    id_employe: string;
}

export type Interaction = {
    id: string;
    id_client: string;
    id_employe: string;
    id_type: string;
    date_interaction: string;
    contenu?: string;
}

export type Conversation = {
    id: string;
    title: string;
    lastMessage: string;
    lastMessageTimestamp: any;
    unreadCount: number;
    participants: {
        id: string;
        name: string;
        avatar: string;
    }[];
    creatorId?: string;
    isBanned?: boolean;
};

export type Message = {
    id: string;
    conversationId: string;
    sender: string;
    timestamp: any;
    content: string;
};

export type Task = {
    id: string;
    titre: string;
    statut: 'Nouvelle' | 'En cours' | 'Terminée' | 'PendingValidation' | 'Rejetée';
    priorite: 'Basse' | 'Moyenne' | 'Haute';
    date_echeance: string;
    id_assigner_a: string;
    validated_by_admin: boolean;
    id_client?: string;
};
