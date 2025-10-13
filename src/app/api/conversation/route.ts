import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  const result = await query('SELECT * FROM Conversation ORDER BY date_creation DESC');
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { titre, is_banned = false, id_createur } = body;

  if (!titre) {
    return NextResponse.json({ error: 'titre is required' }, { status: 400 });
  }

  if (!id_createur) {
    return NextResponse.json({ error: 'id_createur is required' }, { status: 400 });
  }

  try {
    const result: any = await query(
      'INSERT INTO Conversation (titre, id_createur, is_banned, date_creation) VALUES (?, ?, ?, ?)',
      [titre, id_createur, is_banned ? 1 : 0, new Date()]
    );

    const [created] = await query('SELECT * FROM Conversation WHERE id_conversation = ?', [result.insertId]);
    return NextResponse.json(created);
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}