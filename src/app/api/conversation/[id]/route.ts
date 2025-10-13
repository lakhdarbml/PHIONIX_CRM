import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: Request, context: any) {
  let params: any = context?.params;
  if (params && typeof params.then === 'function') params = await params;
  const { id } = params || {};

  try {
    // Get conversation details
    const [conversation] = await query('SELECT * FROM Conversation WHERE id_conversation = ?', [id]);

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get participants
    const participants = await query('SELECT p.*, per.nom, per.prenom FROM Participant p JOIN Personne per ON p.id_personne = per.id_personne WHERE p.id_conversation = ?', [id]);

    // Get messages
    const messages = await query('SELECT m.*, per.nom, per.prenom FROM Message m JOIN Personne per ON m.id_emetteur = per.id_personne WHERE m.id_conversation = ? ORDER BY m.date_envoi ASC', [id]);

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
      'UPDATE Conversation SET titre = ?, is_banned = ? WHERE id_conversation = ?',
      [body.titre, body.isBanned, id]
    );

    const [updated] = await query('SELECT * FROM Conversation WHERE id_conversation = ?', [id]);
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
    await query('DELETE FROM Message WHERE id_conversation = ?', [id]);
    
    // Delete participants
    await query('DELETE FROM Participant WHERE id_conversation = ?', [id]);
    
    // Delete conversation
    await query('DELETE FROM Conversation WHERE id_conversation = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}