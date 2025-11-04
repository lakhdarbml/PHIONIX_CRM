import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  const body = await request.json();
  const { titre, id_assigner_a, id_createur, id_client, description, statut, priorite, date_echeance } = body;
  if (!titre) return NextResponse.json({ error: 'titre is required' }, { status: 400 });
  if (!id_assigner_a) return NextResponse.json({ error: 'id_assigner_a is required' }, { status: 400 });
  if (!id_createur) return NextResponse.json({ error: 'id_createur is required' }, { status: 400 });

  const result: any = await query(
    'INSERT INTO task (titre, id_assigner_a, id_createur, id_client, description, statut, priorite, date_echeance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      titre,
      id_assigner_a,
      id_createur,
      id_client || null,
      description || null,
      statut || 'Ouverte',
      priorite || 'Moyenne',
      date_echeance || null,
    ]
  );
  const insertId = (result as any).insertId;
  const rows = await query('SELECT * FROM task WHERE id_task = ?', [insertId]);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id_task, titre, id_assigner_a, id_client, description, statut, priorite, date_echeance, user_id } = body;
  if (!id_task) return NextResponse.json({ error: 'id_task required' }, { status: 400 });
  if (!user_id) return NextResponse.json({ error: 'user_id requis' }, { status: 400 });
  // contrôle rôle
  const [user] = await query('SELECT r.libelle FROM employe e JOIN role r ON r.id_role = e.id_role WHERE e.id_personne = ?', [user_id]);
  if (!user || !['admin','manager'].includes(String(user.libelle).toLowerCase())) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }
  await query(
    'UPDATE task SET titre = ?, id_assigner_a = ?, id_client = ?, description = ?, statut = ?, priorite = ?, date_echeance = ? WHERE id_task = ?',
    [
      titre || null, id_assigner_a || null, id_client || null, description || null,
      statut || null, priorite || null, date_echeance || null, id_task,
    ]
  );
  const rows = await query('SELECT * FROM task WHERE id_task = ?', [id_task]);
  return NextResponse.json(rows[0] || null);
}
