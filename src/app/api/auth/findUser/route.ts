import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Find personne by email
    const personnes: any = await query('SELECT * FROM Personne WHERE email = ?', [email]);
    if (!personnes || (personnes as any[]).length === 0) {
      console.log(`[findUser] no personne found for email=${email}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const personne = (personnes as any[])[0];

    // Try to find employe
    const employes: any = await query('SELECT * FROM Employe WHERE id_personne = ?', [personne.id_personne]);
    if (employes && (employes as any[]).length > 0) {
      const employe = (employes as any[])[0];
      const roles: any = await query('SELECT * FROM Role WHERE id_role = ?', [employe.id_role]);
      const role = (roles && (roles as any[]).length > 0) ? roles[0] : null;
      return NextResponse.json({
        uid: String(employe.id_employe),
        personneId: String(personne.id_personne),
        email: personne.email,
        displayName: `${personne.prenom} ${personne.nom}`,
        photoURL: null,
        role: role ? role.libelle : 'client'
      });
    }

  // Try client
    const clients: any = await query('SELECT * FROM Client WHERE id_personne = ?', [personne.id_personne]);
    if (clients && (clients as any[]).length > 0) {
      const client = (clients as any[])[0];
      return NextResponse.json({
        uid: String(client.id_client),
        personneId: String(personne.id_personne),
        email: personne.email,
        displayName: `${personne.prenom} ${personne.nom}`,
        photoURL: null,
        role: 'client'
      });
    }

  console.log(`[findUser] personne found id=${personne.id_personne} but not employe/client, returning 404`);
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
