export interface Message {
  id_message: number;
  contenu: string;
  date_envoi: string;
  id_interaction: number;
  id_emetteur: number;
  id_destinataire: number;
}

export interface LastUpdateInfo {
  lastUpdate: string;
  lastMessageId: number;
}