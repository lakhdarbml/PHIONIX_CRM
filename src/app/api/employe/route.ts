import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const { id_personne, id_role } = body;
  if (!id_personne) return NextResponse.json({ error: 'id_personne is required' }, { status: 400 });

  const result: any = await query('INSERT INTO Employe (id_personne, id_role) VALUES (?, ?)', [id_personne, id_role || null]);
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM Employe WHERE id_employe = ?', [insertId]);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_employe, id_personne, id_role } = body;
  if (!id_employe) return NextResponse.json({ error: 'id_employe required' }, { status: 400 });

  await query('UPDATE Employe SET id_personne = ?, id_role = ? WHERE id_employe = ?', [id_personne || null, id_role || null, id_employe]);
  const rows = await query('SELECT * FROM Employe WHERE id_employe = ?', [id_employe]);
  return NextResponse.json(rows[0] || null);
}
