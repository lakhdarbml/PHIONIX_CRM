import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const { titre, id_assigner_a, id_assigne_a, description, statut, priorite, date_echeance } = body;
  if (!titre) return NextResponse.json({ error: 'titre is required' }, { status: 400 });

  const result: any = await query('INSERT INTO Task (titre, id_assigner_a, id_assigne_a, description, statut, priorite, date_echeance) VALUES (?, ?, ?, ?, ?, ?, ?)', [titre, id_assigner_a || null, id_assigne_a || null, description || null, statut || 'Ouverte', priorite || 'Moyenne', date_echeance || null]);
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM Task WHERE id_task = ?', [insertId]);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_task, titre, id_assigner_a, id_assigne_a, description, statut, priorite, date_echeance } = body;
  if (!id_task) return NextResponse.json({ error: 'id_task required' }, { status: 400 });

  await query('UPDATE Task SET titre = ?, id_assigner_a = ?, id_assigne_a = ?, description = ?, statut = ?, priorite = ?, date_echeance = ? WHERE id_task = ?', [titre || null, id_assigner_a || null, id_assigne_a || null, description || null, statut || null, priorite || null, date_echeance || null, id_task]);
  const rows = await query('SELECT * FROM Task WHERE id_task = ?', [id_task]);
  return NextResponse.json(rows[0] || null);
}
