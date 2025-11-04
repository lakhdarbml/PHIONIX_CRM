import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

// Map public entity names (used in routes) to actual database table names.
// This avoids issues with casing differences between route params and real table names.
const ENTITY_MAP: Record<string, string> = {
  Personne: 'personne',
  Role: 'role',
  Employe: 'employe',
  Client: 'client',
  Produit: 'produit',
  Opportunite: 'opportunite',
  Type_Interaction: 'type_interaction',
  Objectif: 'objectif',
  Interaction: 'interaction',
  Task: 'task',
  Tache: 'task',
  Conversation: 'conversation',
  Participant: 'participant',
  Message: 'message',
};

export async function GET(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { entity } = params || {};

    const table = ENTITY_MAP[entity];
    if (!table) {
      console.warn(`Blocked request for unknown entity: ${entity}`);
      return NextResponse.json({ error: 'Entity not allowed' }, { status: 400 });
    }

    // Build a simple SELECT that optionally respects certain query params.
    // If caller passed ?valide=... for Tache, translate to the task.status convention used in DB.
    const url = new URL(request.url);
    const valideParam = url.searchParams.get('valide');

    let sql = `SELECT * FROM \`${table}\``;
    const sqlParams: any[] = [];

    if (entity === 'Tache' && typeof valideParam === 'string') {
      // The codebase historically used a 'valide' flag; in the current `task` table
      // validation is represented by the `statut` column (e.g. 'PendingValidation').
      // Map the query param to a WHERE clause: valide=false => statut = 'PendingValidation'
      if (valideParam === 'false' || valideParam === '0') {
        sql += ' WHERE statut = ?';
        sqlParams.push('PendingValidation');
      } else {
        sql += ' WHERE statut != ?';
        sqlParams.push('PendingValidation');
      }
    }

    const rows = await query(sql, sqlParams.length ? sqlParams : undefined);
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Error in /api/data/[entity] GET:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
