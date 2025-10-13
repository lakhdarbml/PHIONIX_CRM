import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET() {
  const result = await query('SELECT * FROM Participant');
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { id_conversation, id_personne, type_participant } = body;

  if (!id_conversation || !id_personne) {
    return NextResponse.json(
      { error: 'id_conversation and id_personne are required' },
      { status: 400 }
    );
  }

  try {
    // First check if the participant exists
    const [existingParticipant] = await query(
      'SELECT * FROM Participant WHERE id_conversation = ? AND id_personne = ?',
      [id_conversation, id_personne]
    ) as any[];

    if (existingParticipant) {
      return NextResponse.json(
        { error: 'Participant already exists in this conversation' },
        { status: 400 }
      );
    }

    // Determine participant type. The DB expects either 'Employe' or 'Client' for the ENUM.
    let participantType = null as string | null;

    // If type_participant provided, normalize/validate it
    if (type_participant) {
      const t = String(type_participant).toLowerCase();
      if (t === 'employe' || t === 'employee' || t === 'employé' || t === 'employe') participantType = 'Employe';
      else if (t === 'client' || t === 'customer') participantType = 'Client';
      else {
        // Unknown provided type — fall back to null so we auto-detect below
        participantType = null;
      }
    }

    // If type not specified or invalid, determine based on user role or client existence
    if (!participantType) {
      const [employee] = await query(
        `SELECT e.*, r.libelle as role_name 
         FROM Employe e 
         JOIN Role r ON e.id_role = r.id_role 
         JOIN Personne p ON e.id_personne = p.id_personne 
         WHERE p.id_personne = ?`,
        [id_personne]
      ) as any[];

      if (employee) {
        // If the person is an Employe record, mark as Employe
        participantType = 'Employe';
      } else {
        // Check if it's a client
        const [client] = await query(
          'SELECT * FROM Client WHERE id_personne = ?',
          [id_personne]
        ) as any[];

        participantType = client ? 'Client' : 'Employe';
      }
    }

    // Create the participant with determined type (validated to match ENUM values)
    const result: any = await query(
      'INSERT INTO Participant (id_conversation, id_personne, type_participant) VALUES (?, ?, ?)',
      [id_conversation, id_personne, participantType]
    );

    // Since Participant uses a composite PK (id_conversation, id_personne), select by those
    const [created] = await query(
      `SELECT p.*, per.prenom, per.nom 
       FROM Participant p 
       JOIN Personne per ON p.id_personne = per.id_personne 
       WHERE p.id_conversation = ? AND p.id_personne = ?`, 
      [id_conversation, id_personne]
    ) as any[];

    return NextResponse.json(created || null);
  } catch (error) {
    console.error('Failed to create participant:', error);
    return NextResponse.json(
      { error: 'Failed to create participant' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const { id_conversation, id_personne } = body;

  if (!id_conversation || !id_personne) {
    return NextResponse.json(
      { error: 'id_conversation and id_personne are required' },
      { status: 400 }
    );
  }

  try {
    await query(
      'DELETE FROM Participant WHERE id_conversation = ? AND id_personne = ?',
      [id_conversation, id_personne]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove participant:', error);
    return NextResponse.json(
      { error: 'Failed to remove participant' },
      { status: 500 }
    );
  }
}