import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const { prenom, nom, email, telephone } = body;
  if (!nom) return NextResponse.json({ error: 'nom is required' }, { status: 400 });

  const result: any = await query('INSERT INTO Personne (prenom, nom, email, telephone) VALUES (?, ?, ?, ?)', [prenom || null, nom, email || null, telephone || null]);
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM Personne WHERE id_personne = ?', [insertId]);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_personne, prenom, nom, email, telephone } = body;
  if (!id_personne) return NextResponse.json({ error: 'id_personne required' }, { status: 400 });

  await query('UPDATE Personne SET prenom = ?, nom = ?, email = ?, telephone = ? WHERE id_personne = ?', [prenom || null, nom, email || null, telephone || null, id_personne]);
  const rows = await query('SELECT * FROM Personne WHERE id_personne = ?', [id_personne]);
  return NextResponse.json(rows[0] || null);
}
