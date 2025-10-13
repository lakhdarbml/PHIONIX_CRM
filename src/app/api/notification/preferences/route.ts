import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { notificationPermissions } from '@/types/notifications';

// GET /api/notification/preferences?user_id=1
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Get user's existing preferences (DB columns: id_personne, type_notification, in_app_enabled)
    const preferences = await query<{ type_notification: string, in_app_enabled: number }[]>(
      'SELECT type_notification, in_app_enabled FROM NotificationPreferences WHERE id_personne = ?',
      [userId]
    );

    // Convert to a map for easier lookup
    const preferencesMap = new Map(
      preferences.map(p => [p.type_notification, Boolean(p.in_app_enabled)])
    );

    // Return all notification types with their current preference state
    const result = notificationPermissions.map(({ type }) => ({
      type,
      enabled: preferencesMap.get(type) ?? true // Default to enabled if no preference is set
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// POST /api/notification/preferences { user_id, type, enabled }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, type, enabled } = body;

    if (!user_id || !type || enabled === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert or update preference
    await query(
      `INSERT INTO NotificationPreferences (id_personne, type_notification, in_app_enabled)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE in_app_enabled = ?`,
      [user_id, type, enabled ? 1 : 0, enabled ? 1 : 0]
    );

    // Return updated preference
    const [updated] = await query<{ type_notification: string, in_app_enabled: number }[]>(
      'SELECT type_notification, in_app_enabled FROM NotificationPreferences WHERE id_personne = ? AND type_notification = ?',
      [user_id, type]
    );

    // Return shape expected by the UI: { notification_type, enabled }
    return NextResponse.json({ notification_type: updated?.type_notification, enabled: Boolean(updated?.in_app_enabled) });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Failed to update notification preference' },
      { status: 500 }
    );
  }
}