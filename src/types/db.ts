// Centralized types for database entities
// Use these types across the project to avoid duplicate identifier errors

export type ID = number | string;

export interface Role {
  id: ID;
  name: string;
}

export interface Personne {
  // canonical
  id?: ID;
  uid?: string | null;
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  roleId?: ID | null;

  // DB snake_case aliases used in many components
  id_personne?: ID;
  nom?: string;
  prenom?: string | null;
}

export interface Employe {
  id?: ID;
  personneId?: ID;
  title?: string | null;
  department?: string | null;
  startDate?: string | null;

  // DB aliases
  id_employe?: ID;
  id_personne?: ID;
  id_role?: ID;
}

export interface Client {
  id: ID;
  personneId: ID;
  company?: string | null;
  industry?: string | null;
}

export interface Opportunite {
  id: ID;
  clientId?: ID | null;
  name: string;
  montant?: number | null;
  probabilite?: number | null; // 0-100
  statut?: string | null;
  assignedToId?: ID | null; // employeId
}

export interface Task {
  id: ID;
  title: string;
  description?: string | null;
  assignedToId?: ID | null; // employeId
  dueDate?: string | null;
  status?: string | null;
}

export interface Interaction {
  id: ID;
  type?: string | null;
  date?: string | null;
  note?: string | null;
  personneId?: ID | null;
  employeId?: ID | null;
  clientId?: ID | null;
}

// DB-specific conversation/participant/message shapes
export interface Participant {
  id_conversation?: ID;
  id_personne?: ID;
  type_participant?: 'Employe' | 'Client' | string;
}

export interface ConversationDB {
  id_conversation?: ID;
  titre?: string;
  isBanned?: boolean;
  participants?: Participant[];
  lastMessage?: string;
  lastMessageTimestamp?: string;
  unreadCount?: number;
}

export interface DBMessage {
  id_message?: ID;
  id_conversation?: ID;
  id_emetteur?: ID;
  contenu?: string;
  date_envoi?: string;
}

export interface Conversation {
  id: ID;
  subject?: string | null;
  participants?: ID[];
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId?: ID | null; // personneId
  body: string;
  createdAt?: string | null;
}

// UI-facing participant shape used by dialogs and the messages UI
export interface UIParticipant {
  id: ID; // personne id as string or number
  name: string;
  avatar?: string;
  type?: 'Employe' | 'Client' | string;
}

export interface DBResult<T = any> {
  rows: T[];
}

export default {};
