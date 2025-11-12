import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { query } from '@/lib/mysql';
import { generateFromConversationMessages } from '@/lib/interaction-generator';

export async function GET(request: Request, context: any) {
  let params: any = context?.params;
  if (params && typeof params.then === 'function') params = await params;
  const { id } = params || {};

  try {
    // Get conversation details
    const [conversation] = await query('SELECT * FROM conversation WHERE id_conversation = ?', [id]);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get participants
    const participants = await query('SELECT p.*, per.nom, per.prenom FROM participant p JOIN personne per ON p.id_personne = per.id_personne WHERE p.id_conversation = ?', [id]);

    // Get messages
    const messages = await query('SELECT m.*, per.nom, per.prenom FROM message m JOIN personne per ON m.id_emetteur = per.id_personne WHERE m.id_conversation = ? ORDER BY m.date_envoi ASC', [id]);

    return NextResponse.json({
      ...conversation,
      participants,
      messages
    });
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: any) {
  let params: any = context?.params;
  if (params && typeof params.then === 'function') params = await params;
  const { id } = params || {};
  const body = await request.json();

  try {
    await query(
      'UPDATE conversation SET titre = ?, is_banned = ? WHERE id_conversation = ?',
      [body.titre, body.isBanned, id]
    );

    const [updated] = await query('SELECT * FROM conversation WHERE id_conversation = ?', [id]);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: any) {
  let params: any = context?.params;
  if (params && typeof params.then === 'function') params = await params;
  const { id } = params || {};

  try {
    // Delete messages first (foreign key constraint)
    await query('DELETE FROM message WHERE id_conversation = ?', [id]);
    
    // Delete participants
    await query('DELETE FROM participant WHERE id_conversation = ?', [id]);
    
    // Delete conversation
    await query('DELETE FROM conversation WHERE id_conversation = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: any) {
  let params: any = context?.params;
  if (params && typeof params.then === 'function') params = await params;
  const { id } = params || {};
  try {
    logger.info('api.conversation.POST', 'Received generate_interactions request', { id });
    const body = await request.json().catch(() => ({}));
    const action = body?.action || 'generate_interactions';
    const lastMinutes = typeof body?.lastMinutes === 'number' ? body.lastMinutes : 30;
    if (action !== 'generate_interactions') {
      logger.warn('api.conversation.POST', 'Unsupported action', { action });
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }
    await generateFromConversationMessages(id, lastMinutes);
    logger.info('api.conversation.POST', 'Generation completed', { id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('api.conversation.POST', 'Failed to generate interactions from conversation', error);
    return NextResponse.json({ error: 'Failed to generate interactions' }, { status: 500 });
  }
}