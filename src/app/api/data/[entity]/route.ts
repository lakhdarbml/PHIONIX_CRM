import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

const ALLOWED = new Set([
  'Personne','Role','Employe','Client','Produit','Opportunite','Type_Interaction','Objectif','Interaction','Task','Conversation','Participant','Message'
]);

export async function GET(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { entity } = params || {};
    if (!ALLOWED.has(entity)) return NextResponse.json({ error: 'Entity not allowed' }, { status: 400 });

    const rows = await query(`SELECT * FROM \`${entity}\``);
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
