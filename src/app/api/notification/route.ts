import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { canUserReceiveNotification, getUserNotificationPreferences } from '@/lib/notifications';
import type { NotificationType } from '@/types/notifications';

// GET /api/notification?destinataire_id=1
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const destinataireId = url.searchParams.get('destinataire_id');

    if (!destinataireId) {
      return NextResponse.json({ error: 'Missing destinataire_id' }, { status: 400 });
    }

    // Get user's notification preferences
    const preferences = await getUserNotificationPreferences(destinataireId);

    // Get all notifications for the user
    const sql = `
      SELECT * FROM Notification 
      WHERE destinataire_id = ? 
      ORDER BY date_creation DESC
    `;
    const notifications = await query<any[]>(sql, [destinataireId]);

    // Filter notifications based on role permissions and preferences
    const filteredNotifications = await Promise.all(
      notifications.map(async (notification) => {
        // DB column is `type_notification`
        const notificationType = (notification.type_notification || notification.type) as NotificationType;
        const hasPermission = await canUserReceiveNotification(destinataireId, notificationType);
        const isEnabled = preferences[notificationType] ?? true; // Default to true if no preference set
        return hasPermission && isEnabled ? notification : null;
      })
    );

    // Remove null values and return filtered notifications
    return NextResponse.json(filteredNotifications.filter(Boolean) || []);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST /api/notification { titre, message, destinataire_id, type, meta }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titre, message, destinataire_id, type = 'info', meta } = body;

    if (!destinataire_id) {
      return NextResponse.json({ error: 'Missing destinataire_id' }, { status: 400 });
    }

    // Check if the user can receive this type of notification
    const canReceive = await canUserReceiveNotification(destinataire_id, type);
    if (!canReceive) {
      return NextResponse.json(
        { error: 'User does not have permission to receive this type of notification' },
        { status: 403 }
      );
    }

    // Check user's notification preferences
    const preferences = await getUserNotificationPreferences(destinataire_id);
    if (preferences[type] === false) {
      return NextResponse.json(
        { error: 'User has disabled this type of notification' },
        { status: 403 }
      );
    }

    // Create the notification
    // DB schema has column `type_notification` and `destinataire_id` for recipient
    const sql = 'INSERT INTO Notification (titre, message, destinataire_id, type_notification, meta) VALUES (?, ?, ?, ?, ?)';
    const res: any = await query(sql, [
      titre,
      message,
      destinataire_id,
      type,
      meta ? JSON.stringify(meta) : null
    ]);

    const [created] = await query<any[]>(
      'SELECT * FROM Notification WHERE id_notification = ?',
      [res.insertId]
    );

    return NextResponse.json(created || null);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PUT /api/notification/:id to mark as read
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const id = parts[parts.length - 1];
    const body = await request.json();

    // If updating read status
    if (body.lu !== undefined) {
      if (body.lu) {
        // mark as read and set date_lecture
        await query(
          'UPDATE Notification SET lu = ?, date_lecture = ? WHERE id_notification = ?',
          [1, new Date(), id]
        );
      } else {
        // mark as unread and clear date_lecture
        await query(
          'UPDATE Notification SET lu = ?, date_lecture = NULL WHERE id_notification = ?',
          [0, id]
        );
      }
      const [row] = await query<any[]>(
        'SELECT * FROM Notification WHERE id_notification = ?',
        [id]
      );
      return NextResponse.json(row || null);
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
