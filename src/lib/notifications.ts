import { query } from './mysql';
import { notificationPermissions } from '@/types/notifications';
import type { ID } from '@/types/db';

export async function canUserReceiveNotification(userId: ID, notificationType: string): Promise<boolean> {
  try {
    // Lookup user's role label by joining Personne -> Employe -> Role
    // Some users are clients (not present in Employe). In that case we fallback to 'client'.
    const [row] = await query<{ libelle: string }[]>(
      `SELECT r.libelle
       FROM Personne p
       LEFT JOIN Employe e ON e.id_personne = p.id_personne
       LEFT JOIN Role r ON e.id_role = r.id_role
       WHERE p.id_personne = ?`,
      [userId]
    );

    let userRole: string | null = null;
    if (row && row.libelle) {
      userRole = String(row.libelle).toLowerCase();
    } else {
      // If no employe role, check if this person is a client
      const clientRows = await query<any[]>('SELECT 1 FROM Client WHERE id_personne = ? LIMIT 1', [userId]);
      if (clientRows && clientRows.length > 0) {
        userRole = 'client';
      }
    }

    if (!userRole) return false;
  const permission = notificationPermissions.find(p => p.type === notificationType);
    if (!permission) return false;

    return permission.roles.includes(userRole);
  } catch (e) {
    console.error('Error checking notification permissions:', e);
    return false;
  }
}

export async function getUserNotificationPreferences(userId: ID): Promise<Record<string, boolean>> {
  try {
    // Database stores preferences with columns: id_personne, type_notification, in_app_enabled
    const rows = await query<{ type_notification: string; in_app_enabled: number }[]>(
      'SELECT type_notification, in_app_enabled FROM NotificationPreferences WHERE id_personne = ?',
      [userId]
    );

    // Convert to a map of type -> enabled
    return rows.reduce((acc, { type_notification, in_app_enabled }) => {
      acc[type_notification] = Boolean(in_app_enabled);
      return acc;
    }, {} as Record<string, boolean>);
  } catch (e) {
    console.error('Error fetching notification preferences:', e);
    return {};
  }
}

export async function setUserNotificationPreference(
  userId: ID,
  notificationType: string,
  enabled: boolean
): Promise<boolean> {
  try {
    await query(
      `INSERT INTO NotificationPreferences (id_personne, type_notification, in_app_enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE in_app_enabled = ?`,
      [userId, notificationType, enabled ? 1 : 0, enabled ? 1 : 0]
    );
    return true;
  } catch (e) {
    console.error('Error updating notification preference:', e);
    return false;
  }
}