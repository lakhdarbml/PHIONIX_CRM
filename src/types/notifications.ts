import { ID } from './db';

export type NotificationType = 
  | 'MESSAGE'              // Nouveaux messages
  | 'OPPORTUNITY'          // Nouvelles opportunités ou mises à jour
  | 'TASK_ASSIGNMENT'      // Attribution de tâches
  | 'TASK_STATUS'         // Changement de statut de tâche
  | 'CLIENT_REQUEST'      // Demandes client (inscription, validation)
  | 'CLIENT_VALIDATION'   // Validation client par manager
  | 'ADMIN_SUPERVISION'   // Notifications de supervision pour admin
  | 'MANAGER_ACTION'      // Actions des managers nécessitant validation
  | 'TEAM_UPDATE';        // Mises à jour d'équipe

export type NotificationPermission = {
  type: NotificationType;
  roles: string[];        // Rôles autorisés à recevoir ce type
  conditions?: {          // Conditions supplémentaires
    field: string;
    value: any;
  }[];
};

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  priority: 'low' | 'medium' | 'high';
}

// Configuration des permissions par type de notification
export const notificationPermissions: NotificationPermission[] = [
  {
    type: 'MESSAGE',
    roles: ['admin', 'manager', 'sales', 'support', 'client'],
    conditions: [{ field: 'participant', value: 'true' }]
  },
  {
    type: 'OPPORTUNITY',
    roles: ['admin', 'manager', 'sales']
  },
  {
    type: 'TASK_ASSIGNMENT',
    roles: ['admin', 'manager', 'sales', 'support']
  },
  {
    type: 'TASK_STATUS',
    roles: ['admin', 'manager', 'sales', 'support']
  },
  {
    type: 'CLIENT_REQUEST',
    roles: ['admin', 'manager']
  },
  {
    type: 'CLIENT_VALIDATION',
    roles: ['admin']
  },
  {
    type: 'ADMIN_SUPERVISION',
    roles: ['admin']
  },
  {
    type: 'MANAGER_ACTION',
    roles: ['admin']
  },
  {
    type: 'TEAM_UPDATE',
    roles: ['admin', 'manager', 'sales', 'support']
  }
];

// Templates de notifications
export const notificationTemplates: { [key in NotificationType]: NotificationTemplate } = {
  MESSAGE: {
    id: 'message-template',
    type: 'MESSAGE',
    titleTemplate: 'Nouveau message de {senderName}',
    messageTemplate: '{senderName} vous a envoyé un message dans {conversationTitle}',
    priority: 'medium'
  },
  OPPORTUNITY: {
    id: 'opportunity-template',
    type: 'OPPORTUNITY',
    titleTemplate: 'Nouvelle opportunité: {opportunityName}',
    messageTemplate: 'Une nouvelle opportunité a été créée: {opportunityName} avec un potentiel de {value}',
    priority: 'high'
  },
  TASK_ASSIGNMENT: {
    id: 'task-assignment-template',
    type: 'TASK_ASSIGNMENT',
    titleTemplate: 'Nouvelle tâche assignée',
    messageTemplate: 'Vous avez été assigné à la tâche: {taskTitle}',
    priority: 'high'
  },
  TASK_STATUS: {
    id: 'task-status-template',
    type: 'TASK_STATUS',
    titleTemplate: 'Mise à jour de tâche',
    messageTemplate: 'La tâche "{taskTitle}" est maintenant {status}',
    priority: 'medium'
  },
  CLIENT_REQUEST: {
    id: 'client-request-template',
    type: 'CLIENT_REQUEST',
    titleTemplate: 'Nouvelle demande client',
    messageTemplate: '{clientName} a fait une demande de {requestType}',
    priority: 'high'
  },
  CLIENT_VALIDATION: {
    id: 'client-validation-template',
    type: 'CLIENT_VALIDATION',
    titleTemplate: 'Validation client par {managerName}',
    messageTemplate: 'Le manager {managerName} a {action} le client {clientName}',
    priority: 'high'
  },
  ADMIN_SUPERVISION: {
    id: 'admin-supervision-template',
    type: 'ADMIN_SUPERVISION',
    titleTemplate: 'Action nécessitant supervision',
    messageTemplate: '{userRole} {userName} a effectué {action} qui nécessite votre supervision',
    priority: 'high'
  },
  MANAGER_ACTION: {
    id: 'manager-action-template',
    type: 'MANAGER_ACTION',
    titleTemplate: 'Action manager: {actionType}',
    messageTemplate: 'Le manager {managerName} a {action}',
    priority: 'high'
  },
  TEAM_UPDATE: {
    id: 'team-update-template',
    type: 'TEAM_UPDATE',
    titleTemplate: 'Mise à jour équipe',
    messageTemplate: '{updateType}: {details}',
    priority: 'medium'
  }
};