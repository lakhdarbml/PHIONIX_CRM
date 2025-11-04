import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

// PUT /api/notification/[id] to mark as read/unread
export async function PUT(
  request: Request,
  context: any
) {
  try {
    const params = (context && context.params) ? await context.params : undefined;
    const notificationId = params?.id;
    if (!notificationId || isNaN(Number(notificationId))) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    const body = await request.json();
    const { user_id } = body as { user_id?: string | number; lu?: boolean };

    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // Check que user_id === destinataire_id
    const [notification] = await query<any[]>(
      'SELECT * FROM notification WHERE id_notification = ? AND destinataire_id = ?',
      [notificationId, user_id]
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found or access denied' }, { status: 403 });
    }

    if ((body as any).lu !== undefined) {
      if ((body as any).lu) {
        await query(
          'UPDATE notification SET lu = ?, date_lecture = ? WHERE id_notification = ? AND destinataire_id = ?',
          [1, new Date(), notificationId, user_id]
        );
      } else {
        await query(
          'UPDATE notification SET lu = ?, date_lecture = NULL WHERE id_notification = ? AND destinataire_id = ?',
          [0, notificationId, user_id]
        );
      }

      const [updated] = await query<any[]>(
        'SELECT * FROM notification WHERE id_notification = ?',
        [notificationId]
      );

      return NextResponse.json(updated || null);
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}


