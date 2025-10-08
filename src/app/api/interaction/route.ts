import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const { id_employe, id_client, id_type, resultat, date_interaction } = body;
  if (!id_employe || !id_client) return NextResponse.json({ error: 'id_employe and id_client are required' }, { status: 400 });

  const result: any = await query('INSERT INTO Interaction (id_employe, id_client, id_type, resultat, date_interaction) VALUES (?, ?, ?, ?, ?)', [id_employe, id_client, id_type || null, resultat || null, date_interaction || new Date()]);
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM Interaction WHERE id_interaction = ?', [insertId]);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_interaction, id_employe, id_client, id_type, resultat, date_interaction } = body;
  if (!id_interaction) return NextResponse.json({ error: 'id_interaction required' }, { status: 400 });

  await query('UPDATE Interaction SET id_employe = ?, id_client = ?, id_type = ?, resultat = ?, date_interaction = ? WHERE id_interaction = ?', [id_employe || null, id_client || null, id_type || null, resultat || null, date_interaction || null, id_interaction]);
  const rows = await query('SELECT * FROM Interaction WHERE id_interaction = ?', [id_interaction]);
  return NextResponse.json(rows[0] || null);
}
