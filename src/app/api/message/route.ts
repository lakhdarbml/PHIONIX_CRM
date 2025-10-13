import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import emitNotification from '@/lib/notify';

export async function POST(request: Request) {
  const body = await request.json();
  const { contenu, id_emetteur, id_conversation } = body;
  if (!contenu || !id_emetteur || !id_conversation) return NextResponse.json({ error: 'contenu, id_emetteur and id_conversation required' }, { status: 400 });

  // Check conversation status: do not allow posting to banned conversations
  try {
    const [conversation] = await query('SELECT * FROM Conversation WHERE id_conversation = ?', [id_conversation]) as any[];
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // If conversation is banned, allow the creator or admins to post
    if (conversation.is_banned === 1 || conversation.is_banned === '1') {
      try {
        // If sender is creator, allow
        if (String(conversation.id_createur) === String(id_emetteur)) {
          // allowed
        } else {
          // Check whether sender is an employe and has role 'admin'
          const [employe] = await query(`SELECT e.*, r.libelle as role_name FROM Employe e JOIN Role r ON e.id_role = r.id_role WHERE e.id_personne = ?`, [id_emetteur]) as any[];
          if (!employe || String((employe.role_name || '').toLowerCase()) !== 'admin') {
            return NextResponse.json({ error: 'Conversation is banned' }, { status: 403 });
          }
        }
      } catch (innerErr) {
        console.error('Failed to verify sender role/creator when conversation is banned', innerErr);
        return NextResponse.json({ error: 'Failed to verify sender permissions' }, { status: 500 });
      }
    }
  } catch (e) {
    console.error('Failed to check conversation status before inserting message', e);
    return NextResponse.json({ error: 'Failed to verify conversation status' }, { status: 500 });
  }

  const result: any = await query('INSERT INTO Message (contenu, date_envoi, id_emetteur, id_conversation) VALUES (?, ?, ?, ?)', [contenu, new Date(), id_emetteur, id_conversation]);
  const insertId = (result).insertId;
  const rows = await query('SELECT * FROM Message WHERE id_message = ?', [insertId]);

  const created = rows[0] || null;

  // Create notifications for all conversation participants except the sender.
  try {
    const parts = await query<any[]>('SELECT id_personne FROM Participant WHERE id_conversation = ?', [id_conversation]);
    const recipients = (parts || []).map(p => p.id_personne).filter(r => String(r) !== String(id_emetteur));
    for (const destinataire_id of recipients) {
      const titre = 'Nouveau message';
      const message = `${contenu?.slice?.(0, 120) || 'Nouveau message'}`;
      // DB column is `type_notification` and expects uppercase enum values like 'MESSAGE'
      const res: any = await query(
        'INSERT INTO Notification (titre, message, destinataire_id, type_notification, meta) VALUES (?, ?, ?, ?, ?)',
        [titre, message, destinataire_id, 'MESSAGE', JSON.stringify({ id_message: insertId, id_conversation })]
      );
      const [createdNotif] = await query<any[]>('SELECT * FROM Notification WHERE id_notification = ?', [res.insertId]);
      // emit to socket server (best-effort)
      emitNotification(createdNotif);
    }
  } catch (e) {
    console.error('Failed to create/emit message notifications', e);
  }

  // Return the created message.
  return NextResponse.json(created);
}
