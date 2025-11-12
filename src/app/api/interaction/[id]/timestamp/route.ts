import { NextResponse } from 'next/server';
import { updateLastInteractionTime } from '@/lib/interaction-timestamps';

export async function POST(request: Request, context: any) {
  try {
    let params: any = context?.params;
    if (params && typeof params.then === 'function') params = await params;
    const { id } = params || {};
    const { lastMessageId, lastUpdate } = await request.json();

    if (!lastMessageId || !lastUpdate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    updateLastInteractionTime(id, lastMessageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating timestamp:', error);
    return NextResponse.json(
      { error: 'Failed to update timestamp' },
      { status: 500 }
    );
  }
}