import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const { contenu, id_emetteur, id_conversation } = body;
  if (!contenu || !id_emetteur || !id_conversation) return NextResponse.json({ error: 'contenu, id_emetteur and id_conversation required' }, { status: 400 });

  const result: any = await query('INSERT INTO Message (contenu, date_envoi, id_emetteur, id_conversation) VALUES (?, ?, ?, ?)', [contenu, new Date(), id_emetteur, id_conversation]);
  const insertId = (result).insertId;
  const rows = await query('SELECT * FROM Message WHERE id_message = ?', [insertId]);

  // Return the created message. Clients should emit a socket event after successful creation.
  return NextResponse.json(rows[0] || null);
}
