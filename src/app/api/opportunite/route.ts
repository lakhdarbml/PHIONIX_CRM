import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titre, valeur, etape, id_client, id_employe, probabilite, description, source_lead, date_fermeture_prevue } = body;

    if (!titre || !id_client || !id_employe) {
      return NextResponse.json(
        { error: 'Titre, client et commercial responsable sont requis.' },
        { status: 400 }
      );
    }

    // Vérifier que client et employé existent
    const [client] = await query('SELECT id_client FROM client WHERE id_client = ?', [id_client]);
    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const [employe] = await query('SELECT id_employe FROM employe WHERE id_employe = ?', [id_employe]);
    if (!employe) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 });
    }

    // Insert opportunité selon le schéma SQL
    const result: any = await query(
      `INSERT INTO opportunite (titre, description, valeur, probabilite, source_lead, date_fermeture_prevue, etape, id_employe, id_client, date_creation, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        titre,
        description || null,
        valeur ? parseFloat(valeur) : null,
        probabilite || 50.00,
        source_lead || null,
        date_fermeture_prevue || null,
        etape || 'Prospection',
        id_employe,
        id_client,
      ]
    );

    const [created] = await query(
      'SELECT * FROM opportunite WHERE id_opportunite = ?',
      [result.insertId]
    );

    return NextResponse.json(created || null);
  } catch (error: any) {
    console.error('Erreur création opportunité:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de l\'opportunité' },
      { status: 500 }
    );
  }
}


