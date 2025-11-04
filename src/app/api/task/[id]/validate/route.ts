import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function PUT(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const { validate } = await request.json();
    // Normalize: update the `task` table (columns used in DB dump are id_task, statut, updated_at)
    // We map the legacy `validate` flag to a change in `statut`.
    if (!id) {
      return NextResponse.json({ error: 'Missing task id' }, { status: 400 });
    }

    // If validated, set statut -> 'En Cours' (or another appropriate active status).
    // If rejected, set statut -> 'Ouverte' (keeps it editable). Adjust if you want different behavior.
    const newStatut = validate ? 'En Cours' : 'Ouverte';

    await query(
      'UPDATE task SET statut = ?, updated_at = NOW() WHERE id_task = ?',
      [newStatut, id]
    );

    return NextResponse.json({ success: true, id, validated: !!validate, statut: newStatut });
  } catch (error) {
    console.error('Error validating task:', error);
    return NextResponse.json(
      { error: 'Failed to validate task' },
      { status: 500 }
    );
  }
}