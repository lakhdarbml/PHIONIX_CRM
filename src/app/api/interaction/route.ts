import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import emitNotification from '@/lib/notify';

export async function POST(request: Request) {
  const body = await request.json();
  const { id_employe, id_client, id_type, resultat, date_interaction } = body;
  if (!id_employe || !id_client) return NextResponse.json({ error: 'id_employe and id_client are required' }, { status: 400 });

  const result: any = await query('INSERT INTO Interaction (id_employe, id_client, id_type, resultat, date_interaction) VALUES (?, ?, ?, ?, ?)', [id_employe, id_client, id_type || null, resultat || null, date_interaction || new Date()]);
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM Interaction WHERE id_interaction = ?', [insertId]);
  const created = rows[0] || null;

  // Create a notification for the assigned employee and a copy for admins (supervision)
  try {
    const titre = 'Nouvelle interaction';
    const message = `${resultat || 'Nouvelle interaction enregistrée'}`;
    // notify assigned employee
    const res1: any = await query('INSERT INTO Notification (titre, message, destinataire_id, type_notification, meta) VALUES (?, ?, ?, ?, ?)', [titre, message, id_employe, 'TEAM_UPDATE', JSON.stringify({ id_interaction: insertId, id_client })]);
    const [notif1] = await query<any[]>('SELECT * FROM Notification WHERE id_notification = ?', [res1.insertId]);
    emitNotification(notif1);

    // notify admins (simple approach: all users with role 'admin')
    // Find admins by checking Employe -> Role relationship (Role.libelle = 'admin')
    const admins = await query<any[]>(
      `SELECT p.id_personne as id_personne
       FROM Personne p
       JOIN Employe e ON e.id_personne = p.id_personne
       JOIN Role r ON e.id_role = r.id_role
       WHERE r.libelle = ?`,
      ['admin']
    );
      for (const a of admins || []) {
        const resA: any = await query('INSERT INTO Notification (titre, message, destinataire_id, type_notification, meta) VALUES (?, ?, ?, ?, ?)', [titre, message, a.id_personne, 'TEAM_UPDATE', JSON.stringify({ id_interaction: insertId, id_client })]);
        const [notifA] = await query<any[]>('SELECT * FROM Notification WHERE id_notification = ?', [resA.insertId]);
        emitNotification(notifA);
      }
  } catch (e) {
    console.error('Failed to create/emit interaction notifications', e);
  }

  return NextResponse.json(created);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_interaction, id_employe, id_client, id_type, resultat, date_interaction } = body;
  if (!id_interaction) return NextResponse.json({ error: 'id_interaction required' }, { status: 400 });

  await query('UPDATE Interaction SET id_employe = ?, id_client = ?, id_type = ?, resultat = ?, date_interaction = ? WHERE id_interaction = ?', [id_employe || null, id_client || null, id_type || null, resultat || null, date_interaction || null, id_interaction]);
  const rows = await query('SELECT * FROM Interaction WHERE id_interaction = ?', [id_interaction]);
  return NextResponse.json(rows[0] || null);
}
