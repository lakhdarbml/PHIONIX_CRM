import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { io as clientIo } from 'socket.io-client';

export async function PUT(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const { isBanned = true } = await request.json();

    // Update the conversation ban status. Use `updated_at` which exists in the schema.
    await query(
      `UPDATE Conversation 
       SET is_banned = ?, 
           updated_at = NOW() 
       WHERE id_conversation = ?`,
      [isBanned ? 1 : 0, id]
    );

    const [updated] = await query(
      'SELECT * FROM Conversation WHERE id_conversation = ?',
      [id]
    );

    // Emit socket event so other clients can refresh their view
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${process.env.SOCKET_PORT || 4000}`;
      const s = clientIo(socketUrl);
      s.emit('conversation_banned', { id_conversation: id, is_banned: isBanned ? 1 : 0 });
      s.disconnect();
    } catch (e) {
      console.error('Failed to emit conversation_banned event:', e);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating conversation ban status:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation ban status' },
      { status: 500 }
    );
  }
}