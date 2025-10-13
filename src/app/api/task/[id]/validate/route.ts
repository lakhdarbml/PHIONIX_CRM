import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function PUT(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const { validate } = await request.json();

    // Update task validation status
    await query(
      'UPDATE Tache SET valide = ?, date_modification = NOW() WHERE id_tache = ?',
      [validate ? 1 : 0, id]
    );

    // If task is validated, update its status to active
    if (validate) {
      await query(
        'UPDATE Tache SET status = "active" WHERE id_tache = ?',
        [id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error validating task:', error);
    return NextResponse.json(
      { error: 'Failed to validate task' },
      { status: 500 }
    );
  }
}