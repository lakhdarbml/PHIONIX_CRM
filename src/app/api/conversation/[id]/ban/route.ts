import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { io as clientIo } from 'socket.io-client';

export async function PUT(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const { isBanned, user_id } = await request.json();
    if (!user_id) {
      return NextResponse.json({ error: 'user_id requis' }, { status: 400 });
    }
    // Contrôle rôle
    const [user] = await query('SELECT r.libelle FROM employe e JOIN role r ON r.id_role = e.id_role WHERE e.id_personne = ?', [user_id]);
    if (!user || !['admin','manager'].includes(String(user.libelle).toLowerCase())) {
      return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
    }
    await query('UPDATE conversation SET is_banned = ? WHERE id_conversation = ?', [isBanned ? 1 : 0, id]);
    const [updated] = await query('SELECT * FROM conversation WHERE id_conversation = ?', [id]);
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Erreur bannissement conv', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}