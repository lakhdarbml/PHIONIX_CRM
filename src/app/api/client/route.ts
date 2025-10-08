import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const { id_personne } = body;
  if (!id_personne) return NextResponse.json({ error: 'id_personne is required' }, { status: 400 });

  const result: any = await query('INSERT INTO Client (id_personne) VALUES (?)', [id_personne]);
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM Client WHERE id_client = ?', [insertId]);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_client, id_personne } = body;
  if (!id_client) return NextResponse.json({ error: 'id_client required' }, { status: 400 });

  await query('UPDATE Client SET id_personne = ? WHERE id_client = ?', [id_personne || null, id_client]);
  const rows = await query('SELECT * FROM Client WHERE id_client = ?', [id_client]);
  return NextResponse.json(rows[0] || null);
}
