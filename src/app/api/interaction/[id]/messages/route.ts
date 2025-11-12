import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { getLastUpdateTime, updateLastInteractionTime } from '@/lib/interaction-timestamps';

export async function GET(request: Request, context: any) {
  let params: any = context?.params;
  if (params && typeof params.then === 'function') params = await params;
  const { id } = params || {};
  const lastUpdate = getLastUpdateTime(id);

  // Get all messages after the last update
  const messagesQuery = lastUpdate 
    ? 'SELECT * FROM message WHERE id_interaction = ? AND date_envoi > ? ORDER BY date_envoi ASC'
    : 'SELECT * FROM message WHERE id_interaction = ? ORDER BY date_envoi ASC';

  const messages = await query(
    messagesQuery,
    lastUpdate ? [id, lastUpdate.lastUpdate] : [id]
  );

  if (Array.isArray(messages) && messages.length > 0) {
    // Get the latest message ID
    const latestMessage = messages.reduce((latest, current) => {
      return Number(current.id_message) > Number(latest.id_message) ? current : latest;
    }, messages[0]);

    // Update the last message ID in our tracking system
    updateLastInteractionTime(id, Number(latestMessage.id_message));
  }

  return NextResponse.json(messages);
}